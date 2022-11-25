
namespace Moduless
{
	/**
	 * 
	 */
	export class ProjectGraph
	{
		/** */
		constructor(startingDir: string)
		{
			const startingConfigFile = Path.join(startingDir, "tsconfig.json")
			this.createRecursive(startingConfigFile);
			
			for (const project of this.projects.values())
				Util.log("Adding project to graph: " + project.filePath);
		}
		
		/** */
		private createRecursive(targetConfigFilePath: string)
		{
			if (!Fs.existsSync(targetConfigFilePath))
			{
				Util.warn("File does not exist: " + targetConfigFilePath);
				return null;
			}
			
			if (this.projects.has(targetConfigFilePath))
				return this.projects.get(targetConfigFilePath) || null;
			
			const scripts: ScriptReference[] = [];
			const references: Project[] = [];
			const tsConfig = Util.parseConfigFile(targetConfigFilePath);
			
			for (const refEntry of tsConfig.references)
			{
				const refPath = refEntry.path;
				const prepend = !!refEntry.prepend;
				
				// We have to avoid following projects that are "prepend",
				// because they'll already be in the output.
				if (prepend)
				{
					Util.warn(`(Found ${refPath}, but skipping because "prepend" is true.)`);
					continue;
				}
				
				if (typeof refPath !== "string")
					continue;
				
				const fullPath = this.resolveReference(targetConfigFilePath, refPath);
				const referencedProject = this.createRecursive(fullPath);
				
				if (referencedProject !== null)
					references.push(referencedProject);
			}
			
			const targetProjectDir = Path.dirname(targetConfigFilePath);
			let outFile = "";
			
			if (tsConfig.compilerOptions.outFile)
			{
				outFile = Path.join(targetProjectDir, tsConfig.compilerOptions.outFile);
				scripts.push(new ScriptReference(ScriptKind.outFile, outFile));
			}
			
			const project = new Project(
				"tsConfig.name",
				targetConfigFilePath,
				targetProjectDir,
				outFile,
				scripts,
				references);
			
			this.projects.set(targetConfigFilePath, project);
			return project;
		}
		
		/**
		 * Returns the fully-qualfied path to a project from
		 * a "references" object within some other config file.
		 */
		private resolveReference(sourcePath: string, referencedPath: string)
		{
			const sourceDir = Path.extname(sourcePath) === ".json" ?
				Path.dirname(sourcePath) :
				sourcePath;
			
			const referencedDir = Path.extname(referencedPath) === ".json" ?
				Path.dirname(referencedPath) :
				referencedPath;
			
			const referencedFile = Path.extname(referencedPath) === ".json" ?
				Path.basename(referencedPath) :
				"tsconfig.json";
			
			return Path.join(sourceDir, referencedDir, referencedFile);
		}
		
		/** */
		eachProject()
		{
			return this.projects.values();
		}
		
		/**
		 * @deprecated
		 * Finds a Project object that relates to the specfied path.
		 * The path parameter may be the path to a tsconfig file,
		 * or it may be the path to an outFile specified within the 
		 * Project's tsconfig, or it may refer to a TypeScript or
		 * JavaScript file nested within a project folder.
		 */
		find(filePath: string)
		{
			const targetProjectConfig = this.resolveReference("", filePath);
			const projectViaConfig = this.projects.get(targetProjectConfig);
			if (projectViaConfig)
				return projectViaConfig;
			
			const projectEntries = Array.from(this.projects.entries());
			
			for (const [path, project] of projectEntries)
				if (project.outFile === filePath)
					return project;
			
			const ext = Path.extname(filePath);
			if (ext === ".ts" || ext === ".js")
			{
				const fileDir = Path.dirname(filePath) + "/";
				const projectConfigPaths = projectEntries
					.map(v => v[0])
					.sort((a, b) => b.length - a.length);
				
				for (const projectConfigPath of projectConfigPaths)
				{
					const projectConfigDir = Path.dirname(projectConfigPath);
					
					if (fileDir.startsWith(projectConfigDir + Path.sep))
						return this.projects.get(projectConfigPath) || null;
				}
			}
			
			return null;
		}
		
		/**
		 * Stores a map of Project objects, keyed by the corresponding 
		 * absolute file path to it's tsconfig file.
		 */
		private readonly projects = new Map<string, Project>();
	}
}
