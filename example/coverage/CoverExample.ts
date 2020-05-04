
namespace CoverExample
{
	/** */
	export function coverCreateProgram()
	{
		const program = Example.createProgram();
		return [
			() => 1 + 1 === 2,
			() => program instanceof Truth.Program
		]
	}
	
	/** */
	export function coverAddition()
	{
		return () => 2 + 2 === 4;
	}
	
	/** */
	export function *coverGenerator()
	{
		yield () => 1 + 1 === 2;
		yield () => 2 + 2 === 4;
	}
	
	/** */
	export async function *coverAsyncGenerator()
	{
		yield () => 3 + 3 === 6;
		await new Promise(r => setTimeout(r));
		yield () => 4 + 4 === 8;
	}
	
	if (typeof module === "object")
		module.exports = { CoverExample };
}
