const { URL } = require('url'); // TODO: verify this works on browser

// https://swagger.io/docs/specification/data-models/keywords/
// https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#schemaObject
const supportedKeys = [
  'title',
  'pattern',
  'required',
  'enum',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
];

const schemaObjectArrayKeys = ['allOf', 'anyOf', 'oneOf'];
const schemaObjectKeys = ['not', 'additionalProperties'];
const schemaObjectDictionaryKeys = ['properties', 'definitions'];
// TODO: handle these
const forbiddenKeys = [
  '$schema',
  'additionalItems',
  'const',
  'contains',
  'dependencies',
  'id,',
  '$id',
  'patternProperties',
  'propertyNames',
];

// Helper function to check whether a string is URL
// @param {string} subject - the subject to be checked
// @return {boolean} - true if subject is a valid URL
function isURL(subject) {
  try {
    new URL(subject);
    return true;
  } catch (e) {
    return false;
  }
}

// Helper function to convert a full URI into a string identifier
//  for example: 'http://supermodel.io/supermodel/Layer'
//  will become: SupermodelIOSupermodelLayer
//
// @param {string} uri - URI to be converted
// @return {string} - Converted id
function convertURItoStringId(uri) {
  const inputURI = new URL(uri);
  let source = `${inputURI.hostname}${inputURI.pathname}`;

  // If hash fragment is anything else but #/components/schemas don't convert it but append
  //  for example:
  //  http://supermodel.io/fragments/A#/components/schemas/a - needs to be converted including the hash
  //  http://supermodel.io/fragments/A#/properties/a - the hash needs to be preserved as '/properties/a'
  // one has to love OpenAPI Spec
  const hash = inputURI.hash;
  let appendHash;
  if (hash) {
    if (!hash.startsWith('#/definitions')) {
      appendHash = hash;
    } else {
      source += hash;
    }
  }

  // snakeCase path segments
  let target = source.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(
    match,
    index,
  ) {
    if (+match === 0) return ''; // or if (/\s+/.test(match)) for white spaces
    return index == 0 ? match.toLowerCase() : match.toUpperCase();
  });

  // remove '/', '#' and '.' from the URI
  target = target.replace(/\/|\.|#/g, '');

  // Append hash, that has not been converted
  if (appendHash) {
    target += appendHash.slice(1); // skip the leading '#' ie. in #/properties/a
  }

  return target;
}

// Helper function to convert a JSON Schema object to OAS2 Schema object
//
// @param {object} schema - JSON Schema object
// @param {string} rootId - root model id, used to resolve remote schema references
// @param {string} currentId - id of the model being processed, used to resolve remote schema references
// @param {object} definitions - a dictionary to place nested definitions into
// @return {object} - OAS2 schema object
function convertSchemaObject(schema, rootId, currentId, definitions) {
  // Override current model id, if available
  if (schema['$id']) {
    currentId = schema['$id'];
  }

  // Enumerate object properties
  const result = {};
  for (const key of Object.keys(schema)) {
    const value = schema[key];
    const property = convertSchemaObjectProperty(
      key,
      value,
      rootId,
      currentId,
      definitions,
    );
    if (property) {
      result[property.key] = property.value;
    }
  }

  return result;
}

