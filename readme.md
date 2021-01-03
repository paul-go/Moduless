
# Moduless

(New README coming)

## Environment Reset

Cover namespaces may export a function called `modulessReset`. If this function exists, it will be called at the end of the execution of every cover function in the cover namespace (whether the function passes or fails) in order to reset the environment for the next cover function. This function is only called when running multiple cover functions in a series.
