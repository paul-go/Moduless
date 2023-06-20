
namespace Moduless
{
	/**
	 * @internal
	 */
	export namespace Util
	{
		/**
		 * 
		 */
		export function toDirectory(path: string)
		{
			if (!path.endsWith(Path.sep))
				path += Path.sep;
			
			return path;
		}
		
		/**
		 * Returns the path to the tsconfig.json file that exists in the containing
		 * folder that is nearest to the specified file.
		 */
		export function getContainingConfigFile(nestedDirectory: string)
		{
			let current = nestedDirectory;
			
			for (let i = -1; ++i < 101;)
			{
				const check = Path.join(current, "tsconfig.json");
				
				if (Fs.existsSync(check))
					return check;
				
				current = Path.join(current, "..");
				
				if (i >= 100 || current === "/")
					throw new Error("Could not find containing config file from path: " + nestedDirectory);
			}
			
			return null;
		}
		
		/**
		 * Parses a TypeScript configuration file (typically called "tsconfig.json"),
		 * and returns an object containing the relevant information.
		 */
		export function parseConfigFile(configFilePath: string)
		{
			type TReference = {
				path: string;
				prepend: boolean;
			};
			
			type TRelevantConfig = {
				name: string,
				compilerOptions: {
					outFile: string
				},
				references: TReference[],
				moduless: {
					scripts: string[]
				}
			};
			
			const tsConfig = <TRelevantConfig>parseJsonFile(configFilePath);
			
			if (!tsConfig.compilerOptions)
				tsConfig.compilerOptions = { outFile: "" };
			
			else if (!tsConfig.compilerOptions.outFile)
				tsConfig.compilerOptions.outFile = "";
			
			if (!tsConfig.name)
			{
				const outFile = tsConfig.compilerOptions.outFile;
				tsConfig.name = Path.basename(outFile, Path.extname(outFile));
			}
			
			if (!tsConfig.references)
				tsConfig.references = [];
			
			if (!tsConfig.moduless)
				tsConfig.moduless = { scripts: [] };
			
			else
			{
				const scripts = tsConfig.moduless.scripts;
				tsConfig.moduless.scripts = 
					Array.isArray(scripts) ? scripts :
					typeof scripts === "string" ? [scripts] :
					[];
			}
			
			return tsConfig;
		}
		
		/**
		 * 
		 */
		export function parseJsonFile(jsonFilePath: string): any
		{
			const fileText = Fs.readFileSync(jsonFilePath, "utf8");
			return fileText ? 
				Util.parseJsonText(fileText) :
				{};
		}
		
		/**
		 * 
		 */
		export function parseJsonText(jsonText: string): object
		{
			try
			{
				return new Function("return (" + jsonText + ");")();
			}
			catch (e)
			{
				return {};
			}
		}
		
		/**
		 * Returns the name of the function at the specified line,
		 * or an empty string in the case when the specified line 
		 * does not define a function.
		 */
		export function getFunctionNameFromLine(lineText: string)
		{
			const searchReg = new RegExp("function(\\s+\\*|\\*\\s+|\\s+\\*\\s+|\\s+)");
			const functionStart = searchReg.test(lineText);
			if (!functionStart)
				return "";
			
			return lineText
				.replace(/^\s*(export\s+)?(async\s+)?(function[\s\*]+)/, "")
				.replace(/\s*\(\s*\)\s*/, "");
		}
		
		/**
		 * 
		 */
		export function getContainingNamespaceName(lines: string[])
		{
			if (lines.length === 0)
				return [];
			
			const namespace: string[] = [];
			const getIndent = (line: string) => line.length - line.trimStart().length;
			let currentIndent = getIndent(lines[lines.length - 1]);
			
			if (currentIndent === 0)
				return [];
			
			for (let i = lines.length; i-- > 0;)
			{
				const line = lines[i];
				const lineIndent = getIndent(line);
				if (lineIndent < currentIndent)
				{
					const reg = /\s*namespace\s+[a-z0-9$\.]+\s*{?/gi;
					if (reg.test(line))
					{
						const ns = line
							.trim()
							.replace(/^namespace\s+/, "")
							.split(/[\/\s{]/)[0];
						
						
						namespace.unshift(...ns.split("."));
						currentIndent = lineIndent;
					}
					
					if (currentIndent === 0)
						break;
				}
			}
			
			return namespace;
		}
		
		/**
		 * Logs an information message to the console, using a moduless-specific branding.
		 */
		export function log(message: string)
		{
			const titleCss = "color: green;";
			const contentCss = "color: inherit";
			console.log("%cModuless%c: " + message, titleCss, contentCss);
		}
		
		/**
		 * Logs a warning message to the console, using a moduless-specific branding.
		 */
		export function warn(message: string)
		{
			const titleCss = "color: olive;";
			const contentCss = "color: inherit";
			console.warn("%cModuless%c: " + message, titleCss, contentCss);
		}
		
		/**
		 * Logs an error message to the console, using a moduless-specific branding.
		 */
		export function error(message: string)
		{
			const titleCss = "color: red;";
			const contentCss = "color: inherit";
			console.error("%cModuless%c: " + message, titleCss, contentCss);
		}
		
		/**
		 * Logs a separator line to the console.
		 */
		export function separate()
		{
			const separator = "-".repeat(80);
			console.log(`\n%c${separator}\n`, "color: gray");
		}
		
		/** */
		export const base64Decode = typeof atob === "undefined" ? 
			((v: string) => Buffer.from(v, "base64").toString("binary")) :
			atob;
		
		/** */
		export const base64Encode = typeof btoa === "undefined" ?
			((v: string) => Buffer.from(v, "binary").toString("base64")) :
			btoa;
	}
}
