
namespace Moduless
{
	/** */
	type CoverReturn = 
		undefined |
		Error | 
		boolean |
		Element |
		(() => boolean) |
		(() => boolean)[];
	
	/** */
	type CoverFn = () => CoverReturn | Promise<CoverReturn>;
	
	/**
	 * An interface that stores information about the running
	 * of a single cover function.
	 */
	export interface IRunMeta
	{
		functionNamespace: string[];
		functionName: string;
		projectPath: string;
		
		/**
		 * Whether the "name" property refers to a prefix (true),
		 * or whether it's a fully qualified name (false).
		 */
		prefix?: boolean;
	}
	
	/**
	 * 
	 */
	export async function run(runInfo: IRunMeta)
	{
		// Wait 1600ms to give the debugger a chance to connect.
		// This can be a problem with larger projects when 
		if (Moduless.inElectronMain || Moduless.inElectronRender)
			await new Promise(r => setTimeout(r, 1600));
		
		if (Moduless.inElectronRender)
		{
			// Eliminate Electron's console generated garbage
			console.clear();
		}
		
		if (runInfo.prefix)
		{
			Util.log(
				`Running cover functions in ${runInfo.functionNamespace.join(".")} ` +
				`starting with ${runInfo.functionName}.`);
		}
		
		let hasRunOneFunction = false;
		
		const coverResult = await runCovers(runInfo);
		if (coverResult)
		{
			hasRunOneFunction = true;
			
			if (runInfo.functionName)
				return;
		}
		
		if (!hasRunOneFunction)
			Util.error("No cover functions were run, because nothing applicable could be found.");
	}
	
	/**
	 * Finds cover functions tucked away in TypeScript files that can
	 * only be found by traversing the TypeScript project structure.
	 * Returns null in the case when no functions were discovered.
	 */
	function tryLoadCoversFromDependencies(projectPath: string)
	{
		const graph = new ProjectGraph(projectPath);
		const scriptFilePaths: string[] = [];
		
		for (const project of graph.eachProject())
			if (project.outFile !== "")
				scriptFilePaths.push(project.outFile);
		
		const exports: object[] = [];
		
		for (const scriptFilePath of scriptFilePaths)
		{
			if (!Fs.existsSync(scriptFilePath))
			{
				Util.error("File not found: " + scriptFilePath);
				continue;
			}
			
			try
			{
				const exp = require(scriptFilePath);
				
				if (exp && typeof exp === "object" && !Array.isArray(exp))
					exports.push(exp);
			}
			catch (e)
			{
				console.log(e);
			}
		}
		
		return exports;
	}
	
	/**
	 * Runs the cover functions with the specified name, from the specified
	 * namespace. Intended for use with Node.js.
	 */
	async function runCovers(target: IRunMeta)
	{
		const dependencies = tryLoadCoversFromDependencies(target.projectPath);
		const exports = [...dependencies, globalThis];
		
		const resolvedNamespace = (() =>
		{
			nextExport: for (const exp of exports)
			{
				let current: any = exp;
				
				for (const identifier of target.functionNamespace)
				{
					if (!(identifier in current))
						continue nextExport;
					
					current = current[identifier];
				}
				
				if (!current || typeof current !== "object")
					continue nextExport;
				
				return current as Record<string, any>;
			}
			
			const ns = target.functionNamespace.join(".");
			throw new Error(
				`Could not resolve: ${ns}\nNot found or not an object.`);
		})();
		
		const covers = (() =>
		{
			const out: [string, CoverFn][] = [];
			
			if (target.functionName)
			{
				const fn = resolvedNamespace[target.functionName];
				if (typeof fn !== "function")
					throw new Error(target.functionName + " is not a function.");
				
				out.push([target.functionName, fn]);
			}
			else if (target.prefix)
				for (const [functionName, maybeFunction] of Object.entries(resolvedNamespace))
					if (typeof maybeFunction === "function")
						if (functionName.startsWith(target.functionName))
							out.push([functionName, maybeFunction]);
			
			return out;
		})();
		
		if (covers.length === 0)
			return false;
		
		for (const [coverName, coverFunction] of covers)
			await runSingleCover(coverName, coverFunction);
		
		return true;
	}
	
