<!--
©2015-2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary), Bangalore, India. All Rights Reserved.
-->
# oeCloud.io (Open Enterprise for Cloud)

oeCloud.io is an architectural blueprint for building enterprise systems leveraging open source framework and powered by automation tools. It is based on [loopback framework](https://github.com/strongloop/loopback). 
It provides framework enablers and tool-sets for end to end agile development of enterprise applications.

## Introduction
oeCloud.io is built on open source technologies, within a standards-based framework. oeCloud.io based components are finely-grained micro-services with well-defined APIs that are integrated using key principles of distributed systems such as :

* Model Driven Architecture
* Everything Personalizable
* Eventual consistency
* Event-driven
* Small footprint – Self Boot strapped
* Cloud Readiness

In addition to the Loopback-provided features, this framework supports the following:

* Dynamic Model creation or Runtime authoring of Models
* Dynamic DataSource creation
* Multi-Tenancy and Tenant/Context-aware Models
* Automatic History and Audit handling
* Data level Access Control

## Prerequisite

* Nodejs (version > v6.9.1)
* MongoDB

## Getting Started

### Install this node module 
```
git clone https://github.com/EdgeVerve/oe-cloud.git 
cd oe-cloud
npm install --no-optional
```

### Running

Run node on command line.

```
node .
```

Browse all oeCloud.io models in browser 

```
http://localhost:3000/explorer
```

## Migration from oe-cloud ^0.9.x to ^1.1.x
* For Issue: Cannot merge values of incompatible types for the option `remoting.context`, Please change all the modules config files(config.\*.js and config.\*.json ) listed in app-list.json, change `remoting.context` to `false`.

  Ex: older config
  
  ``` json
    "context": {
      "enableHttpContext": true
    },
  ```

  new config

  ``` json
    "context": false,
  ```
Or if you face a similar config mismatch issue get the value from node_modules/oe-cloud/config.json and try to have the same value in all modules listed in app-list.json

## Migration from oe-cloud ^0.9.x to ^1.1.x
* For Issue: Cannot merge values of incompatible types for the option `remoting.context`, Please change all the modules config files(config.\*.js and config.\*.json ) listed in app-list.json, change `remoting.context` to `false`.

  Ex: older config
  
  ``` json
    "context": {
      "enableHttpContext": true
    },
  ```

  new config

  ``` json
    "context": false,
  ```
Or if you face a similar config mismatch issue get the value from node_modules/oe-cloud/config.json and try to have the same value in all modules listed in app-list.json

## More information

Please visit [oeCloud.io](https://www.oecloud.io)

## License
The project is licensed under MIT License, See [LICENSE](./LICENSE) for more details.

## Contributing
We welcome contributions. Some of the best ways to contribute are to try things out, file bugs, and join in design conversations. 

### [How to contribute](./CONTRIBUTION.md)

### [Report an issue](https://github.com/EdgeVerve/oe-cloud/issues)
