# Development guidelines

## Naming conventions
### File Naming Convention
1. All code files should be named in kebab-case. That is all lowercase and words separated by hyphen (-)  
e.g. base-entity.js, base-entity.json, config.json etc.  


### Model naming 
1. Model names should always be in PascalCase. That is created by concatenating capitalized words. 
e.g. BaseEntity, AppUser etc.  

2. Model name should be singular noun.  
e.g. AppUsers is not a correct model name.   

3. Model plural should be in camelCase. That is same as PascalCase, but 1st character of 1st word is in lower case.  

4. Model property names should be in camelCase.  

### Variable Naming conventions

1. All variables should follow camelCasing convention  
TODO -
naming for constant variables, model names etc needs to be defined.  

### Property names in config files.  
1. Property names should be in camelCase  

## Code formatting guidelines.  

### Formatting guidelines  
TODO Guidelines goes here. These should include following -  
1. Indentation  
..* Use spaces instead of tabs  
..* Indentation size = 4 spaces  
2. Braces  
..1. Starting brace goes on the same line.  
3. White spaces  
..1. Space after comma in multiple variable declaration  
..2. Space before an opening brace   
..3. Space after a comma in function parameter  
4. Blank lines  
5. New lines  
6. Control statements  
7. Line wrapping  
8. Comments  

### Eclipse code formatter  
Use attached eclipse code formatter to format .js and javascript files.  
[ev-javascript-code-formatter.xml](http://10.73.53.167/ev/ev-foundation/uploads/16f183c0de18f23e1c018659d80d7241/ev-javascript-code-formatter.xml)


# Coding guidelines
### Use JavaScript native functions instead of libraries like lodash.
e.g. User map () function to iterate over array instead of using _.forEach ()

### Avoid if-else style of code. Code should be attached, only when it is needed. 
E.g. when a mixin is applied to a model, it attaches the code to the model. This code should further not check if mixin is applied or not.

### Avoid unnecessary 'undefined' checks by initializing with default value. 
e.g. 
```
var autoscope = ctx.Model.definition.settings.autoscope ? ctx.Model.definition.settings.autoscope : [];
```

In above statement ctx.Model.definition.settings.autoscope check can be avoided by initializing autoscope parameter to an empty array ([]) in the model constructor.


e.g.
```
if (autoscope && autoscope.length) {
}
```

since we have initialized autoscope such ```if``` condition is not needed.

### Error management / guideline 
Create and use multiple types of Error objects like EvBusinessError, EvSystemError instead of generic Error. EvBusinessError can further be of type e.g. DataPersonalizationError

### Logging guidelines 

### Design APIs doing specific operations instead of generic API
e.g. instead /Application API accepting commands like 'create', 'start', 'stop' in a single API, create individual Apis - /Application/id/start, /Application/id/stop etc.

Individual APIs gives better control over ACLs, Monitoring and metering.

### Use constants instead of hardcoded string.
e.g. Instead of using 'before save' have a constant variable and use it.


### Avoid accessing nested object repetitively. 
Instead capture the value of nested object in a variable for further use.

 