	/**
	 * Returns the name of the cover function currently being tested.
	 */
	export function getRunningFunctionName()
	{
		return runningFunctionName;
	}
	let runningFunctionName = "";
	
	/** */
	export async function runSingleCover(
		coverName: string,
		coverFunction: CoverFn)
	{
		if (typeof coverFunction !== "function")
			return;
		
		runningFunctionName = coverName;
		let coverResult = coverFunction();
		
		if (coverResult === undefined || coverResult === null)
		{
			report(true, coverName);
			return;
		}
		
		if (coverResult instanceof Promise)
			coverResult = await coverResult;
		
		if (Moduless.inBrowser && coverResult)
		{
			if (coverResult instanceof window.Element)
				document.body.appendChild(coverResult);
			
			else if (Array.isArray(coverResult))
			{
				for (let i = coverResult.length; i-- > 0;)
				{
					const element = coverResult[i];
					if (element instanceof window.Element)
					{
						document.body.prepend(element);
						coverResult.splice(i, 1);
					}
				}
			}
		}
		
		if (coverResult === true)
			report(true, coverName);
		
		else if (coverResult === false)
			report(false, coverName);
		
		else if (typeof coverResult === "function")
			execChecker(coverName, coverResult);
		
		else if (Array.isArray(coverResult) || isGenerator(coverResult))
			for (const checkerFn of coverResult)
				execChecker(coverName, checkerFn);
		
		else if (isAsyncGenerator(coverResult))
			for await (const checkerFn of coverResult)
				await execCheckerAsync(coverName, checkerFn);
	}
	
	/** */
	function isGenerator(coverResult: any): coverResult is IterableIterator<any>
	{
		return !!coverResult &&
			typeof coverResult === "object" &&
			coverResult[Symbol.toStringTag] === "Generator" &&
			typeof coverResult[Symbol.iterator] === "function";
	}
	
	/** */
	function isAsyncGenerator(coverResult: any): coverResult is AsyncIterableIterator<any>
	{
		return !!coverResult &&
			typeof coverResult === "object" &&
			//coverResult[Symbol.toStringTag] === "AsyncGenerator" &&
			typeof coverResult[Symbol.asyncIterator] === "function";
	}
	
	/** */
	function execChecker(coverFunctionName: string, checkerFn: () => boolean)
	{
		const checkerText = checkerFn.toString().replace(/^\s*\(\)\s*=>\s*/, "");
		
		try
		{
			const passed = checkerFn();
			report(passed, coverFunctionName, checkerText);
		}
		catch (err)
		{
			const e = err as Error;
			Util.error(
				"Checker function: " + checkerText + " generated an error: \n" +
				"\t" + e.name + ": " + e.message + "\r\n" +
				e.stack || "(no stack trace)");
		}
	}
	
	/** */
	async function execCheckerAsync(coverFunctionName: string, checkerFn: () => Promise<boolean>)
	{
		const checkerText = checkerFn.toString().replace(/^\s*\(\)\s*=>\s*/, "");
		
		try
		{
			const passed = await checkerFn();
			report(passed, coverFunctionName, checkerText);
		}
		catch (err)
		{
			const e = err as Error;
			Util.error(
				"Checker function: " + checkerText + " generated an error: \n" +
				"\t" + e.name + ": " + e.message + "\r\n" +
				e.stack || "(no stack trace)");
		}
	}
	
	/** */
	function report(
		passed: boolean,
		coverFunctionName: string,
		checkerFnText: string = "")
	{
		let message = `Cover ${passed ? "passed" : "failed"}: ` + coverFunctionName;
		if (checkerFnText)
			message += ` { ${checkerFnText} }`;
		
		passed ?
			Util.log(message) :
			Util.error(message);
	}
}
