/**
 * This is the different states of the parser, it is used to determine the
 * different states of the parser.
 */
enum ParseState {
  VALUE,
  OBJECT_KEY,
  OBJECT_COLON,
  OBJECT_VALUE,
  ARRAY_VALUE,
  STRING,
  NUMBER,
  LITERAL,
  END
}

/**
 * This is the context of the parser, it is used to keep track of the current
 * state of the parser.
 */
interface ParseContext {
  text: string;
  index: number;
  state: ParseState;
  stack: any[];
  current: any;
  key?: string;
}

/**
 * This is the main function that parses the text and returns the JSON object.
 * We gave it complete text Like an article or a blog post and It tries to extract
 * all the JSON objects in the text.
 *
 * @param text
 *     The text to parse (A blog post or an article or AI generated text).
 *
 * @returns
 *     The First JSON object found in the text.
 */
const jsonParser = (text: string): any => {
  const jsonObjects = extractJsonFromText(text);

  if (jsonObjects.length === 0) {
    throw new Error('No valid JSON found in the text');
  }

  // Return the first valid JSON object found
  return jsonObjects[0];
};

/**
 * This function extracts all JSON objects from the text.
 *
 * @param text
 *     The text to parse (A blog post or an article or AI generated text).
 *
 * @returns
 *     The JSON objects found in the text.
 */
const extractJsonFromText = (text: string): any[] => {
  const results: any[] = [];
  const cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Look for potential JSON starting points
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    if (char === '{' || char === '[') {
      try {
        const jsonStr = extractJsonString(cleanText, i);
        if (jsonStr) {
          const parsed = parseJsonStringInternal(jsonStr);
          results.push(parsed);
        }
      } catch (e) {
        // Continue looking for other JSON objects
        continue;
      }
    }
  }

  return results;
};

/**
 * This function extracts a complete JSON string starting from a given position.
 *
 * @param text
 *     The text to parse (A blog post or an article or AI generated text).
 *
 * @param startIndex
 *     The index to start the extraction from.
 *
 * @returns
 *     The JSON string found in the text.
 */
const extractJsonString = (text: string, startIndex: number): string | null => {
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;
  let i = startIndex;

  const startChar = text[startIndex];
  if (startChar === '{') {
    braceCount = 1;
  } else if (startChar === '[') {
    bracketCount = 1;
  } else {
    return null;
  }

  i++; // Move past the opening brace/bracket

  while (i < text.length && (braceCount > 0 || bracketCount > 0)) {
    const char = text[i];

    if (escaped) {
      escaped = false;
    } else if (char === '\\' && inString) {
      escaped = true;
    } else if (char === '"' && !escaped) {
      inString = !inString;
    } else if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
      } else if (char === '[') {
        bracketCount++;
      } else if (char === ']') {
        bracketCount--;
      }
    }

    i++;
  }

  if (braceCount === 0 && bracketCount === 0) {
    return text.substring(startIndex, i);
  }

  return null;
};

/**
 * This function parses a clean JSON string.
 *
 * @param jsonStr
 *     The JSON string to parse.
 *
 * @returns
 *     The parsed JSON object.
 */
const parseJsonStringInternal = (jsonStr: string): any => {
  const context: ParseContext = {
    text: jsonStr.trim(),
    index: 0,
    state: ParseState.VALUE,
    stack: [],
    current: null
  };

  while (context.index < context.text.length && context.state !== ParseState.END) {
    skipWhitespace(context);

    if (context.index >= context.text.length) break;

    switch (context.state) {
      case ParseState.VALUE:
        parseValue(context);
        break;
      case ParseState.OBJECT_KEY:
        parseObjectKey(context);
        break;
      case ParseState.OBJECT_COLON:
        parseObjectColon(context);
        break;
      case ParseState.OBJECT_VALUE:
        parseObjectValue(context);
        break;
      case ParseState.ARRAY_VALUE:
        parseArrayValue(context);
        break;
      default:
        throw new Error(`Unexpected state at index ${context.index}`);
    }
  }

  if (context.stack.length > 0) {
    throw new Error('Unexpected end of input');
  }

  return context.current;
};

/**
 * This function skips the whitespace in the text.
 *
 * @param context
 *     The context of the parser.
 */
const skipWhitespace = (context: ParseContext): void => {
  while (context.index < context.text.length) {
    const char = context.text[context.index];
    if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
      context.index++;
    } else {
      break;
    }
  }
};

