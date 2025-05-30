#!/usr/bin/env ts-node
/// <reference types="node" />

/**
 * IKEA DIRIGERA Hub Discovery and Authentication Setup
 * This script helps you discover your hub and generate an access token
 */
import { createDirigeraClient } from "dirigera";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log("🏠 IKEA DIRIGERA Hub Setup");
  console.log("===========================\n");

  try {
    // Step 1: Get gateway IP
    console.log("🔍 Finding your DIRIGERA hub...");
    console.log("\nOption 1: Automatic discovery (experimental)");
    console.log("Option 2: Manual IP entry");

    const discoveryChoice = await question("Use automatic discovery? (y/n): ");

    let gatewayIP: string;

    if (discoveryChoice.toLowerCase() === "y") {
      console.log("🔍 Attempting automatic discovery...");
      // Try to discover via mDNS (this may not always work)
      try {
        const client = await createDirigeraClient();
        // If this works, we'll get the IP from the client
        console.log("✅ Hub discovered automatically!");
        gatewayIP = "auto-discovered"; // We'll handle this case specially
      } catch (error) {
        console.log("❌ Automatic discovery failed. Please enter IP manually.");
        gatewayIP = await question("Enter your DIRIGERA hub IP address: ");
      }
    } else {
      gatewayIP = await question("Enter your DIRIGERA hub IP address: ");
    }

    if (gatewayIP === "auto-discovered") {
      console.log("Using auto-discovered hub connection...");
    } else {
      console.log(`📍 Using IP address: ${gatewayIP}`);
    }

    // Step 2: Generate access token
    console.log("\n🔐 Generating access token...");
    console.log(
      "⚠️ IMPORTANT: You need to press the ACTION button on your DIRIGERA hub NOW!"
    );
    console.log("The button is located on the bottom of the hub.");
    console.log(
      "You have 90 seconds after pressing the button to complete this step."
    );

    const ready = await question(
      "Press Enter after you've pressed the ACTION button on your hub..."
    );

    try {
      let client;
      if (gatewayIP === "auto-discovered") {
        client = await createDirigeraClient();
      } else {
        client = await createDirigeraClient({ gatewayIP });
      }

      console.log(
        "🔑 Authenticating with hub (this may take a few seconds)..."
      );
      const accessToken = await client.authenticate();

      console.log("✅ Authentication successful!");
      console.log(`Access token generated: ${accessToken.substring(0, 16)}...`);

      // Step 3: Test connection
      console.log("\n🧪 Testing connection...");
      const home = await client.home();

      if (home) {
        console.log("✅ Connection test successful!");
        console.log(
          `Found hub: ${home.hub.attributes.customName || home.hub.id}`
        );
        console.log(`Devices available: ${home.devices.length}`);
      } else {
        console.log(
          "⚠️ Connection test failed, but credentials should still work"
        );
      }

      // Get the actual gateway IP for saving (if we auto-discovered)
      if (gatewayIP === "auto-discovered") {
        // For now, we'll ask the user to provide it manually
        gatewayIP = await question(
          "Please enter the IP address shown on your hub or in your router: "
        );
      }

      // Step 4: Update .env file
      console.log("\n📝 Updating .env file...");
      const envPath = path.join(process.cwd(), ".env");
      let envContent = "";

      // Read existing .env file or create new content
      try {
        envContent = fs.readFileSync(envPath, "utf8");
      } catch (error) {
        console.log("📄 Creating new .env file...");
        envContent = "# AIDA Backend Environment Variables\n\n";
      }

      // Update or add DIRIGERA settings
      if (envContent.includes("DIRIGERA_GATEWAY_IP=")) {
        envContent = envContent.replace(
          /^DIRIGERA_GATEWAY_IP=.*$/m,
          `DIRIGERA_GATEWAY_IP=${gatewayIP}`
        );
      } else {
        envContent += `\n# DIRIGERA Hub Configuration\nDIRIGERA_GATEWAY_IP=${gatewayIP}\n`;
      }

      if (envContent.includes("DIRIGERA_ACCESS_TOKEN=")) {
        envContent = envContent.replace(
          /^DIRIGERA_ACCESS_TOKEN=.*$/m,
          `DIRIGERA_ACCESS_TOKEN=${accessToken}`
        );
      } else {
        envContent += `DIRIGERA_ACCESS_TOKEN=${accessToken}\n`;
      }

      // Remove old Tradfri settings if they exist
      envContent = envContent.replace(
        /^TRADFRI_GATEWAY_IP=.*$/m,
        "# TRADFRI_GATEWAY_IP=# Replaced with DIRIGERA"
      );
      envContent = envContent.replace(
        /^TRADFRI_GATEWAY_KEY=.*$/m,
        "# TRADFRI_GATEWAY_KEY=# Replaced with DIRIGERA"
      );
      envContent = envContent.replace(
        /^TRADFRI_IDENTITY=.*$/m,
        "# TRADFRI_IDENTITY=# Replaced with DIRIGERA"
      );

      fs.writeFileSync(envPath, envContent);

      console.log("✅ Environment file updated successfully!");
      console.log(
        "\n🎉 Setup complete! Your DIRIGERA integration is ready to use."
      );
      console.log("\nCredentials saved:");
      console.log(`   Hub IP: ${gatewayIP}`);
      console.log(`   Access Token: ${accessToken.substring(0, 16)}...`);

      console.log("\n⚠️ Important security notes:");
      console.log(
        "- Store the access token securely - it provides full access to your hub"
      );
      console.log(
        "- The access token does not expire but can be revoked from the hub"
      );
      console.log("- You can now restart your backend server to use DIRIGERA");
      console.log(
        "- The old Tradfri credentials have been commented out in .env"
      );

      // Step 5: Show available devices
      console.log("\n📱 Discovering devices...");
      try {
        const devices = await client.devices.list();
        console.log(`Found ${devices.length} devices:`);
        devices.forEach((device, index) => {
          console.log(
            `   ${index + 1}. ${device.attributes.customName || device.id} (${
              device.deviceType
            })`
          );
        });
      } catch (error) {
        console.log(
          "⚠️ Could not list devices, but integration should still work"
        );
      }
    } catch (error) {
      console.error("❌ Authentication failed:", error);
      console.log("\nPossible issues:");
      console.log("- ACTION button was not pressed on the hub");
      console.log("- The 90-second timeout expired");
      console.log("- Network connectivity issues");
      console.log("- Hub IP address is incorrect");
      console.log(
        "\nTry again and make sure to press the ACTION button immediately before running this script."
      );
    }
  } catch (error) {
    console.error("❌ Setup failed:", error);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
