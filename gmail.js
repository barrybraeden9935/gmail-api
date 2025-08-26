const { chromium } = require('playwright');

class GmailManager {
    constructor(emailAddress, profileID, masterEmail, threadID, rdpID, page) {
        this.rdpID = rdpID
        this.threadID = threadID
        this.profileID = profileID
        this.masterEmail = masterEmail
        this.emailAddress = emailAddress
        this.page = page;
        this.gmailDomain = process.env.GMAIL_DOMAIN
    }

    async newTab() {
        const newTab = await this.page.context().newPage();
        return newTab;
    }

    async deleteAllVisibleEmails() {
        try {
          // Find and click the select all checkbox
          const selectAll = await this.waitAndFindElement('div[aria-label="Select"]');
          await selectAll.hover();
          await this.page.waitForTimeout(1000);
          await selectAll.click();
          await this.page.waitForTimeout(2000);
          
          // Find and click the delete button
          const deleteButton = await this.waitAndFindElement('div[aria-label="Delete"]');
          await deleteButton.hover();
          await this.page.waitForTimeout(1000);
          await deleteButton.click();
          
          // Wait for deletion to complete
          await this.page.waitForTimeout(5000);
          
          console.log("Successfully deleted all visible emails");
          return true;
        } catch (e) {
          console.error(`Failed to delete emails: ${e}`);
          return false;
        }
    }
      
    async waitAndFindElement(selector, timeout = 10000) {
        const element = await this.page.waitForSelector(selector, { timeout });
        // Scroll element into view
        await element.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(1000); // Allow time for scrolling animation
        return element;
    }
      
    async waitAndFindElements(selector, timeout = 10000) {
        return await this.page.waitForSelector(selector, { timeout })
          .then(() => this.page.$$selector(selector));
    }
      
    async safeClick(element, sleepAfter = 2000) {
        await element.waitForElementState('visible');
        await element.waitForElementState('enabled');
        
        // Ensure element is in viewport
        await element.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(1000); // Allow time for scrolling animation

        try {
          await element.click();
        } catch (e) {
          try {
            await this.page.evaluate(el => el.click(), element);
          } catch (e2) {
            await element.click({ force: true });
          }
        }
        
        await this.page.waitForTimeout(sleepAfter);
    }

    async verifyLogin() {
        try {
          console.log(this.page.url());
          if(this.page.url().includes('mail.google.com/mail/u/0/#search')) {
            return true;
          } else {
            return false;
          }
        } catch (error) {
          console.error(`Failed to verify login: ${error}`);
          return false;
        }
    }
      