/**
 * This function parses the value in the text.
 *
 * @param context
 *     The context of the parser.
 */
const parseValue = (context: ParseContext): void => {
  const char = context.text[context.index];

  switch (char) {
    case '{':
      context.current = {};
      context.stack.push({ type: 'object', value: context.current });
      context.index++;
      context.state = ParseState.OBJECT_KEY;
      break;
    case '[':
      context.current = [];
      context.stack.push({ type: 'array', value: context.current });
      context.index++;
      context.state = ParseState.ARRAY_VALUE;
      break;
    case '"':
      context.current = parseString(context);
      context.state = ParseState.END;
      break;
    case 't':
    case 'f':
    case 'n':
      context.current = parseLiteral(context);
      context.state = ParseState.END;
      break;
    default:
      if (char === '-' || (char >= '0' && char <= '9')) {
        context.current = parseNumber(context);
        context.state = ParseState.END;
      } else {
        throw new Error(`Unexpected character '${char}' at index ${context.index}`);
      }
  }
};

/**
 * This function parses the object key in the text. It is used to determine
 * the start and the end of the object key.
 *
 * @param context
 *     The context of the parser.
 */
const parseObjectKey = (context: ParseContext): void => {
  skipWhitespace(context);

  if (context.index >= context.text.length) {
    throw new Error('Unexpected end of input while parsing object key');
  }

  const char = context.text[context.index];

  if (char === '}') {
    // Empty object
    context.index++;
    popStack(context);
    return;
  }

  if (char !== '"') {
    throw new Error(`Expected string key at index ${context.index}, got '${char}'`);
  }

  context.key = parseString(context);
  context.state = ParseState.OBJECT_COLON;
};

/**
 * This function parses the object colon in the text. It is used to determine
 * the start of the object value.
 *
 * @param context
 *     The context of the parser.
 */
const parseObjectColon = (context: ParseContext): void => {
  skipWhitespace(context);

  if (context.index >= context.text.length || context.text[context.index] !== ':') {
    throw new Error(`Expected ':' at index ${context.index}`);
  }

  context.index++;
  context.state = ParseState.OBJECT_VALUE;
};

/**
 * This function parses the object value in the text. It is used to determine
 * the start and the end of the object value.
 *
 * @param context
 *     The context of the parser.
 */
const parseObjectValue = (context: ParseContext): void => {
  skipWhitespace(context);

  const oldState = context.state;
  const oldCurrent = context.current;

  context.state = ParseState.VALUE;
  parseValue(context);

  // Set the key-value pair
  const obj = context.stack[context.stack.length - 1].value;
  obj[context.key!] = context.current;

  skipWhitespace(context);

  if (context.index >= context.text.length) {
    throw new Error('Unexpected end of input');
  }

  const char = context.text[context.index];
  if (char === ',') {
    context.index++;
    context.state = ParseState.OBJECT_KEY;
  } else if (char === '}') {
    context.index++;
    popStack(context);
  } else {
    throw new Error(`Expected ',' or '}' at index ${context.index}, got '${char}'`);
  }
};

/**
 * This function parses the array value in the text. It is used to determine
 * the start and the end of the array value.
 *
 * @param context
 *     The context of the parser.
 */
const parseArrayValue = (context: ParseContext): void => {
  skipWhitespace(context);

  if (context.index >= context.text.length) {
    throw new Error('Unexpected end of input while parsing array');
  }

  const char = context.text[context.index];

  if (char === ']') {
    // Empty array
    context.index++;
    popStack(context);
    return;
  }

  const oldState = context.state;
  context.state = ParseState.VALUE;
  parseValue(context);

  // Add value to array
  const arr = context.stack[context.stack.length - 1].value;
  arr.push(context.current);

  skipWhitespace(context);

  if (context.index >= context.text.length) {
    throw new Error('Unexpected end of input');
  }

  const nextChar = context.text[context.index];
  if (nextChar === ',') {
    context.index++;
    context.state = ParseState.ARRAY_VALUE;
  } else if (nextChar === ']') {
    context.index++;
    popStack(context);
  } else {
    throw new Error(`Expected ',' or ']' at index ${context.index}, got '${nextChar}'`);
  }
};

/**
 * This function pops the stack of the parser. It is used to determine
 * the end of the object or array.
 *
 * @param context
 *     The context of the parser.
 */
