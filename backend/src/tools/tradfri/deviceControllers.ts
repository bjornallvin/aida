/**
 * Controllers for non-light devices (blinds, outlets, scenes)
 */
import { DirigeraClient } from "dirigera";
import { DeviceResolver } from "./deviceResolver";

export class DeviceControllers {
  constructor(
    private client: DirigeraClient,
    private deviceResolver: DeviceResolver
  ) {}

  async controlBlind(
    deviceIdOrName: string,
    targetLevel: number
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const device = await this.deviceResolver.resolveDevice(
        deviceIdOrName,
        "blinds"
      );
      if (!device) {
        throw new Error(
          `Blind device "${deviceIdOrName}" not found. Try checking the exact name or use list_devices to see available blinds.`
        );
      }

      // Ensure target level is within valid range (0-100)
      const validLevel = Math.max(0, Math.min(100, targetLevel));
      await this.client.blinds.setTargetLevel({
        id: device.id,
        blindsTargetLevel: validLevel,
      });

      return true;
    } catch (error) {
      console.error("Failed to control blind:", error);
      return false;
    }
  }

  async controlOutlet(deviceIdOrName: string, isOn: boolean): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const device = await this.deviceResolver.resolveDevice(
        deviceIdOrName,
        "outlet"
      );
      if (!device) {
        throw new Error(
          `Outlet device "${deviceIdOrName}" not found. Try checking the exact name or use list_devices to see available outlets.`
        );
      }

      await this.client.outlets.setIsOn({ id: device.id, isOn });
      return true;
    } catch (error) {
      console.error("Failed to control outlet:", error);
      return false;
    }
  }

  async setScene(sceneId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      await this.client.scenes.trigger({ id: sceneId });
      return true;
    } catch (error) {
      console.error("Failed to set scene:", error);
      return false;
    }
  }

  async getScenes(): Promise<
    Array<{ id: string; name: string; type: string }>
  > {
    if (!this.client) {
      throw new Error("Not connected to DIRIGERA hub");
    }

    try {
      const scenes = await this.client.scenes.list();
      return scenes.map((scene) => ({
        id: scene.id,
        name: scene.info.name,
        type: scene.type,
      }));
    } catch (error) {
      console.error("Failed to get scenes:", error);
      return [];
    }
  }
}
