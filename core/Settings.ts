
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
		export function readSetFunction(projectCwd: string)
		{
			const config = readConfigFile();
			
			if (!projectCwd.endsWith(Path.sep))
				projectCwd += Path.sep;
			
			const initialConfigLength = config.length;
			let foundCoverFunctionName = "";
			
			for (let i = config.length; i-- > 0;)
			{
				// Split the cover function file path into its parts,
				// so that we can successive pop the last directory name off the end,
				// to eventually find the one that matches the working directory.
				const [coverFnFilePath, coverFnName] = config[i];
				
				if (coverFnFilePath.startsWith(projectCwd))
				{
					if (foundCoverFunctionName === "")
						foundCoverFunctionName = coverFnName;
					
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
			
			return foundCoverFunctionName;
		}
		
		/**
		 * Stores the name of the function to run.
		 */
		export function writeSetFunctionName(
			functionFilePath: string,
			functionName: string)
		{
			const config = readConfigFile();
			config.push([functionFilePath, functionName]);
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
