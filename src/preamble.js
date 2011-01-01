// === Auto-generated preamble library stuff ===

{{RUNTIME}}

function __globalConstructor__() {
}

// Maps ints ==> functions. This lets us pass around ints, which are
// actually pointers to functions, and we convert at call()time
var FUNCTION_TABLE = [];

var __THREW__ = false; // Used in checking for thrown exceptions.

var __ATEXIT__ = [];

#if SAFE_HEAP

// Semi-manual memory corruption debugging
var HEAP_WATCHED = {};
var HEAP_HISTORY = {};
function SAFE_HEAP_CLEAR(dest) {
  HEAP_HISTORY[dest] = [];
}
var SAFE_HEAP_ERRORS = 0;
var ACCEPTABLE_SAFE_HEAP_ERRORS = 0;
function SAFE_HEAP_ACCESS(dest, type, store) {
#if SAFE_HEAP_LOG
  //if (dest === A_NUMBER) print (new Error().stack); // Something like this may be useful, in debugging
#endif
  if (type && type[type.length-1] == '*') type = 'i32'; // pointers are ints, for our purposes here
  // Note that this will pass even with unions: You can store X, load X, then store Y and load Y.
  // You cannot, however, do the nonportable act of store X and load Y!
  if (store) {
    HEAP_HISTORY[dest] = type; // [{ type: type, stack: new Error().stack }]; // |stack| is useful for debugging. Also uncomment the lines later down
  } else {
    if (!HEAP[dest] && HEAP[dest] !== 0 && HEAP[dest] !== false) { // false can be the result of a mathop comparator
      throw('Warning: Reading an invalid value at ' + dest + ' :: ' + new Error().stack + '\n');
    }
    if (type === null) return;
    var history = HEAP_HISTORY[dest];
    if (history === null) return;
    assert(history, 'Must have a history for a safe heap load! ' + dest + ':' + type); // Warning - bit fields in C structs cause loads+stores for each store, so
                                                                                       //           they will show up here...
//    assert((history && history[0]) /* || HEAP[dest] === 0 */, "Loading from where there was no store! " + dest + ',' + HEAP[dest] + ',' + type + ', \n\n' + new Error().stack + '\n');
//    if (history[0].type !== type) {
    if (history !== type) {
      print('Load-store consistency assumption failure! ' + dest);
      print('\n');
      print(JSON.stringify(history));
      print('\n');
      print('LOAD: ' + type + ', ' + new Error().stack);
      print('\n');
      SAFE_HEAP_ERRORS++;
      assert(SAFE_HEAP_ERRORS <= ACCEPTABLE_SAFE_HEAP_ERRORS, 'Load-store consistency assumption failure!');
    }
  }
}
function SAFE_HEAP_STORE(dest, value, type) {
#if SAFE_HEAP_LOG
  print('store: ' + dest + ' [' + type + '] |' + value + '|');
#endif
  if (!value && value !== 0 && value !== false) { // false can be the result of a mathop comparator
    throw('Warning: Writing an invalid value of ' + JSON.stringify(value) + ' at ' + dest + ' :: ' + new Error().stack + '\n');
  }
  SAFE_HEAP_ACCESS(dest, type, true);
  if (dest in HEAP_WATCHED) {
    print((new Error()).stack);
    throw "Bad store!" + dest;
  }
  if (type === null) {
    IHEAP[dest] = value;
    FHEAP[dest] = value;
  } else if (type in Runtime.FLOAT_TYPES) {
    FHEAP[dest] = value;
  } else {
    IHEAP[dest] = value;
  }
}
function SAFE_HEAP_LOAD(dest, type) {
#if SAFE_HEAP_LOG
  print('load : ' + dest + ' [' + type + '] |' + JSON.stringify([IHEAP[dest],FHEAP[dest]]) + '|');
#endif
  SAFE_HEAP_ACCESS(dest, type);
  if (type in Runtime.FLOAT_TYPES) {
    return FHEAP[dest];
  } else {
    return IHEAP[dest];
  }
}
function __Z16PROTECT_HEAPADDRPv(dest) {
  HEAP_WATCHED[dest] = true;
}
function __Z18UNPROTECT_HEAPADDRPv(dest) {
  delete HEAP_WATCHED[dest];
}
//==========================================
#endif

