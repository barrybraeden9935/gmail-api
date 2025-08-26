const axios = require("axios");

class AdsPowerManager {
  constructor(apiUrl = "http://local.adspower.net:50325") {
    this.apiUrl = apiUrl;
    this.proxy = null;
    this.activeBrowsers = new Map(); // Tracks currently open browsers by profile ID
  }

  async updateProfile(profileId) {
    try {
      const response = await axios.post(`${this.apiUrl}/api/v1/user/update`, {
        user_id: profileId,
        proxy_id: "random",
      });

      console.log("response", response.data);
      if (response.data.code === 0) {
        console.log(`Successfully updated profile with ID: ${profileId}`);
        return true;
      } else {
        console.error(
          `Error updating profile: ${JSON.stringify(response.data)}`
        );
        return false;
      }
    } catch (error) {
      console.error("Error updating profile:", error.message);
      return false;
    }
  }

  async deleteProfile(profileId) {
    try {
      const response = await axios.post(`${this.apiUrl}/api/v1/user/delete`, {
        user_ids: [profileId],
      });

      if (response.data.code === 0) {
        console.log(`Successfully deleted profile with ID: ${profileId}`);
        return true;
      } else {
        console.error(
          `Error deleting profile: ${JSON.stringify(response.data)}`
        );
        return false;
      }
    } catch (error) {
      console.error("Error deleting profile:", error.message);
      return false;
    }
  }

  async getProxy() {
    return this.proxy;
  }

  
  async launchBrowser(profileId, openTabs = []) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/api/v1/browser/start?user_id=${profileId}&ip_tab=0&launch_args=["--start-maximized"]`
      );
      if (response.data.code === 0) {
        const browserInfo = response.data.data;
        this.activeBrowsers.set(profileId, browserInfo);

        console.log(`Browser launched successfully for profile: ${profileId}`);
        console.log(`WebDriver URL: ${browserInfo.ws.puppeteer}`);
        return browserInfo;
      } else {
        console.log(`${this.apiUrl}/api/v1/browser/start`);
        console.error(
          `Error launching browser: ${JSON.stringify(response.data)}`
        );
        return null;
      }
    } catch (error) {
      if (error.response) {
        console.error("Error launching browser:", error.response.data);
      } else {
        console.error("Error launching browser:", error.message);
      }
      return null;
    }
  }

  async closeBrowser(profileId) {
    try {
      if (!this.activeBrowsers.has(profileId)) {
        console.warn(`No active browser found for profile: ${profileId}`);
        return false;
      }

      const response = await axios.post(`${this.apiUrl}/api/v1/browser/stop`, {
        user_id: profileId,
      });

      if (response.data.code === 0) {
        this.activeBrowsers.delete(profileId);
        console.log(`Browser closed successfully for profile: ${profileId}`);
        return true;
      } else {
        console.error(`Error closing browser: ${response.data}`);
        return false;
      }
    } catch (error) {
      console.error("Error closing browser:", error.message);
      return false;
    }
  }

  async checkProxyType(profileId) {
    const maxRetries = 3;
    const baseUrl = `${this.apiUrl}/api/v1/user/list?user_id=${profileId}`;
  
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(baseUrl);
        console.log(profileId, response.data)
        if (response.data.code !== 0) {
          throw new Error('Failed to query profile information');
        }
  
        const list = response.data.data.list;
        if (!list || list.length === 0) {
          return false;
        }
  
        const proxyType = list[0]?.user_proxy_config?.proxy_type;
        return proxyType === 'http';
  
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
  
        if (attempt < maxRetries) {
          const delay = Math.floor(Math.random() * 4000) + 1000; // 1 to 5 seconds
          await new Promise((resolve) =>
            setTimeout(resolve, delay)
          );

        } else {
          return false;
        }
      }
    }
  }

  async getProfiles() {
    try {
      const response = await axios.post(`${this.apiUrl}/api/v1/user/list`, {
        page: 1,
        page_size: 100,
      });

      if (response.data.code === 0) {
        return response.data.data.list;
      } else {
        console.error(`Error getting profiles: ${response.data}`);
        return null;
      }
    } catch (error) {
      console.error("Error getting profiles:", error.message);
      return null;
    }
  }

  async closeAllBrowsers() {
    let allClosed = true;

    for (const profileId of this.activeBrowsers.keys()) {
      const success = await this.closeBrowser(profileId);
      if (!success) {
        allClosed = false;
      }
    }

    return allClosed;
  }

  
}

module.exports = AdsPowerManager;
