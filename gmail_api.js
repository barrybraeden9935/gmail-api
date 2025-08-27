const dotenv = require("dotenv");
dotenv.config();


const { chromium } = require("playwright");
const GmailManager = require("./gmail");
const adsPower = new (require("./adspower"))();
const tasks = require("./db/tasks");
const { initDB } = require("./db/init")
const TASK_STATUS = { PENDING: 'PENDING', COMPLETED: 'COMPLETED', RUNNING: 'RUNNING' };

const CONFIG = {
    POLL_INTERVAL: { min: 1000, max: 15000 },
    NO_TASKS_WAIT: 10000,
    MAX_ITERATIONS: 999999999,
    MAX_TASKS_FETCH: 9999
};

const TASK_TYPES = {
    TWOFA: 'TWOFA'
};

let profileIDs = {
    "barry.braeden9935@gmail.com": ["k10h2efj", "k10hahfx", "k10hahfy", "k10l5xar", "k10l5xau", "k10l5xav"],
    "yeagyib.arra773@gmail.com": ["kuv3jo2", "k10hb4gw", "k10hb4gx", "k10l5v9q", "k10l5v9s", "k10l5v9t"],
};

let leasedEmails = {
    "barry.braeden9935@gmail.com": [],
    "yeagyib.arra773@gmail.com": []
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function selectRandomTask(taskList) {
    return taskList[Math.floor(Math.random() * taskList.length)];
}

function extractIdFromEnv(envVar) {
    const match = process.env[envVar]?.match(/\d+/);
    return match ? match[0] : null;
}

async function fetchPendingGmailTasks(supabaseClient) {
    return await tasks.getTask(
      supabaseClient,
      [TASK_STATUS.PENDING],
      [TASK_STATUS.COMPLETED],
      CONFIG.MAX_TASKS_FETCH,
      [TASK_TYPES.TWOFA]
    );
}

async function leaseProfile(masterEmail) {
    const validProfileIDs = profileIDs[masterEmail];
    const leasedProfileIDs = leasedEmails[masterEmail];

    const availableProfileIDs = validProfileIDs.filter(id => !leasedProfileIDs.includes(id));

    if (availableProfileIDs.length <= 0) return null;

    const leasedProfileID = availableProfileIDs[0];
    leasedEmails[masterEmail].push(leasedProfileID);
    return leasedProfileID;
}

async function processTask(task, dbClient) {
    const { rdp_id, thread_id, master_email, service } = task.additional_data;
    const profileId = task.profile_id;

    console.log(rdp_id, thread_id, master_email, service, profileId)
    const browserInfo = await adsPower.launchBrowser(profileId);
    if (!browserInfo) throw new Error("Failed to launch browser");
  
    const [browser, page] = await connectBrowser(browserInfo);
    if (!page) throw new Error("Failed to connect to browser");
  
    const gmail = new GmailManager(task.email, profileId, master_email, thread_id, rdp_id, page);
  
    let success = false;
    let code = null;
  
    if (service === 'wisley_login') {
      const query = `subject%3AHere+is+your+requested+verification+code+to%3A${task.email}`;
      const matchStart = "</span>:</p>";
      const matchStartAlt = ":</p>";
      const matchEnd = "<br><br>";
      const matchEndAlt = "<br><br>";
      [success, code] = await gmail.getEmailContent(query, matchStart, matchStartAlt, matchEnd, matchEndAlt);

    } else if (service === 'rapidfs') {
      const query = `subject%3ATemporary+Authorization+Code+to%3A${task.email}`;
      const matchStart = "code</span> is: ";
      const matchStartAlt = "code</span></span> is: ";
      const matchEnd = "<";
      const matchEndAlt = "<br><br>";
      [success, code] = await gmail.getEmailContent(query, matchStart, matchStartAlt, matchEnd, matchEndAlt);
    }
  
    await tasks.updateTask(dbClient, task.id, {
      output: { success, code },
      status: TASK_STATUS.COMPLETED
    });
  
    await shutdownMasterEmail(browser, page);
}
async function shutdownMasterEmail(browser, page) {
    if (page) await page.close();
    if (browser) await browser.close();
}

async function connectBrowser(browserInfo) {
    try {
        const browser = await chromium.connectOverCDP(browserInfo.ws.puppeteer);
        const defaultContext = browser.contexts()[0];
        const pages = defaultContext.pages();

        for (let i = 1; i < pages.length; i++) {
            await pages[i].close();
        }

        return [browser, pages[0]];
    } catch (error) {
        console.error("Error connecting to browser:", error);
        return [null, null];
    }
}

async function main() {
    const rapidDBClient = await initDB(process.env.RAPIDFS_SUPABASE_URL, process.env.RAPIDFS_SUPABASE_KEY);
    const wisleyDBClient = await initDB(process.env.WISLEY_SUPABASE_URL, process.env.WISLEY_SUPABASE_KEY);
  
    console.log(`Starting task processor for GMAILs`);
  
    for (let i = 0; i < CONFIG.MAX_ITERATIONS; i++) {
      let leasedProfileID = null;
      let masterEmail = null;
  
      try {
        const [rapidTasks, wisleyTasks] = await Promise.all([
          fetchPendingGmailTasks(rapidDBClient),
          fetchPendingGmailTasks(wisleyDBClient),
        ]);
  
        const tag = (tasks, client) =>
          Array.isArray(tasks)
            ? tasks.map(t => ({ ...t, __client: client }))
            : [];
  
        const allTasks = [...tag(rapidTasks, rapidDBClient), ...tag(wisleyTasks, wisleyDBClient)];
  
        if (!allTasks.length) {
          console.log(`No eligible tasks found. Waiting ${CONFIG.NO_TASKS_WAIT / 1000} seconds.`);
          await delay(CONFIG.NO_TASKS_WAIT);
          continue;
        }
  
        const selectedTask = allTasks[Math.floor(Math.random() * allTasks.length)];
        const dbClient = selectedTask.__client;
        masterEmail = selectedTask.additional_data.master_email;
  
        leasedProfileID = await leaseProfile(masterEmail);
        if (!leasedProfileID) {
          console.log(`Eligible task found for ${masterEmail}, but no available profiles. Waiting.`);
          await delay(CONFIG.NO_TASKS_WAIT);
          continue;
        }
  
        selectedTask.profile_id = leasedProfileID;
        await tasks.updateTask(dbClient, selectedTask.id, { status: TASK_STATUS.RUNNING });

        await processTask(selectedTask, selectedTask.__client);
        await delay(1000);
      } catch (error) {
        console.error(error.stack);
      } finally {
        if (leasedProfileID && masterEmail && leasedEmails[masterEmail]) {
          leasedEmails[masterEmail] = leasedEmails[masterEmail].filter(id => id !== leasedProfileID);
        }
        await delay(1000)
      }
    }
}

main().catch(console.error);