#if CHECK_OVERFLOWS
function CHECK_OVERFLOW(value, bits) {
  assert(value !== Infinity && value !== -Infinity, 'Infinity!');
  assert(Math.abs(value) < Math.pow(2, bits-1), 'Overflow!');
  return value;
}
#endif

#if LABEL_DEBUG
var INDENT = '';
#endif

#if EXECUTION_TIMEOUT
var START_TIME = Date.now();
#endif

var ABORT = false;

var undef = 0;

function abort(text) {
  print(text + ':\n' + (new Error).stack);
  ABORT = true;
  throw "Assertion: " + text;
}

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

// Creates a pointer for a certain slab and a certain address in that slab.
// If just a slab is given, will allocate room for it and copy it there. In
// other words, do whatever is necessary in order to return a pointer, that
// points to the slab (and possibly position) we are given.

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed

function Pointer_make(slab, pos, allocator) {
  pos = pos ? pos : 0;
  assert(pos === 0); // TODO: remove 'pos'
  if (slab === HEAP) return pos;
  var size = slab.length;

  var i;
  for (i = 0; i < size; i++) {
    if (slab[i] === undefined) {
      throw 'Invalid element in slab at ' + new Error().stack; // This can be caught, and you can try again to allocate later, see globalFuncs in run()
    }
  }

  // Finalize
  var ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc][allocator ? allocator : ALLOC_STATIC](Math.max(size, 1));

  for (i = 0; i < size; i++) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    {{{ makeSetValue(0, 'ret+i', 'curr', 'null') }}}
  }

  return ret;
}
Module['Pointer_make'] = Pointer_make;

function Pointer_stringify(ptr) {
  var ret = "";
  var i = 0;
  var t;
  while (1) {
    t = String.fromCharCode({{{ makeGetValue('ptr', 'i', 'i8') }}});
    if (t == "\0") { break; } else {}
    ret += t;
    i += 1;
  }
  return ret;
}

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return Math.ceil(x/PAGE_SIZE)*PAGE_SIZE;
}

var HEAP, IHEAP, FHEAP;
var STACK_ROOT, STACKTOP, STACK_MAX;
var STATICTOP;

// Mangled |new| and |free| (various manglings, for int, long params; new and new[], etc.
var _malloc, _calloc, _free, __Znwj, __Znaj, __Znam, __Znwm, __ZdlPv, __ZdaPv;

var HAS_TYPED_ARRAYS = false;
var TOTAL_MEMORY = 50*1024*1024;

function __initializeRuntime__() {
  // If we don't have malloc/free implemented, use a simple implementation.
  Module['_malloc'] = _malloc = __Znwj = __Znaj = __Znam = __Znwm = Module['_malloc'] ? Module['_malloc'] : Runtime.staticAlloc;
  Module['_calloc'] = _calloc                                     = Module['_calloc'] ? Module['_calloc'] : function(n, s) { return _malloc(n*s) };
  Module['_free']   = _free = __ZdlPv = __ZdaPv                   = Module['_free']   ? Module['_free']   : function() { };

#if USE_TYPED_ARRAYS
  // TODO: Remove one of the 3 heaps!
  HAS_TYPED_ARRAYS = this['Int32Array'] && this['Float64Array']; // check for engine support
  if (HAS_TYPED_ARRAYS) {
    HEAP = IHEAP = new Int32Array(TOTAL_MEMORY);
    FHEAP = new Float64Array(TOTAL_MEMORY);
  } else
#endif
  {
    // Without this optimization, Chrome is slow. Sadly, the constant here needs to be tweaked depending on the code being run...
    var FAST_MEMORY = TOTAL_MEMORY/32;
    IHEAP = FHEAP = HEAP = new Array(FAST_MEMORY);
    for (var i = 0; i < FAST_MEMORY; i++) {
      IHEAP[i] = FHEAP[i] = 0; // We do *not* use {{{ makeSetValue(0, 'i', 0, 'null') }}} here, since this is done just to optimize runtime speed
    }
  }

  var base = intArrayFromString('(null)').concat(0); // So printing %s of NULL gives '(null)'
                                                     // Also this ensures we leave 0 as an invalid address, 'NULL'
  for (var i = 0; i < base.length; i++) {
    {{{ makeSetValue(0, 'i', 'base[i]', 'i8') }}}
  }

  Module['HEAP'] = HEAP;
  Module['IHEAP'] = IHEAP;
  Module['FHEAP'] = FHEAP;

  STACK_ROOT = STACKTOP = alignMemoryPage(10);
  if (!this['TOTAL_STACK']) TOTAL_STACK = 1024*1024; // Reserved room for stack
  STACK_MAX = STACK_ROOT + TOTAL_STACK;

  STATICTOP = alignMemoryPage(STACK_MAX);
}

