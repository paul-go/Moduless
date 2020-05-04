
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
	
	if (typeof module === "object")
		module.exports = { CoverExample };
}
