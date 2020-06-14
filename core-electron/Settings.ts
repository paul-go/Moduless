
namespace Moduless
{
	/**
	 * Storable application settings that are auto-persisted to disk when updated.
	 */
	export class Settings
	{
		/** */
		static get lastWindowPosition()
		{
			if (this._lastWindowPosition)
				return this._lastWindowPosition;
			
			return this._lastWindowPosition = 
				this.readSetting("last-window-position") || 
				[0, 0];
		}
		static set lastWindowPosition(value: number[])
		{
			this.writeSetting("last-window-position", value);
		}
		private static _lastWindowPosition: number[] | null = null;
		
		/** */
		static get lastWindowSize()
		{
			if (this._lastWindowSize)
				return this._lastWindowSize;
			
			return this._lastWindowSize = 
				this.readSetting("last-window-size") || 
				[1200, 1000];
		}
		static set lastWindowSize(value: number[])
		{
			this.writeSetting("last-window-size", value);
		}
		private static _lastWindowSize: number[] | null = null;
		
		/** */
		private static readSetting(settingName: string)
		{
			const settingFilePath = this.getSettingPath(settingName);
			
			if (Fs.existsSync(settingFilePath))
			{
				const jsonText = Fs.readFileSync(settingFilePath).toString("utf8");
				return JSON.parse(jsonText);
			}
			
			return null;
		}
		
		/** */
		private static writeSetting(settingName: string, value: any)
		{
			if (value === null)
				return;
			
			const settingFilePath = this.getSettingPath(settingName);
			Fs.writeFile(settingFilePath, JSON.stringify(value), { flag: "w" }, () => {});
		}
		
		/** */
		private static getSettingPath(settingName: string)
		{
			const appPath = Path.join(
				Electron.app.getPath("appData"),
				"com.truebase.Moduless");
			
			const settingsPath = Path.join(appPath, "settings");
			
			if (!Fs.existsSync(appPath))
				Fs.mkdirSync(appPath);
			
			if (!Fs.existsSync(settingsPath))
				Fs.mkdirSync(settingsPath);
			
			return Path.join(settingsPath, settingName);
		}
	}
}
