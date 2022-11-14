
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
	
	/** */
	export interface IRunInfo
	{
		cwd: string;
		namespacePath: string[];
		functionPrefix?: string;
		functionName?: string;
	}
	
	/**
	 * 
	 */
	export namespace IRunInfo
	{
		/**
		 * Creates an IRunInfo namespace, parsed from
		 * the specified namespace path, and function prefix.
		 */
		export function parsePrefix(qualifiedName: string): IRunInfo
		{
			const parts = qualifiedName.split(".");
			return {
				cwd: process.cwd(),
				namespacePath: parts.slice(0, -1),
				functionPrefix: parts.at(-1) || ""
			};
		}
		
		/**
		 * Creates an IRunInfo namespace, parsed from
		 * the specified namespace path, and function name.
		 */
		export function parseNamed(qualified: string)
		{
			const parts = qualified.split(".");
			return {
				cwd: process.cwd(),
				namespacePath: parts.slice(0, -1),
				functionName: parts.at(-1) || ""
			};
		}
	}
	
	/**
	 * 
	 */
	export async function run(info: IRunInfo)
	{
		// Wait 1600ms to give the debugger a chance to connect.
		// This can be a problem with larger projects.
		await new Promise(r => setTimeout(r, 1600));
		
		if (Moduless.inElectronRender)
		{
			// Eliminate Electron's console generated garbage
			console.clear();
		}
		
		if (!info.functionName)
		{
			Util.log(
				`Running cover functions in ${info.namespacePath.join(".")} ` +
				`starting with ${info.functionPrefix}.`);
		}
		
		let hasRunOneFunction = false;
		
		const coverResult = await runCovers(info);
		if (coverResult)
		{
			hasRunOneFunction = true;
			
			if (info.functionName)
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
	function tryLoadCoversFromDependencies(cwd = process.cwd())
	{
		//const coverNamespaces: Namespace[] = [];
		const graph = new ProjectGraph(cwd);
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
	async function runCovers(info: IRunInfo)
	{
		const exports = [
			...tryLoadCoversFromDependencies(info.cwd),
			globalThis,
		];
		
		const resolvedNamespace = (() =>
		{
			nextExport: for (const exp of exports)
			{
				let current: any = exp;
				
				for (const identifier of info.namespacePath)
				{
					if (!(identifier in current))
						continue nextExport;
					
					current = current[identifier];
				}
				
				if (!current || typeof current !== "object")
					continue nextExport;
				
				return current as Record<string, any>;
			}
			
			throw new Error(
				"Could not resolve: " + info.namespacePath + 
				". Not found or not an object.");
		})();
		
		const covers = (() =>
		{
			const out: [string, CoverFn][] = [];
			
			if (info.functionName)
			{
				const fn = resolvedNamespace[info.functionName];
				if (typeof fn !== "function")
					throw new Error(info.functionName + " is not a function.");
				
				out.push([info.functionName, fn]);
			}
			else if (info.functionPrefix)
				for (const [functionName, maybeFunction] of Object.entries(resolvedNamespace))
					if (typeof maybeFunction === "function")
						if (functionName.startsWith(info.functionPrefix))
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