function __shutdownRuntime__() {
  while( __ATEXIT__.length > 0) {
    var func = __ATEXIT__.pop();
    if (typeof func === 'number') {
      func = FUNCTION_TABLE[func];
    }
    func();
  }
}

// stdio.h

function __formatString() {
  function isFloatArg(type) {
    return String.fromCharCode(type) in Runtime.set('f', 'e', 'g');
  }
  var cStyle = false;
  var textIndex = arguments[0];
  var argIndex = 1;
  if (textIndex < 0) {
    cStyle = true;
    textIndex = -textIndex;
    slab = null;
    argIndex = arguments[1];
  } else {
    var _arguments = arguments;
  }
  function getNextArg(type) {
    var ret;
    if (!cStyle) {
      ret = _arguments[argIndex];
      argIndex++;
    } else {
      if (isFloatArg(type)) {
        ret = {{{ makeGetValue(0, 'argIndex', 'double') }}};
      } else {
        ret = {{{ makeGetValue(0, 'argIndex', 'i32') }}};
      }
      argIndex += type === 'l'.charCodeAt(0) ? 8 : 4; // XXX hardcoded native sizes
    }
    return ret;
  }

  var ret = [];
  var curr, next, currArg;
  while(1) {
    curr = {{{ makeGetValue(0, 'textIndex', 'i8') }}};
    if (curr === 0) break;
    next = {{{ makeGetValue(0, 'textIndex+1', 'i8') }}};
    if (curr == '%'.charCodeAt(0)) {
      // Handle very very simply formatting, namely only %.X[f|d|u|etc.]
      var precision = -1;
      if (next == '.'.charCodeAt(0)) {
        textIndex++;
        precision = 0;
        while(1) {
          var precisionChr = {{{ makeGetValue(0, 'textIndex+1', 'i8') }}};
          if (!(precisionChr >= '0'.charCodeAt(0) && precisionChr <= '9'.charCodeAt(0))) break;
          precision *= 10;
          precision += precisionChr - '0'.charCodeAt(0);
          textIndex++;
        }
        next = {{{ makeGetValue(0, 'textIndex+1', 'i8') }}};
      }
      if (next == 'l'.charCodeAt(0)) {
        textIndex++;
        next = {{{ makeGetValue(0, 'textIndex+1', 'i8') }}};
      }
      if (isFloatArg(next)) {
        next = 'f'.charCodeAt(0); // no support for 'e'
      }
      if (['d', 'i', 'u', 'p', 'f'].indexOf(String.fromCharCode(next)) != -1) {
        var currArg;
        var argText;
        currArg = getNextArg(next);
        argText = String(+currArg); // +: boolean=>int
        if (next == 'u'.charCodeAt(0)) {
          argText = String(unSign(currArg, 32));
        } else if (next == 'p'.charCodeAt(0)) {
          argText = '0x' + currArg.toString(16);
        } else {
          argText = String(+currArg); // +: boolean=>int
        }
        if (precision >= 0) {
          if (isFloatArg(next)) {
            var dotIndex = argText.indexOf('.');
            if (dotIndex == -1 && next == 'f'.charCodeAt(0)) {
              dotIndex = argText.length;
              argText += '.';
            }
            argText += '00000000000'; // padding
            argText = argText.substr(0, dotIndex+1+precision);
          } else {
            while (argText.length < precision) {
              argText = '0' + argText;
            }
          }
        }
        argText.split('').forEach(function(chr) {
          ret.push(chr.charCodeAt(0));
        });
        textIndex += 2;
      } else if (next == 's'.charCodeAt(0)) {
        ret = ret.concat(String_copy(getNextArg(next)));
        textIndex += 2;
      } else if (next == 'c'.charCodeAt(0)) {
        ret = ret.concat(getNextArg(next));
        textIndex += 2;
      } else {
        ret.push(next);
        textIndex += 2; // not sure what to do with this %, so print it
      }
    } else {
      ret.push(curr);
      textIndex += 1;
    }
  }
  return Pointer_make(ret.concat(0), 0, ALLOC_STACK); // NB: Stored on the stack
}