const popStack = (context: ParseContext): void => {
  const popped = context.stack.pop();
  if (popped) {
    context.current = popped.value;
  }

  if (context.stack.length === 0) {
    context.state = ParseState.END;
  } else {
    const parent = context.stack[context.stack.length - 1];
    if (parent.type === 'object') {
      context.state = ParseState.OBJECT_KEY;
    } else {
      context.state = ParseState.ARRAY_VALUE;
    }
  }
};

/**
 * This function parses the string in the text.
 *
 * @param context
 *     The context of the parser.
 */
const parseString = (context: ParseContext): string => {
  if (context.text[context.index] !== '"') {
    throw new Error(`Expected '"' at index ${context.index}`);
  }

  context.index++; // Skip opening quote
  let result = '';

  while (context.index < context.text.length) {
    const char = context.text[context.index];

    if (char === '"') {
      context.index++; // Skip closing quote
      return result;
    }

    if (char === '\\') {
      context.index++;
      if (context.index >= context.text.length) {
        throw new Error('Unexpected end of input in string escape');
      }

      const escaped = context.text[context.index];
      switch (escaped) {
        case '"':
        case '\\':
        case '/':
          result += escaped;
          break;
        case 'b':
          result += '\b';
          break;
        case 'f':
          result += '\f';
          break;
        case 'n':
          result += '\n';
          break;
        case 'r':
          result += '\r';
          break;
        case 't':
          result += '\t';
          break;
        case 'u':
          // Unicode escape sequence
          if (context.index + 4 >= context.text.length) {
            throw new Error('Invalid unicode escape sequence');
          }
          const hexCode = context.text.substring(context.index + 1, context.index + 5);
          if (!/^[0-9a-fA-F]{4}$/.test(hexCode)) {
            throw new Error('Invalid unicode escape sequence');
          }
          result += String.fromCharCode(parseInt(hexCode, 16));
          context.index += 4;
          break;
        default:
          throw new Error(`Invalid escape sequence '\\${escaped}' at index ${context.index}`);
      }
    } else {
      result += char;
    }

    context.index++;
  }

  throw new Error('Unterminated string');
};

/**
 * This function parses the number in the text.
 *
 * @param context
 *     The context of the parser.
 */
const parseNumber = (context: ParseContext): number => {
  const start = context.index;

  // Handle negative sign
  if (context.text[context.index] === '-') {
    context.index++;
  }

  if (context.index >= context.text.length || !/[0-9]/.test(context.text[context.index])) {
    throw new Error(`Invalid number at index ${start}`);
  }

  // Parse integer part
  if (context.text[context.index] === '0') {
    context.index++;
  } else {
    while (context.index < context.text.length && /[0-9]/.test(context.text[context.index])) {
      context.index++;
    }
  }

  // Parse decimal part
  if (context.index < context.text.length && context.text[context.index] === '.') {
    context.index++;
    if (context.index >= context.text.length || !/[0-9]/.test(context.text[context.index])) {
      throw new Error(`Invalid number at index ${start}`);
    }
    while (context.index < context.text.length && /[0-9]/.test(context.text[context.index])) {
      context.index++;
    }
  }

  // Parse exponent part
  if (context.index < context.text.length && /[eE]/.test(context.text[context.index])) {
    context.index++;
    if (context.index < context.text.length && /[+-]/.test(context.text[context.index])) {
      context.index++;
    }
    if (context.index >= context.text.length || !/[0-9]/.test(context.text[context.index])) {
      throw new Error(`Invalid number at index ${start}`);
    }
    while (context.index < context.text.length && /[0-9]/.test(context.text[context.index])) {
      context.index++;
    }
  }

  const numberStr = context.text.substring(start, context.index);
  const result = parseFloat(numberStr);

  if (isNaN(result)) {
    throw new Error(`Invalid number '${numberStr}' at index ${start}`);
  }

  return result;
};

/**
 * This function parses the literal in the text. It is used to determine
 * if the text is a boolean or null.
 *
 * @param context
 *     The context of the parser.
 */
const parseLiteral = (context: ParseContext): boolean | null => {
  if (context.text.substring(context.index, context.index + 4) === 'true') {
    context.index += 4;
    return true;
  }

  if (context.text.substring(context.index, context.index + 5) === 'false') {
    context.index += 5;
    return false;
  }

  if (context.text.substring(context.index, context.index + 4) === 'null') {
    context.index += 4;
    return null;
  }

  throw new Error(`Invalid literal at index ${context.index}`);
};

// Export additional utility functions
export const extractAllJsonFromText = extractJsonFromText;
export const parseJsonString = parseJsonStringInternal;
export default jsonParser;
