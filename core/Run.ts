
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
	type Namespace = Record<string, CoverFn>;
	
	const coverNamespaceReg = /^Cover[A-Z]?/;
	const coverFnReg = /^cover[A-Z0-9]/;
	const coverFnPrefixReg = /^cover/;
	const global: any = globalThis;
	
	/**
	 * 
	 */
	export async function run(
		cwd = process.cwd(),
		coverFunctionName: RegExp | string = "")
	{
		// Wait 1600ms to give the debugger a chance to connect.
		// This can be a problem with larger projects.
		await new Promise(r => setTimeout(r, 1600));
		
		if (Moduless.inElectronRender)
		{
			// Eliminate Electron's console generated garbage
			console.clear();
		}
		
		if (coverFunctionName === "")
			Util.log("Running all discoverable cover functions.");
		
		// NOTE: This code is messed up, but it works, for now. The following
		// function call isn't actually just loading covers from the dependencies,
		// it's also including the dependencies as well, which needs to be done
		// in order for things to load.
		let coverNamespaces = tryLoadCoversFromDependencies(cwd);
		
		// In the case when there is already a cover function namespace
		// found in the global scope, we skip the loading of the project
		// reference scripts, because we assume that the references
		// have already been loaded by another means.
		if (!coverNamespaces)
			coverNamespaces = tryLoadCoversFromGlobal();
		
		if (!coverNamespaces)
		{
			Util.error(
				`No namespaces where found that begin with the prefix "Cover".\n` +
				`Be sure you're exporting the namespace like: module.exports = { MyNamespace }; `);
			
			return;
		}
		
		let hasRunOneFunction = false;
		
		for (const ns of coverNamespaces)
		{
			const coverResult = await runCovers(ns, coverFunctionName);
			if (coverResult)
			{
				hasRunOneFunction = true;
				
				if (coverFunctionName)
					break;
			}
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
		const coverNamespaces: Namespace[] = [];
		const graph = new ProjectGraph(cwd);
		const scriptFilePaths: string[] = [];
		
		for (const project of graph.eachProject())
			if (project.outFile !== "")
				scriptFilePaths.push(project.outFile);
		
		for (const scriptFilePath of scriptFilePaths)
		{
			if (!Fs.existsSync(scriptFilePath))
			{
				Util.error("File not found: " + scriptFilePath);
				continue;
			}
			
			try
			{
				const requireResult = require(scriptFilePath);
				if (!requireResult || 
					typeof requireResult !== "object" ||
					Object.keys(requireResult).length === 0)
				{
					console.warn("Project at " + scriptFilePath + " has no export.");
					continue;
				}
				
				for (const [key, value] of Object.entries(requireResult))
				{
					if (value === undefined || value === null || value !== value)
						continue;
					
					const val = value as Namespace;
					global[key] = value;
					
					if (coverFnReg.test(key))
						coverNamespaces.push(val);
				}
			}
			catch (e)
			{
				console.log(e);
			}
		}
		
		if (coverNamespaces.length === 0)
			return null;
		
		return coverNamespaces;
	}
	
	/**
	 * Finds cover functions defined in the global scope.
	 * Returns null in the case when no functions were discovered.
	 */
	function tryLoadCoversFromGlobal()
	{
		const coverNamespaces: Namespace[] = [];
		
		for (const key of Object.keys(global))
		{
			// Avoid accessing members that whose names aren't
			// compliant with the expected format.
			if (!coverNamespaceReg.test(key))
				continue;
			
			const value = global[key];
			if (value === undefined || value === null || value !== value)
				continue;
			
			if (coverNamespaceReg.test(key) && typeof value === "object")
				coverNamespaces.push(value as Namespace);
		}
		
		if (coverNamespaces.length === 0)
			return null;
		
		return coverNamespaces;
	}
	
	/**
	 * Runs the cover functions with the specified name, from the specified
	 * namespace. Intended for use with Node.js.
	 */
	async function runCovers(
		coverNamespace: Namespace,
		coverFunctionName: RegExp | string = "")
	{
		const coverEntries = (() =>
		{
			if (typeof coverFunctionName === "string")
			{
				if (coverFunctionName === "")
					return Object.entries(coverNamespace);
				
				const coverFunction = coverNamespace[coverFunctionName];
				return typeof coverFunction === "function" ?
					[[coverFunctionName, coverFunction]] as [string, CoverFn][] :
					[];
			}
			
			return Object.entries(coverNamespace).filter(entry =>
			{
				return coverFunctionName.test(entry[0]);
			});
		})();
		
		if (coverEntries.length === 0)
			return false;
		
		for (const [coverName, coverFunction] of coverEntries)
		{
			await maybeRunEnvironmentReset(coverNamespace);
			await runSingleCover(coverName, coverFunction);
		}
		
		return true;
	}
	
	/** */
	export async function runSingleCover(
		coverName: string,
		coverFunction: CoverFn)
	{
		if (typeof coverFunction !== "function")
			return;
		
		const coverFunctionName = coverName.replace(coverFnPrefixReg, "");
		let coverResult = coverFunction();
		
		if (coverResult === undefined || coverResult === null)
		{
			report(true, coverFunctionName);
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
			report(true, coverFunctionName);
		
		else if (coverResult === false)
			report(false, coverFunctionName);
		
		else if (typeof coverResult === "function")
			execChecker(coverFunctionName, coverResult);
		
		else if (Array.isArray(coverResult) || isGenerator(coverResult))
			for (const checkerFn of coverResult)
				execChecker(coverFunctionName, checkerFn);
		
		else if (isAsyncGenerator(coverResult))
			for await (const checkerFn of coverResult)
				await execCheckerAsync(coverFunctionName, checkerFn);
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
		catch (e)
		{
			Util.error(
				"Checker function: " + checkerText + " generated an error: \n" +
				"\t" + e.name + ": " + e.message + "\r\n" +
				e.stack || "(no stack trace)");
		}
	}
	
	/** */
	async function execCheckerAsync(coverFunctionName: string, checkerFn: () => boolean)
	{
		const checkerText = checkerFn.toString().replace(/^\s*\(\)\s*=>\s*/, "");
		
		try
		{
			const passed = await checkerFn();
			report(passed, coverFunctionName, checkerText);
		}
		catch (e)
		{
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
	
	/**
	 * Attempts to find the environment reset function defined in the global scope,
	 * and runs this function if it exists. The environment reset function needs to
	 * be named "modulessReset"
	 */
	async function maybeRunEnvironmentReset(ns: Namespace)
	{
		const resetFn = ns["modulessReset"] as Function;
		if (typeof resetFn !== "function")
			return;
		
		const result = resetFn();
		if (result instanceof Promise)
			await result;
	}
}
