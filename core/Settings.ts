
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
		export function readActiveFunction(cwd = process.cwd()): IRunMeta | null
		{
			const targets = readTargetsFile();
			return targets.get(Util.toDirectory(cwd)) || null;
		}
		
		/**
		 * Stores the name of the function to run.
		 */
		export function writeActiveFunction(
			functionFilePath: string,
			functionNamespace: string[],
			functionName: string)
		{
			const targets = readTargetsFile();
			const tsConfigPath = Util.getContainingConfigFile(functionFilePath) || "";
			const projectPath = Util.toDirectory(Path.join(tsConfigPath, ".."));
			const workspacePath = Util.toDirectory(process.cwd());
			
			if (!projectPath)
				throw new Error(
					`The file ${functionFilePath} doesn't seem to be within a TypeScript project`);
			
			targets.set(workspacePath, {
				projectPath,
				functionNamespace,
				functionName,
			});
			
			writeTargetsFile(targets);
		}
		
		/** */
		function readTargetsFile()
		{
			const targets = new Map<string, IRunMeta>();
			
			if (!Fs.existsSync(EnvPaths.targets))
				Fs.mkdirSync(EnvPaths.targets);
			
			const targetsFilePath = getTargetsFilePath();
			if (!Fs.existsSync(targetsFilePath))
				return targets;
			
			const json = Util.parseJsonFile(targetsFilePath);
			
			for (const [workspacePath, object] of Object.entries(json))
			{
				const target = object as IRunMeta;
				if (!target || typeof target !== "object")
					continue;
				
				targets.set(workspacePath, {
					projectPath: target.projectPath,
					functionNamespace: target.functionNamespace || [],
					functionName: target.functionName || ""
				});
			}
			
			return targets;
		}
		
		/** */
		function writeTargetsFile(targets: Map<string, IRunMeta>)
		{
			const json: Record<string, object> = {};
			
			for (const [path, target] of targets)
			{
				const stored: IRunMeta = {
					projectPath: target.projectPath,
					functionNamespace: target.functionNamespace,
					functionName: target.functionName,
				};
				
				json[path] = stored;
			}
			
			const jsonText = JSON.stringify(json, null, "\t");
			const targetsFilePath = getTargetsFilePath();
			Fs.writeFileSync(targetsFilePath, jsonText);
		}
		
		/** */
		function getTargetsFilePath()
		{
			return Path.join(EnvPaths.targets, "targets.json");
		}
	}
}