// Helper function that converts a property into OAS2 property
//
// @param {object} key - key of the property being converted
// @param {object} value - value of the property being converted
// @param {object} rootId - root model id, used to resolve remote schema references   TODO: root id might be no longer needed
// @param {object} currentId - id of the model being processed, used to resolve remote schema references
// @param {object} definitions - a dictionary to place nested definitions into
// @return { key, value } - converted property tuple or undefined if conversion failed
function convertSchemaObjectProperty(
  key,
  value,
  rootId,
  currentId,
  definitions,
) {
  const valueType = typeof value;

  // Directly supported properties, no further processing needed
  if (supportedKeys.includes(key)) {
    return {
      key,
      value,
    };
  }

  // Arrays of schema objects
  if (schemaObjectArrayKeys.includes(key)) {
    let itemsArray = [];
    value.forEach(element => {
      itemsArray.push(
        convertSchemaObject(element, rootId, currentId, definitions),
      );
    });

    // Warn about converting anyOf and oneOf as all Of
    if (key === 'anyOf' || key === 'oneOf') {
      console.warn(`Warning: '${key}' converted as 'allOf'`);
    }

    return {
      key: 'allOf',
      value: itemsArray,
    }; // Force allOf
  }

  // Single schema object
  if (schemaObjectKeys.includes(key)) {
    return {
      key,
      value: convertSchemaObject(value, rootId, currentId, definitions),
    };
  }

  // Dictionary of schema objects
  if (schemaObjectDictionaryKeys.includes(key)) {
    const resultDictionary = {};
    for (const dictKey of Object.keys(value)) {
      const dictValue = value[dictKey];

      const resultSchemaObject = convertSchemaObject(
        dictValue,
        rootId,
        currentId,
        definitions,
      );

      if (key !== 'definitions') {
        resultDictionary[dictKey] = resultSchemaObject;
      } else {
        // Handle definitions differently, see below for details
        let fullURI = dictValue.$id || dictKey;

        if (!isURL(fullURI)) {
          fullURI = `${currentId}/${dictKey}`;
        }

        resultDictionary[convertURItoStringId(fullURI)] = resultSchemaObject;
      }
    }

    // Handle definitions differently than other schemaObjectDictionaryKeys:
    //  Store the content of nested definitions property in a flat dictionary
    //  since OAS2 doesn't support nested definitions
    if (key !== 'definitions') {
      return {
        key,
        value: resultDictionary,
      };
    }

    Object.assign(definitions, resultDictionary);
  }

  // type property
  // Value MUST be a string, in OAS2, multiple types via an array are not supported
  if (key === 'type') {
    if (valueType === 'string') {
      return {
        key,
        value,
      };
    }
    console.warn(`Warning: type must be a string`);
  }

  // items property
  // convert items as a schema object or and array of schema objects
  if (key === 'items') {
    if (valueType === 'object') {
      if (Array.isArray(value)) {
        let itemsArray = [];
        value.forEach(element => {
          itemsArray.push(
            convertSchemaObject(element, rootId, currentId, definitions),
          );
        });
        // Converting all items is not supported in OAS2
        // return { key, value: itemsArray }

        // Return only first of the items...
        if (itemsArray.length > 1) {
          console.warn(`Warning: dropping additional array items`);
        }
        return {
          key,
          value: itemsArray[0],
        };
      } else {
        return {
          key,
          value: convertSchemaObject(value, rootId, currentId, definitions),
        };
      }
    }
  }

  // $ref property
  // based on the option convert refs to local flat definition dictionary or
  // fully qualify any remote schema references
  if (key === '$ref') {
    if (value.startsWith('#/definitions')) {
      // Local reference
      // We need to add "namespace" to the local reference to prevent clash in
      // OAS2 flat definitions
      const refValue = value.replace('#/definitions/', '');
      const fullURI = `${currentId.replace(
        /#\/definitions\/(.+)/,
        '',
      )}/${refValue}`;
      // TODO: add options to use remote ref
      return {
        key,
        value: `#/components/schemas/${convertURItoStringId(fullURI)}`,
      };
    } else if (isURL(value)) {
      // Remote schema reference
      // Convert to local reference
      // TODO: add options to use remote ref
      return {
        key,
        value: `#/components/schemas/${convertURItoStringId(value)}`,
      };
    } else if (value === '#') {
      // Self reference
      // TODO: add options to use remote ref
      return {
        key,
        value: `#/components/schemas/${convertURItoStringId(currentId)}`,
      };
    }

    // Remote schema reference (e.g. $ref: Layer)
    // OAS2 work-around is to always use full path qualification
    // TODO: add options to use remote ref
    const base = currentId.substr(0, currentId.lastIndexOf('/') + 1);
    const fullURI = `${base}${value}`;
    return {
      key,
      value: `#/components/schemas/${convertURItoStringId(fullURI)}`,
    };
  }

  // examples property
  // Take the first example, if any, throw everything else
  if (key === 'examples') {
    let example;
    if (Array.isArray(value) && value.length) {
      example = value[0];
    }
    return {
      key: 'example',
      value: example,
    };
  }

  // Drop everything else
  // NOTE: dropping 'definitions' is OK since we will re-add them later
  if (key != 'definitions') {
    console.warn(`Warning: dropping '${key}' property`);
  }

  return undefined;
}

// Converts schema into OAS2 schema
// @param {object} schema - JSON Schema object
// @return {object} - OAS2 Schema object
function convertToOAS3(schema) {
  const id = schema['$id'];
  let schemas = {};

  const oas2Schema = convertSchemaObject(schema, id, id, schemas);
  let result = {
    components: {
      schemas,
    },
  };

  if (id) {
    schemas[convertURItoStringId(id)] = oas2Schema;
  } else {
    console.warn(`Warning: no id in the root document found`);
  }

  return result;
}

module.exports = convertToOAS3;
