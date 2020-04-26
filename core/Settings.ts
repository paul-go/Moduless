
namespace Moduless
{
	/**
	 * A wrapper that manages Moduless's settings that are
	 * stored on disk.
	 */
	export namespace Settings
	{
		/** */
		export function readSetCoverFunction()
		{
			let coverFilePath = "";
			let coverFunctionName = "";
			const path = getConfigPath();
			
			if (Fs.existsSync(path))
			{
				const json: string[] = Util.parseJsonFile(path);
				if (Array.isArray(json) && json.length === 2)
					[coverFilePath, coverFunctionName] = json;
			}
			
			return { coverFilePath, coverFunctionName };
		}
		
		/** */
		export function writeSetCoverFunction(
			coverFilePath: string,
			coverFunctionName: string)
		{
			const path = getConfigPath();
			const data = JSON.stringify([coverFilePath, coverFunctionName]);
			Fs.writeFileSync(path, data);
		}
		
		/** */
		function getConfigPath()
		{
			if (!Fs.existsSync(EnvPaths.config))
				Fs.mkdirSync(EnvPaths.config);
			
			return Path.join(EnvPaths.config, "config.json");
		}
	}
}
