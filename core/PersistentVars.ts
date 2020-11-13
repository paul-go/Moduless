
namespace Moduless
{
	/**
	 * Storable variables that are auto-persisted to disk when updated.
	 */
	export class PersistentVars
	{
		/** */
		static get lastWindowPosition()
		{
			if (this._lastWindowPosition)
				return this._lastWindowPosition;
			
			return this._lastWindowPosition = 
				this.readVar("last-window-position") || 
				[0, 0];
		}
		static set lastWindowPosition(value: number[])
		{
			this.writeVar("last-window-position", value);
		}
		private static _lastWindowPosition: number[] | null = null;
		
		/** */
		static get lastWindowSize()
		{
			if (this._lastWindowSize)
				return this._lastWindowSize;
			
			return this._lastWindowSize = 
				this.readVar("last-window-size") || 
				[1200, 1000];
		}
		static set lastWindowSize(value: number[])
		{
			this.writeVar("last-window-size", value);
		}
		private static _lastWindowSize: number[] | null = null;
		
		/** */
		private static readVar(varName: string)
		{
			const varFilePath = this.getVarPath(varName);
			
			if (Fs.existsSync(varFilePath))
			{
				const jsonText = Fs.readFileSync(varFilePath).toString("utf8");
				try
				{
					return JSON.parse(jsonText);
				}
				catch (e) { }
			}
			
			return null;
		}
		
		/** */
		private static writeVar(varName: string, value: any)
		{
			if (value === null)
				return;
			
			const varFilePath = this.getVarPath(varName);
			Fs.writeFile(varFilePath, JSON.stringify(value), { flag: "w" }, () => {});
		}
		
		/** */
		private static getVarPath(varName: string)
		{
			const appPath = Path.join(
				Electron.app.getPath("appData"),
				"com.truebase.Moduless");
			
			const varsPath = Path.join(appPath, "vars");
			
			if (!Fs.existsSync(appPath))
				Fs.mkdirSync(appPath);
			
			if (!Fs.existsSync(varsPath))
				Fs.mkdirSync(varsPath);
			
			return Path.join(varsPath, varName);
		}
	}
}