// Copies a list of num items on the HEAP into a
// a normal JavaScript array of numbers
function Array_copy(ptr, num) {
  // TODO: In the SAFE_HEAP case, do some reading here, for debugging purposes - currently this is an 'unnoticed read'.
#if USE_TYPED_ARRAYS
  return Array.prototype.slice.call(IHEAP.slice(ptr, ptr+num)); // Make a normal array out of the typed one
                                                                // Consider making a typed array here, for speed?
#else
  return IHEAP.slice(ptr, ptr+num);
#endif
}

// Copies a C-style string, terminated by a zero, from the HEAP into
// a normal JavaScript array of numbers
function String_copy(ptr, addZero) {
  return Array_copy(ptr, _strlen(ptr)).concat(addZero ? [0] : []);
}

// stdlib.h

// Get a pointer, return int value of the string it points to
function _atoi(s) {
  return Math.floor(Number(Pointer_stringify(s)));
}

function _llvm_memcpy_i32(dest, src, num, idunno) {
  var curr;
  for (var i = 0; i < num; i++) {
    // TODO: optimize for the typed arrays case
    // || 0, since memcpy sometimes copies uninitialized areas XXX: Investigate why initializing alloc'ed memory does not fix that too
    {{{ makeCopyValue('dest', 'i', 'src', 'i', 'null', ' || 0') }}};
  }
}
_memcpy = _llvm_memcpy_i64 = _llvm_memcpy_p0i8_p0i8_i32 = _llvm_memcpy_p0i8_p0i8_i64 = _llvm_memcpy_i32;

function _llvm_memmove_i32(dest, src, num, idunno) {
  // not optimized!
  if (num === 0) return; // will confuse malloc if 0
  var tmp = _malloc(num);
  _memcpy(tmp, src, num);
  _memcpy(dest, tmp, num);
  _free(tmp);
}
_memmove = _llvm_memmove_i64 = _llvm_memmove_p0i8_p0i8_i32 = _llvm_memmove_p0i8_p0i8_i64 = _llvm_memmove_i32;

function llvm_memset_i32(ptr, value, num) {
  for (var i = 0; i < num; i++) {
    {{{ makeSetValue('ptr', 'i', 'value', 'null') }}}
  }
}
_memset = _llvm_memset_p0i8_i64 = _llvm_memset_p0i8_i32 = llvm_memset_i32;

function _strlen(ptr) {
  var i = 0;
  while ({{{ makeGetValue('ptr', 'i', 'i8') }}}) i++; // Note: should be |!= 0|, technically. But this helps catch bugs with undefineds
  return i;
}

// Tools

PRINTBUFFER = '';
function __print__(text) {
  if (text === null) {
    // Flush
    print(PRINTBUFFER);
    PRINTBUFFER = '';
    return;
  }
  // We print only when we see a '\n', as console JS engines always add
  // one anyhow.
  PRINTBUFFER = PRINTBUFFER + text;
  var endIndex;
  while ((endIndex = PRINTBUFFER.indexOf('\n')) != -1) {
    print(PRINTBUFFER.substr(0, endIndex));
    PRINTBUFFER = PRINTBUFFER.substr(endIndex + 1);
  }
}

function jrint(label, obj) { // XXX manual debugging
  if (!obj) {
    obj = label;
    label = '';
  } else
    label = label + ' : ';
  print(label + JSON.stringify(obj));
}

// This processes a 'normal' string into a C-line array of numbers.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy) {
  var ret = [];
  var t;
  var i = 0;
  while (i < stringy.length) {
    ret.push(stringy.charCodeAt(i));
    i = i + 1;
  }
  ret.push(0);
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = '';
  for (var i = 0; i < array.length; i++) {
    ret += String.fromCharCode(array[i]);
  }
  return ret;
}

// Converts a value we have as signed, into an unsigned value. For
// example, -1 in int32 would be a very large number as unsigned.
function unSign(value, bits) {
  if (value >= 0) return value;
  return 2*Math.abs(1 << (bits-1)) + value;
}

// === Body ===