    async getEmailContent(searchQuery, contentSplitText1, contentSplitText2, contentEndSplitText1, contentEndSplitText2) {
        try {
          this.page = await this.newTab();
          await this.page.waitForTimeout(30000);
          const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300; // Current epoch time in seconds minus 300 seconds (5 minutes)
          await this.page.goto(`https://mail.google.com/mail/u/0/#search/${searchQuery} after:${fiveMinutesAgo}`, { timeout: 60000 });
          await this.page.waitForTimeout(5000);
      
          // Verify if still logged in
          if (!await this.verifyLogin()) {
            console.error("Email is no longer logged in noooo");
            await this.page.waitForTimeout(10000);
            throw new Error("Email is no longer logged in");
          }
      
          await this.page.waitForTimeout(5000);
          const emailSelectors = [
            "tr[jscontroller='ZdOxDb']",
            "tr.zA",
            "table.F.cf.zt tr"
          ];
          
          await this.page.waitForTimeout(10000);
          let emailElements = null;
          for (const selector of emailSelectors) {
            try {
              emailElements = await this.page.$$(selector);
              if (emailElements && emailElements.length > 0) {
                break;
              }
            } catch (error) {
              continue;
            }
          }
      
          if (!emailElements || emailElements.length === 0) {
            await this.page.close();
            return [false, "No emails found matching the search query"];
          }
          
          let clicked = false;
          for (const emailElement of emailElements) {
            try {
              const subjectElement = await emailElement.$(".bog");
              if (!subjectElement) continue;
              
              const subjectText = await subjectElement.textContent();
              if (subjectText === "Temporary Authorization Code") {
                await emailElement.click();
                console.log(`Found matching email with subject: ${subjectText}`);
                clicked = true;
                break;
              } else if (subjectText === "rapid! - Welcome") {
                await emailElement.click();
                console.log(`Found matching email with subject: ${subjectText}`);
                clicked = true;
                break;
              }
            } catch (error) {
              console.debug(`Skipping email element - could not find subject: ${error}`);
              continue;
            }
          }
          
          if (!clicked) {
            await this.page.close();
            return [false, "No valid emails found"];
          }
      
          await this.page.waitForTimeout(5000);
      
          let emailContent = null;
          try {
            const emailContents = await this.page.$$('.adn.ads');
            emailContent = emailContents[emailContents.length - 1];
          } catch (error) {
            const alternativeSelectors = ['.a3s.aiL', '.msg', '.email-content'];
            for (const selector of alternativeSelectors) {
              try {
                emailContent = await this.page.$(selector);
                if (emailContent) break;
              } catch (error) {
                continue;
              }
            }
            if (!emailContent) {
              throw new Error("Could not find email content with any selector");
            }
          }
      
          await emailContent.scrollIntoViewIfNeeded();
          const outerHTML = await emailContent.evaluate(node => node.outerHTML);
          let extractedText = "";
          try{
            if(outerHTML.includes(contentSplitText1)) {
              extractedText = outerHTML.split(contentSplitText1)[1].replace("</span><p>", "");
            } else {
              extractedText = outerHTML.split(contentSplitText2)[1].replace("</span><p>", "");
            }
          } catch(error) {
            console.log(outerHTML)
            extractedText = outerHTML.split(contentSplitText2)[1].replace("</span><p>", "");
          }

          if(outerHTML.includes(contentEndSplitText1)) {
            extractedText = extractedText.split(contentEndSplitText1)[0].replace("<p>", "");
          } else {
            extractedText = extractedText.split(contentEndSplitText2)[0].replace("<p>", "");
          }
          await this.page.waitForTimeout(10000);
          
          // Go back to email list
          await this.page.goBack();
          await this.page.waitForTimeout(5000);
          
          // Delete all matching emails to prevent stacking
          if (emailElements.length > 0) {
            console.log("Cleaning up all matching emails");
            await this.deleteAllVisibleEmails();
          }
      
          await this.page.close();
          return [true, extractedText.trim()];
      
        } catch (error) {
          console.error(`Email content extraction failed: ${error}`);
          console.error(`Stack trace: ${error.stack}`);
          await this.page.close();
          return [false, error.message];
        } finally {
          await this.page.close();
        }
    }

    // async get2FACode() {
    //   try {
    //     const searchResp = await fetch(`${this.gmailDomain}/search2FA`, {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({
    //         emailAddress: this.emailAddress,
    //         threadID: this.threadID,
    //         masterEmail: this.masterEmail,
    //         rdpID: this.rdpID
    //       })
    //     });
    
    //     console.log(await searchResp.json())
    //     const timeout = Date.now() + 60000 * 3; // 60 second timeout
    //     while (Date.now() < timeout) {
    //       const response = await fetch(`${this.gmailDomain}/get2FA`, {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ emailAddress: this.emailAddress })
    //       });
          
    //       if (response.ok) {
    //         const data = await response.json();
    //         if (data.status != 'PENDING') {
    //           let success = data.status != 'ERROR'
    //           return [success, data.code]
    //         };
    //       }
          
          
    //       await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    //     }
        
    //     return [false, "Timeout waiting for 2FA code"];
    //   } catch (error) {
    //     return [false, error.stack || error.message];
    //   }
    // }
}


module.exports = GmailManager;