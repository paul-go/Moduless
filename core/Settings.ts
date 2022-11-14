
namespace Moduless
{
	/**
	 * @internal
	 * A wrapper that manages Moduless's settings that are
	 * stored on disk.
	 */
	export namespace Settings
	{
		/**
		 * Reads the name of the function to run.
		 */
		export function readActiveFunctionName(projectCwd: string)
		{
			const config = readConfigFile();
			
			if (!projectCwd.endsWith(Path.sep))
				projectCwd += Path.sep;
			
			const initialConfigLength = config.length;
			let foundFunctionName = "";
			
			for (let i = config.length; i-- > 0;)
			{
				const [fnFilePath, fnName] = config[i];
				
				if (fnFilePath.startsWith(projectCwd))
				{
					if (foundFunctionName === "")
						foundFunctionName = fnName;
					
					// Continue iterating, erasing previous entries in the config
					// array where the path starts with the cwd. We need to do
					// it in this weird way because we don't actually ever have a
					// current working directory (cwd) for a project ... so we need
					// to guess it on demand.
					else
						config.splice(i, 1);
				}
			}
			
			if (config.length !== initialConfigLength)
				writeConfigFile(config);
			
			return foundFunctionName;
		}
		
		/**
		 * Stores the name of the function to run.
		 */
		export function writeActiveFunctionName(
			functionFilePath: string,
			qualifiedFunctionName: string)
		{
			const config = readConfigFile();
			config.push([functionFilePath, qualifiedFunctionName]);
			writeConfigFile(config);
		}
		
		/** */
		function readConfigFile()
		{
			if (!Fs.existsSync(EnvPaths.config))
				Fs.mkdirSync(EnvPaths.config);
			
			const configPath = getConfigFilePath();
			
			let json: [string, string][];
			if (Fs.existsSync(configPath))
			{
				json = Util.parseJsonFile(configPath);
				if (!json || typeof json !== "object")
					return [];
			}
			else
			{
				Fs.writeFileSync(configPath, "[]");
				json = [];
			}
			
			return json;
		}
		
		/** */
		function writeConfigFile(config: [string, string][])
		{
			const newConfig = JSON.stringify(config, null, "\t");
			const configPath = getConfigFilePath();
			Fs.writeFileSync(configPath, newConfig);
		}
		
		/** */
		function getConfigFilePath()
		{
			return Path.join(EnvPaths.config, "config.json");
		}
	}
}
