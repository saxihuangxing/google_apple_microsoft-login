(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],2:[function(require,module,exports){
(function (global){
// https://github.com/maxogden/websocket-stream/blob/48dc3ddf943e5ada668c31ccd94e9186f02fafbd/ws-fallback.js

var ws = null

if (typeof WebSocket !== 'undefined') {
  ws = WebSocket
} else if (typeof MozWebSocket !== 'undefined') {
  ws = MozWebSocket
} else if (typeof global !== 'undefined') {
  ws = global.WebSocket || global.MozWebSocket
} else if (typeof window !== 'undefined') {
  ws = window.WebSocket || window.MozWebSocket
} else if (typeof self !== 'undefined') {
  ws = self.WebSocket || self.MozWebSocket
}

module.exports = ws

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
const Janus = require('./src/Janus')
const JanusAdmin = require('./src/JanusAdmin')
const JanusPlugin = require('./src/JanusPlugin')
const VideoRoom = require('./src/plugin/VideoRoom')
const VideoRoomPublisher = require('./src/plugin/VideoRoomPublisher')
const VideoRoomSubscriber = require('./src/plugin/VideoRoomSubscriber')
const VideoRoomAdmin = require('./src/plugin/VideoRoomAdmin')
const { JanusConfig, JanusAdminConfig, JanusRoomConfig } = require('./src/Config')

module.exports = {
  Janus,
  JanusAdmin,
  JanusPlugin,
  VideoRoom,
  VideoRoomPublisher,
  VideoRoomSubscriber,
  VideoRoomAdmin,
  JanusConfig,
  JanusAdminConfig,
  JanusRoomConfig
}

},{"./src/Config":4,"./src/Janus":5,"./src/JanusAdmin":6,"./src/JanusPlugin":7,"./src/plugin/VideoRoom":10,"./src/plugin/VideoRoomAdmin":11,"./src/plugin/VideoRoomPublisher":12,"./src/plugin/VideoRoomSubscriber":13}],4:[function(require,module,exports){
class JanusConfig {
  constructor (config) {
    const {
      url,
      keepAliveIntervalMs,
      options
    } = config

    this.url = url
    this.keepAliveIntervalMs = keepAliveIntervalMs
    this.options = options
  }
}

class JanusAdminConfig extends JanusConfig {
  constructor (config) {
    super(config)
    const {
      secret,
      sessionListIntervalMs
    } = config

    this.secret = secret
    this.sessionListIntervalMs = sessionListIntervalMs
  }
}

class JanusRoomConfig {
  constructor (config) {
    const {
      id,
      codec,
      record,
      videoOrientExt,
      bitrate,
      firSeconds,
      publishers,
      recordDirectory
    } = config

    this.id = id
    this.codec = codec
    this.record = record
    this.videoOrientExt = videoOrientExt
    this.bitrate = bitrate
    this.firSeconds = firSeconds
    this.publishers = publishers
    this.recordDirectory = recordDirectory
  }
}

module.exports.JanusConfig = JanusConfig
module.exports.JanusAdminConfig = JanusAdminConfig
module.exports.JanusRoomConfig = JanusRoomConfig

},{}],5:[function(require,module,exports){
const WebSocket = require('isomorphic-ws')
const JanusPlugin = require('./JanusPlugin')
const uuid = require('uuid/v4')

const ignoredErrorCodes = [
  458, // JANUS_ERROR_SESSION_NOT_FOUND
  459 // JANUS_ERROR_HANDLE_NOT_FOUND
]

class Janus {
  constructor (config, logger) {
    this.ws = undefined
    this.isConnected = false
    this.sessionId = undefined
    this.logger = logger

    this.transactions = {}
    this.pluginHandles = {}

    this.config = config
    this.protocol = 'janus-protocol'
    this.sendCreate = true
  }

  connect () {
    if (this.isConnected) {
      return Promise.resolve(this)
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.url, this.protocol, this.config.options)

      this.ws.addEventListener('error', (err) => {
        this.logger.error('Error connecting to the Janus WebSockets server...', err)
        this.isConnected = false
        reject(err)
      })

      this.ws.addEventListener('close', () => { this.cleanup() })

      this.ws.addEventListener('open', () => {
        if (!this.sendCreate) {
          this.isConnected = true
          this.keepAlive(true)
          return resolve(this)
        }

        const transaction = uuid()
        const request = { janus: 'create', transaction }

        this.transactions[transaction] = {
          resolve: (json) => {
            if (json.janus !== 'success') {
              this.logger.error('Cannot connect to Janus', json)
              reject(json)
              return
            }

            this.sessionId = json.data.id
            this.isConnected = true
            this.keepAlive(true)

            this.logger.debug('Janus connected, sessionId: ', this.sessionId)

            resolve(this)
          },
          reject,
          replyType: 'success'
        }

        this.ws.send(JSON.stringify(request))
      })

      this.ws.addEventListener('message', (event) => { this.onMessage(event) })
      this.ws.addEventListener('close', () => { this.onClose() })
    })
  }

  /**
   *
   * @param {JanusPlugin} plugin
   * @return {Promise}
   * */
  addPlugin (plugin) {
    if (!(plugin instanceof JanusPlugin)) {
      return Promise.reject(new Error('plugin is not a JanusPlugin'))
    }

    const request = plugin.getAttachPayload()

    return this.transaction('attach', request, 'success').then((json) => {
      if (json.janus !== 'success') {
        this.logger.error('Cannot add plugin', json)
        plugin.error(json)
        throw new Error(json)
      }

      this.pluginHandles[json.data.id] = plugin

      return plugin.success(this, json.data.id)
    })
  }

  transaction (type, payload, replyType, timeoutMs) {
    if (!replyType) {
      replyType = 'ack'
    }
    const transactionId = uuid()

    return new Promise((resolve, reject) => {
      if (timeoutMs) {
        setTimeout(() => {
          reject(new Error('Transaction timed out after ' + timeoutMs + ' ms'))
        }, timeoutMs)
      }

      if (!this.isConnected) {
        reject(new Error('Janus is not connected'))
        return
      }

      const request = Object.assign({}, payload, {
        janus: type,
        session_id: (payload && parseInt(payload.session_id, 10)) || this.sessionId,
        transaction: transactionId
      })

      this.transactions[request.transaction] = { resolve, reject, replyType, request }
      this.ws.send(JSON.stringify(request))
    })
  }

  send (type, payload) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Janus is not connected'))
        return
      }

      const request = Object.assign({}, payload, {
        janus: type,
        session_id: this.sessionId,
        transaction: uuid()
      })

      this.logger.debug('Janus sending', request)
      this.ws.send(JSON.stringify(request), {}, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  destroy () {
    if (!this.isConnected) {
      return Promise.resolve()
    }

    return this.transaction('destroy', {}, 'success', 5000).then(() => {
      this.cleanup()
    }).catch(() => {
      this.cleanup()
    })
  }

  destroyPlugin (plugin) {
    return new Promise((resolve, reject) => {
      if (!(plugin instanceof JanusPlugin)) {
        reject(new Error('plugin is not a JanusPlugin'))
        return
      }

      if (!this.pluginHandles[plugin.janusHandleId]) {
        reject(new Error('unknown plugin'))
        return
      }

      this.transaction('detach', { plugin: plugin.pluginName, handle_id: plugin.janusHandleId }, 'success', 5000).then(() => {
        delete this.pluginHandles[plugin.pluginName]
        plugin.detach()

        resolve()
      }).catch((err) => {
        delete this.pluginHandles[plugin.pluginName]
        plugin.detach()

        reject(err)
      })
    })
  }

  onMessage (messageEvent) {
    let json
    try {
      json = JSON.parse(messageEvent.data)
    } catch (err) {
      this.logger.error('cannot parse message', messageEvent.data)
      return
    }

    // this.logger.debug('JANUS GOT', json)
    if (json.janus === 'timeout' && json.session_id !== this.sessionId) {
      this.logger.debug('GOT timeout from another websocket') // seems like a bug in janus timeout handler :)
      return
    }

    if (json.janus === 'keepalive') { // Do nothing
      return
    }

    if (json.janus === 'ack') { // Just an ack, we can probably ignore
      const transaction = this.getTransaction(json)
      if (transaction && transaction.resolve) {
        transaction.resolve(json)
      }
      return
    }

    if (json.janus === 'success') { // Success!
      const transaction = this.getTransaction(json)
      if (!transaction) {
        return
      }

      const pluginData = json.plugindata
      if (pluginData === undefined || pluginData === null) {
        transaction.resolve(json)
        return
      }

      const sender = json.sender
      if (!sender) {
        transaction.resolve(json)
        this.logger.error('Missing sender for plugindata', json)
        return
      }

      const pluginHandle = this.pluginHandles[sender]
      if (!pluginHandle) {
        this.logger.error('This handle is not attached to this session', json)
        return
      }

      transaction.resolve({ data: pluginData.data, json })
      return
    }

    if (json.janus === 'webrtcup') { // The PeerConnection with the gateway is up! Notify this
      const sender = json.sender
      if (!sender) {
        this.logger.warn('Missing sender...')
        return
      }
      const pluginHandle = this.pluginHandles[sender]
      if (!pluginHandle) {
        this.logger.error('This handle is not attached to this session', sender)
        return
      }
      pluginHandle.webrtcState(true)
      return
    }

    if (json.janus === 'hangup') { // A plugin asked the core to hangup a PeerConnection on one of our handles
      const sender = json.sender
      if (!sender) {
        this.logger.warn('Missing sender...')
        return
      }
      const pluginHandle = this.pluginHandles[sender]
      if (!pluginHandle) {
        this.logger.error('This handle is not attached to this session', sender)
        return
      }
      pluginHandle.webrtcState(false, json.reason)
      pluginHandle.hangup()
      return
    }

    if (json.janus === 'detached') { // A plugin asked the core to detach one of our handles
      const sender = json.sender
      if (!sender) {
        this.logger.warn('Missing sender...')
        return
      }
      return
    }

    if (json.janus === 'media') { // Media started/stopped flowing
      const sender = json.sender
      if (!sender) {
        this.logger.warn('Missing sender...')
        return
      }
      const pluginHandle = this.pluginHandles[sender]
      if (!pluginHandle) {
        this.logger.error('This handle is not attached to this session', sender)
        return
      }
      pluginHandle.mediaState(json.type, json.receiving)
      return
    }

    if (json.janus === 'slowlink') { // Trouble uplink or downlink
      this.logger.debug('Got a slowlink event on session ' + this.sessionId)
      this.logger.debug(json)
      const sender = json.sender
      if (!sender) {
        this.logger.warn('Missing sender...')
        return
      }
      const pluginHandle = this.pluginHandles[sender]
      if (!pluginHandle) {
        this.logger.error('This handle is not attached to this session', sender)
        return
      }
      pluginHandle.slowLink(json.uplink, json.nacks)
      return
    }

    if (json.janus === 'error') { // Oops, something wrong happened
      if (json.error && json.error.code && !ignoredErrorCodes.includes(json.error.code)) {
        this.logger.error('Janus error response' + JSON.stringify(json, null, 2))
      }

      const transaction = this.getTransaction(json, true)
      if (transaction && transaction.reject) {
        if (transaction.request) {
          this.logger.debug('Janus Error: rejecting transaction', transaction.request, json)
        }
        transaction.reject(json)
      }
      return
    }

    if (json.janus === 'event') {
      const sender = json.sender
      if (!sender) {
        this.logger.warn('Missing sender...')
        return
      }
      const pluginData = json.plugindata
      if (pluginData === undefined || pluginData === null) {
        this.logger.error('Missing plugindata...')
        return
      }

      const pluginHandle = this.pluginHandles[sender]
      if (!pluginHandle) {
        this.logger.error('This handle is not attached to this session', sender)
        return
      }

      const data = pluginData.data
      const transaction = this.getTransaction(json)
      if (transaction) {
        if (data.error_code) {
          transaction.reject({ data, json })
        } else {
          transaction.resolve({ data, json })
        }
        return
      }

      pluginHandle.onmessage(data, json)
      return
    }

    this.logger.warn('Unknown message/event ' + json.janus + ' on session ' + this.sessionId)
    this.logger.debug(json)
  }

  onClose () {
    if (!this.isConnected) {
      return
    }

    this.isConnected = false
    this.logger.error('Lost connection to the gateway (is it down?)')
  }

  keepAlive (isScheduled) {
    if (!this.ws || !this.isConnected || !this.sessionId) {
      return
    }

    if (isScheduled) {
      setTimeout(() => { this.keepAlive() }, this.config.keepAliveIntervalMs)
    } else {
      // logger.debug('Sending Janus keepalive')
      this.transaction('keepalive').then(() => {
        setTimeout(() => { this.keepAlive() }, this.config.keepAliveIntervalMs)
      }).catch((err) => {
        this.logger.warn('Janus keepalive error', err)
      })
    }
  }

  getTransaction (json, ignoreReplyType = false) {
    const type = json.janus
    const transactionId = json.transaction
    if (
      transactionId &&
      Object.prototype.hasOwnProperty.call(this.transactions, transactionId) &&
      (ignoreReplyType || this.transactions[transactionId].replyType === type)
    ) {
      const ret = this.transactions[transactionId]
      delete this.transactions[transactionId]
      return ret
    }
  }

  cleanup () {
    this._cleanupPlugins()
    this._cleanupWebSocket()
    this._cleanupTransactions()
  }

  _cleanupWebSocket () {
    if (this.ws) {
      if (this.ws.removeAllListeners) {
        this.ws.removeAllListeners()
      }
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close()
      }
    }
    this.ws = undefined
    this.isConnected = false
  }

  _cleanupPlugins () {
    Object.keys(this.pluginHandles).forEach((pluginId) => {
      const plugin = this.pluginHandles[pluginId]
      delete this.pluginHandles[pluginId]
      plugin.detach()
    })
  }

  _cleanupTransactions () {
    Object.keys(this.transactions).forEach((transactionId) => {
      const transaction = this.transactions[transactionId]
      if (transaction.reject) {
        transaction.reject()
      }
    })
    this.transactions = {}
  }
}

module.exports = Janus

},{"./JanusPlugin":7,"isomorphic-ws":2,"uuid/v4":18}],6:[function(require,module,exports){
const Janus = require('./Janus')

class JanusAdmin extends Janus {
  /**
   *
   * @param config
   * @param logger
   */
  constructor (config, logger) {
    super(config, logger)
    this.config = config
    this.protocol = 'janus-admin-protocol'
    this.sendCreate = false
  }

  transaction (type, payload, replyType) {
    const msg = Object.assign({}, payload, {
      admin_secret: this.config.secret
    })
    return super.transaction(type, msg, replyType || 'success')
  }

  listSessions () {
    return this.transaction('list_sessions').then(r => r.sessions)
  }

  listHandles (sessionId) {
    return this.transaction('list_handles', {
      session_id: sessionId
    }).then(r => r.handles)
  }

  handleInfo (sessionId, handleId) {
    return this.transaction('handle_info', {
      session_id: sessionId,
      handle_id: handleId
    }).then(r => r.info)
  }
}

module.exports = JanusAdmin

},{"./Janus":5}],7:[function(require,module,exports){
const uuid = require('uuid/v4')
const EventEmitter = require('events')

class JanusPlugin extends EventEmitter {
  constructor (logger) {
    super()
    this.id = uuid()
    /** @var Janus */
    this.janus = undefined
    this.janusHandleId = undefined
    this.pluginName = undefined
    this.logger = logger
  }

  getAttachPayload () {
    return { plugin: this.pluginName, opaque_id: this.id }
  }

  transaction (message, additionalFields, replyType) {
    const payload = Object.assign({}, additionalFields, { handle_id: this.janusHandleId })

    if (!this.janus) {
      return Promise.reject(new Error('JanusPlugin is not connected'))
    }

    return this.janus.transaction(message, payload, replyType)
  }

  success (janus, janusHandleId) {
    this.janus = janus
    this.janusHandleId = janusHandleId

    return this
  }

  error (cause) {
    // Couldn't attach to the plugin
  }

  onmessage (data, json) {
    this.logger.error('Unhandled message from janus in a plugin: ' + this.constructor.name, data, json)
  }

  oncleanup () {
    // PeerConnection with the plugin closed, clean the UI
    // The plugin handle is still valid so we can create a new one
  }

  detached () {
    // Connection with the plugin closed, get rid of its features
    // The plugin handle is not valid anymore
  }

  hangup () {
    this.emit('hangup')
  }

  slowLink () {
    this.emit('slowlink')
  }

  mediaState (medium, on) {
    this.emit('mediaState', medium, on)
  }

  webrtcState (isReady, cause) {
    this.emit('webrtcState', isReady, cause)
  }

  destroy () {
    this.hangup();

    this.janus.destroyPlugin(this).catch((error) => {
      this.logger.error('VideoRoom, destroyPlugin error', error);
      throw error;
    })
  }

  detach () {
    this.removeAllListeners();
    this.janus = null;
  }
}

module.exports = JanusPlugin

},{"events":1,"uuid/v4":18}],8:[function(require,module,exports){
const SDPUtils = require('sdp')

class SdpHelper {
  constructor (logger) {
    this.logger = logger
  }

  /**
   * @param sdp string
   * @param allowedProfiles array[]|string|Regexp
   */
  filterH264Profiles (sdp, allowedProfiles) {
    const sections = SDPUtils.splitSections(sdp)

    const ret = []
    for (const section of sections) {
      if (SDPUtils.getMid(section) === 'video') {
        const newSection = []
        const lines = SDPUtils.splitLines(section)
        const rtpSections = [[]]
        let i = 0

        for (const line of lines) {
          if (line.indexOf('a=rtpmap:') === 0) {
            rtpSections.push([])
            i++
          }
          rtpSections[i].push(line)
        }

        rtpSections[0].map(l => newSection.push(l))
        for (let j = 1; j < rtpSections.length; j++) {
          const rtpSection = rtpSections[j]
          const parsed = SDPUtils.parseRtpMap(rtpSection[0])

          if (parsed && parsed.name === 'H264') {
            const fmtp = rtpSection.filter(l => l.indexOf('a=fmtp:') === 0).shift()

            let isAllowed = false
            if (Array.isArray(allowedProfiles)) {
              for (const allowedProfile of allowedProfiles) {
                isAllowed = isAllowed || fmtp.indexOf('profile-level-id=' + allowedProfile) !== -1
              }
            } else if (typeof allowedProfiles === 'string') {
              isAllowed = fmtp.indexOf('profile-level-id=' + allowedProfiles) !== -1
            } else if (allowedProfiles instanceof RegExp) {
              isAllowed = allowedProfiles.test(fmtp)
            }

            if (isAllowed) {
              rtpSections[j].map(l => newSection.push(l))
            }
          } else {
            rtpSections[j].map(l => newSection.push(l))
          }
        }

        newSection.map(l => ret.push(l))
      } else {
        SDPUtils.splitLines(section).map(l => ret.push(l))
      }
    }

    return ret.join('\r\n') + '\r\n'
  }

  filterDirectCandidates (sdp, force = false) {
    const lines = SDPUtils.splitLines(sdp)

    const ret = []
    let haveCandidates = false
    let haveNonDirectCandidates = false
    for (const line of lines) {
      if (line.startsWith('a=candidate')) {
        haveCandidates = true
        if (!this.isDirectCandidate(line)) {
          ret.push(line)
          haveNonDirectCandidates = true
        }
      } else {
        ret.push(line)
      }
    }

    // only remove _all_ candidates if its a forced request
    if (haveCandidates && !haveNonDirectCandidates && !force) {
      this.logger.warn('SDP NO OTHER CANDIDATES THAN DIRECT CANDIDATES', sdp, new Error().stack)
      return sdp
    }

    if (haveCandidates && !haveNonDirectCandidates) {
      this.logger.error('SDP DIRECT CANDIDATES FILTERED OUT BUT NO OTHER CANDIDATES IN SDP', sdp, new Error().stack)
    }

    return ret.join('\r\n') + '\r\n'
  }

  isDirectCandidate (candidateLine) {
    const candidate = SDPUtils.parseCandidate(candidateLine)
    return candidate.type === 'host' || candidate.type === 'srflx' || candidate.tcpType === 'host' || candidate.tcpType === 'srflx'
  }
}

module.exports = SdpHelper

},{"sdp":15}],9:[function(require,module,exports){
const JanusPlugin = require('../JanusPlugin');

class LeaveCapability extends JanusPlugin {
  constructor (logger) {
    super(logger);
  }

  leaveRoom() {
    console.log("Leaving the room");

    const body = { request: 'leave' };

    return this.transaction('message', { body }, 'event')
      .then((response) => {
        console.log(response);
      });
  }
}

module.exports = LeaveCapability;
},{"../JanusPlugin":7}],10:[function(require,module,exports){
const adapter = require('webrtc-adapter');

const VideoRoomPublisher = require('./VideoRoomPublisher');
const VideoRoomSubscriber = require('./VideoRoomSubscriber');

const JanusPlugin = require('../JanusPlugin');
const SdpHelper = require('../SdpHelper');

class VideoRoom extends JanusPlugin {
  constructor (logger, iceConfig, filterDirectCandidates) {
    super(logger);
    this.pluginName = 'janus.plugin.videoroom';

    this.iceConfig = iceConfig;
    this.filterDirectCandidates = !!filterDirectCandidates;

    this.sdpHelper = new SdpHelper(this.logger);
  }

  listRooms () {
    return this.transaction('message', { body: { request: 'list' } }, 'success').then((param) => {
      const { data } = param || {};
      if (!data || !Array.isArray(data.list)) {
        this.logger.error('VideoRoom, could not find rooms list', data);
        throw new Error('VideoRoom, could not find rooms list');
      }

      return data.list;
    }).catch((error) => {
      this.logger.error('VideoRoom, cannot list rooms', error);
      throw error;
    })
  }

  //todo: list participants

  createPublisher () {
    return this.janus.addPlugin(new VideoRoomPublisher(this.logger))
      .then((publisher) => {
        publisher.initialize(this.createPeerConnection(publisher));
        return publisher;
      });
  }

  createSubscriber () {
    return this.janus.addPlugin(new VideoRoomSubscriber(this.logger))
      .then((subscriber) => {
        subscriber.initialize(this.createPeerConnection(subscriber));
        return subscriber;
      });
  }

  createPeerConnection (plugin) {
    const peerConnection = new RTCPeerConnection(this.iceConfig);
    peerConnection.onicecandidate = this.onIceCandidate(plugin);
    return peerConnection;
  }

  submitCandidate (plugin, candidate) {
    if (this.filterDirectCandidates && candidate.candidate &&
      this.sdpHelper.isDirectCandidate(candidate.candidate)) {
      return;
    }

    return plugin.transaction('trickle', { candidate });
  }

  onIceCandidate(plugin) {
    return (event) => {
      if (!event.candidate || !event.candidate.candidate) {
        this.submitCandidate(plugin, {completed: true});
      } else {
        const candidate = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        }
        this.submitCandidate(plugin, candidate);
      }
    };
  }
}

module.exports = VideoRoom;

},{"../JanusPlugin":7,"../SdpHelper":8,"./VideoRoomPublisher":12,"./VideoRoomSubscriber":13,"webrtc-adapter":19}],11:[function(require,module,exports){
const JanusPlugin = require('../JanusPlugin');

class VideoRoomAdmin extends JanusPlugin {
  constructor (config, logger) {
    if (!config) {
      throw new Error('unknown config');
    }

    super(logger);
    this.pluginName = 'janus.plugin.videoroom';
    this.config = config;
  }

  createRoom (description, hidden = false, recording = false, pin = null, secret = null) {
    console.log("Creating new room:");
    console.log(`\tdescription=${description}`);
    console.log(`\thidden=${hidden}, recording=${recording}`);
    console.log(`\tpin=${pin}, secret=${secret}`);
    const body = {
      request: "create",
      description: description,
      record: recording,
      videocodec: this.config.codec,
      publishers: this.config.publishers,
      videoorient_ext: this.config.videoOrientExt
    };

    if (recording) {
      body.rec_dir = this.config.recordDirectory;
    }
    if (hidden) {
      body.is_private = hidden;
    }
    if (secret) {
      //password used for modifying/destroying the room
      body.secret = secret;
    }
    if (pin) {
      //password used for joining the room
      body.pin = pin;
    }

    if (this.config.bitrate) {
      body.bitrate = this.config.bitrate;
    }
    if (this.config.firSeconds) {
      body.fir_freq = this.config.firSeconds;
    }

    return this.transaction('message', { body }, 'success')
      .then((param) => {
        const { data } = param || {}
        if (!data || !data.room) {
          this.logger.error('VideoRoomJanusPlugin, could not create room', data);
          throw new Error('VideoRoomJanusPlugin, could not create room');
        }

        return data.room;
      }).catch((error) => {
        this.logger.error('VideoRoomJanusPlugin, could not create room', error);
        throw error;
      })
  }

  destroyRoom (id, secret = null) {
    console.log(`Destroying room ${id}`);
    const body = {
      request: "destroy",
      room: id,
      secret: secret
    };

    return this.transaction('message', { body }, 'success')
      .then((param) => {
        const { data } = param || {}
        if (!data || !data.room) {
          this.logger.error('VideoRoomJanusPlugin, could not destroy room', data);
          throw new Error('VideoRoomJanusPlugin, could not destroy room');
        }

        return data.room;
      }).catch((error) => {
        this.logger.error('VideoRoomJanusPlugin, could not destroy room', error);
        throw error;
      })
  }
}

module.exports = VideoRoomAdmin;

},{"../JanusPlugin":7}],12:[function(require,module,exports){
const LeaveCapability = require('./LeaveCapability');

class VideoRoomPublisher extends LeaveCapability {
  constructor (logger) {
    super(logger);
    this.pluginName = 'janus.plugin.videoroom';

    this.roomId = undefined;
    this.memberId = undefined;
    this.privateMemberId = undefined;

    this.offerSdp = undefined;
    this.answerSdp = undefined;
  }

  initialize (peerConnection) {
    this.peerConnection = peerConnection;
  }
  
  joinRoomAndPublish (roomId, displayName, roomPin = null,
      audio = true, video = true, data = true) {
    console.log(`Connecting to the room ${roomId}`);
    this.roomId = roomId;

    const body = {
      request: 'joinandconfigure',
      room: this.roomId,
      ptype: 'publisher',
      display: displayName,
      audio: audio,
      video: video,
      data: data,
    };

    if (roomPin) {
      body.pin = roomPin;
    }
    
    if (data) {
        this.dataChannel = this.peerConnection.createDataChannel("JanusDataChannel", { ordered: false });

        this.dataChannel.onmessage = (event) => {
          console.warn("Received an unexpected message on data channel", event);
        };

        let onDataChannelStateChange = (event) => {
          console.log("Received state change on data channel", event);
        };
        this.dataChannel.onopen = onDataChannelStateChange;
        this.dataChannel.onclose = onDataChannelStateChange;

        this.dataChannel.onerror = (error) => {
          console.error("Got an error on data channel", error);
        };
    }

    return this.peerConnection.createOffer({})
      .then((offer) => {
        console.log("SDP offer initialized");

        return this.peerConnection.setLocalDescription(offer)
          .then(() => {
            console.log('[pub] LocalDescription set', offer);
            const jsep = offer;
            if (this.filterDirectCandidates && jsep.sdp) {
              jsep.sdp = this.sdpHelper.filterDirectCandidates(jsep.sdp);
            }
            this.offerSdp = jsep.sdp;

            return this.transaction('message', { body, jsep }, 'event')
              .then((response) => {
                console.log(response);

                const { data, json } = response || {};
                if (!data || !data.id || !data.private_id || !data.publishers) {
                  this.logger.error('VideoRoom, could not join room', data);
                  throw new Error('VideoRoom, could not join room');
                }
                if (!json.jsep) {
                  throw new Error('Lacking JSEP field in response');
                }

                this.memberId = data.id;
                this.displayName = displayName;
                this.privateMemberId = data.private_id;

                const jsep = json.jsep;
                if (this.filterDirectCandidates && jsep.sdp) {
                  jsep.sdp = this.sdpHelper.filterDirectCandidates(jsep.sdp);
                }
                this.answerSdp = jsep.sdp;

                return this.peerConnection.setRemoteDescription(jsep)
                  .then(() => {
                    console.log("[pub] RemoteDescription set", jsep);

                    this.audioOn = audio;
                    this.videoOn = video;
                    return data.publishers;
                  })
              }).catch((error) => {
                this.logger.error('VideoRoom, error connecting to room', error);
                throw error;
              });
            });
          })
  }

  modifyPublishing (audio = true, video = true, data = true) {
    console.log(`Modifying publishing for member ${this.memberId} in room ${this.roomId}`);

    let configure = {
      request: 'configure',
      video: video,
      audio: audio,
      data: data
    };
    if (this.roomPin) {
      configure.pin = this.roomPin;
    }

    return this.transaction("message", { body: configure }, "event")
      .then((response) => {
        const { data, json } = response || {};

        if (!data || data.configured !== "ok") {
          this.logger.error("VideoRoom configure answer is not \"ok\"", data, json);
          throw new Error("VideoRoom configure answer is not \"ok\"");
        }

        console.log("Publishing modified", response);
        this.audioOn = audio;
        this.videoOn = video;
      }).catch((error) => {
        this.logger.error("VideoRoom, unknown error modifying publishing", error, configure);
        throw error;
      });
  }

  sendData (message){
    if (this.dataChannel) {
      console.log("Sending some data ", message);
      this.dataChannel.send(message);
    } else {
      console.error("Failed to send data over the DataChannel", this.dataChannel);
    }
  }

  stopAudio () {
    if (this.audioOn) {
      console.log("Stopping published audio");
      return this.modifyPublishing(false, this.videoOn);
    } else {
      console.log(`Published audio is already turned off`);
    }
  }

  startAudio () {
    if (!this.audioOn) {
      console.log("Starting published audio");
      return this.modifyPublishing(true, this.videoOn);
    } else {
      console.log(`Published audio is already turned on`);
    }
  }

  stopVideo () {
    if (this.videoOn) {
      console.log("Stopping published video");
      return this.modifyPublishing(this.audioOn, false);
    } else {
      console.log(`Published video is already turned off`);
    }
  }

  startVideo () {
    if (!this.videoOn) {
      console.log("Starting published video");
      return this.modifyPublishing(this.audioOn, true);
    } else {
      console.log(`Video of publisher ${this.publisherId} is already turned on`);
    }
  }

  onmessage (data, json) {
    // TODO data.videoroom === 'destroyed' handling
    // TODO unpublished === 'ok' handling : we are unpublished

    const { videoroom } = data || {};

    if (!data || !videoroom) {
      this.logger.error('VideoRoom got unknown message', json);
      return;
    }

    if (videoroom === 'slow_link') {
      this.logger.debug('VideoRoom got slow_link', data);
      this.slowLink();
      return;
    }

    if (videoroom === 'event') {
      const { room, joining, unpublished, leaving, publishers } = data;
      if (room !== this.roomId) {
        this.logger.error('VideoRoom got unknown roomId', this.roomId, json);
        return;
      }

      if (joining) {
        this.emit('remoteMemberJoined', joining);
      } else if (unpublished) {
        this.emit('remoteMemberUnpublished', unpublished);
      } else if (leaving) {
        this.emit('remoteMemberLeaving', leaving);
      } else if (Array.isArray(publishers)) {
        this.emit('publishersUpdated', publishers);
      } else {
        this.logger.error('VideoRoom got unknown event', json);
      }

      return;
    }

    this.logger.error('VideoRoom unhandled message:', videoroom, json);
  }
}

module.exports = VideoRoomPublisher;

},{"./LeaveCapability":9}],13:[function(require,module,exports){
const LeaveCapability = require('./LeaveCapability');

class VideoRoomSubscriber extends LeaveCapability {
  constructor (logger) {
    super(logger);
    this.pluginName = "janus.plugin.videoroom";
  }

  initialize (peerConnection) {
    this.peerConnection = peerConnection;
  }

  joinRoomAndSubscribe (roomId, publisherId, roomPin = null, privatePublisherId = null,
      audio = true, video = true, data = true) {
    console.log(`Subscribing to member ${publisherId} in room ${roomId}`);

    this.roomId = roomId;
    this.roomPin = roomPin;
    this.publisherId = publisherId;
    this.privatePublisherId = privatePublisherId;
    this.audio = audio;
    this.video = video;

    let join = {
      request: "join",
      ptype: "subscriber",
      feed: publisherId,
      room: roomId,
      audio: audio,
      video: video,
      data: data,
      offer_video: video,
      offer_audio: audio,
      offer_data: data
    };

    if (roomPin) {
      join.pin = roomPin;
    }
    if (privatePublisherId) {
      join.private_id = privatePublisherId;
    }

    if (data) {
      this.dataChannel = this.peerConnection.createDataChannel("JanusDataChannel", {ordered:false});

      let onDataChannelMessage = (event) => {
        console.log("Received a message on data channel", event);
        this.emit('dataMessage',event.data);
      };
      this.dataChannel.onmessage = onDataChannelMessage.bind(this);

      let onDataChannelStateChange = (event) => {
        console.log("Received state change on data channel", event);
      };
      this.dataChannel.onopen = onDataChannelStateChange;
      this.dataChannel.onclose = onDataChannelStateChange;

      this.dataChannel.onerror = (error) => {
        console.error("Got an error on data channel", error);
      };
    }

    return this.transaction("message", { body: join }, "event")
      .then((response) => {
        const { data, json } = response || {};

        if (!data || data.videoroom !== "attached") {
          this.logger.error("VideoRoom join answer is not \"attached\"", data, json);
          throw new Error("VideoRoom join answer is not \"attached\"");
        }
        if (!json.jsep) {
          this.logger.error("VideoRoom join answer does not contains jsep", data, json);
          throw new Error("VideoRoom join answer does not contains jsep");
        }

        const jsep = json.jsep;
        if (this.filterDirectCandidates && jsep.sdp) {
          jsep.sdp = this.sdpHelper.filterDirectCandidates(jsep.sdp);
        }

        return this.peerConnection.setRemoteDescription(jsep)
          .then(() => {
            console.log("[sub] RemoteDescription set", jsep);
            return this.peerConnection.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
              .then((answer) => {
                return this.peerConnection.setLocalDescription(answer)
                  .then(() => {
                    console.log("[sub] LocalDescription set", answer);

                    const jsep = answer;
                    const body = { request: 'start', room: this.roomId };
                    return this.transaction('message', { body, jsep }, 'event')
                      .then((response) => {
                        const { data, json } = response || {};

                        if (!data || data.started !== 'ok') {
                          this.logger.error('VideoRoom, could not start a stream', data, json);
                          throw new Error('VideoRoom, could not start a stream');
                        }

                        this.audioOn = audio;
                        this.videoOn = video;
                        return data;
                      }).catch((error) => {
                        this.logger.error('VideoRoom, unknown error sending answer', error, jsep);
                        throw error;
                      });
                  });
              });
          });
      }).catch((error) => {
        this.logger.error('VideoRoom, unknown error connecting to room', error, join);
        throw error;
      });
  }

  modifySubscription (audio = true, video = true, data = true) {
    console.log(`Modifying subscription to member ${this.publisherId} in room ${this.roomId}`);

    let configure = {
      request: 'configure',
      ptype: 'subscriber',
      feed: this.publisherId,
      room: this.roomId,
      video: video,
      audio: audio,
      data: data,
      offer_video: video,
      offer_audio: audio,
      offer_data: data
    };
    if (this.roomPin) {
      configure.pin = this.roomPin;
    }
    if (this.privatePublisherId) {
      configure.private_id = this.privatePublisherId;
    }

    return this.transaction("message", { body: configure }, "event")
      .then((response) => {
        const { data, json } = response || {};

        if (!data || data.configured !== "ok") {
          this.logger.error("VideoRoom configure answer is not \"ok\"", data, json);
          throw new Error("VideoRoom configure answer is not \"ok\"");
        }
        console.log("Subscription modified", response);

        this.audioOn = audio;
        this.videoOn = video;
      }).catch((error) => {
        this.logger.error("VideoRoom, unknown error modifying subscription", error, configure);
        throw error;
      });
  }

  stopAudio () {
    if (this.audioOn) {
      console.log(`Stopping audio of publisher ${this.publisherId}`);
      return this.modifySubscription(false, this.videoOn);
    } else {
      console.log(`Audio of publisher ${this.publisherId} is already turned off`);
    }
  }

  startAudio () {
    if (!this.audioOn) {
      console.log(`Starting audio of publisher ${this.publisherId}`);
      return this.modifySubscription(true, this.videoOn);
    } else {
      console.log(`Audio of publisher ${this.publisherId} is already turned on`);
    }
  }

  stopVideo () {
    if (this.videoOn) {
      console.log(`Stopping video of publisher ${this.publisherId}`);
      return this.modifySubscription(this.audioOn, false);
    } else {
      console.log(`Video of publisher ${this.publisherId} is already turned off`);
    }
  }

  startVideo () {
    if (!this.videoOn) {
      console.log(`Starting video of publisher ${this.publisherId}`);
      return this.modifySubscription(this.audioOn, true);
    } else {
      console.log(`Video of publisher ${this.publisherId} is already turned on`);
    }
  }
}

module.exports = VideoRoomSubscriber;

},{"./LeaveCapability":9}],14:[function(require,module,exports){
/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
'use strict';

var SDPUtils = require('sdp');

function fixStatsType(stat) {
  return {
    inboundrtp: 'inbound-rtp',
    outboundrtp: 'outbound-rtp',
    candidatepair: 'candidate-pair',
    localcandidate: 'local-candidate',
    remotecandidate: 'remote-candidate'
  }[stat.type] || stat.type;
}

function writeMediaSection(transceiver, caps, type, stream, dtlsRole) {
  var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

  // Map ICE parameters (ufrag, pwd) to SDP.
  sdp += SDPUtils.writeIceParameters(
      transceiver.iceGatherer.getLocalParameters());

  // Map DTLS parameters to SDP.
  sdp += SDPUtils.writeDtlsParameters(
      transceiver.dtlsTransport.getLocalParameters(),
      type === 'offer' ? 'actpass' : dtlsRole || 'active');

  sdp += 'a=mid:' + transceiver.mid + '\r\n';

  if (transceiver.rtpSender && transceiver.rtpReceiver) {
    sdp += 'a=sendrecv\r\n';
  } else if (transceiver.rtpSender) {
    sdp += 'a=sendonly\r\n';
  } else if (transceiver.rtpReceiver) {
    sdp += 'a=recvonly\r\n';
  } else {
    sdp += 'a=inactive\r\n';
  }

  if (transceiver.rtpSender) {
    var trackId = transceiver.rtpSender._initialTrackId ||
        transceiver.rtpSender.track.id;
    transceiver.rtpSender._initialTrackId = trackId;
    // spec.
    var msid = 'msid:' + (stream ? stream.id : '-') + ' ' +
        trackId + '\r\n';
    sdp += 'a=' + msid;
    // for Chrome. Legacy should no longer be required.
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
        ' ' + msid;

    // RTX
    if (transceiver.sendEncodingParameters[0].rtx) {
      sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
          ' ' + msid;
      sdp += 'a=ssrc-group:FID ' +
          transceiver.sendEncodingParameters[0].ssrc + ' ' +
          transceiver.sendEncodingParameters[0].rtx.ssrc +
          '\r\n';
    }
  }
  // FIXME: this should be written by writeRtpDescription.
  sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
      ' cname:' + SDPUtils.localCName + '\r\n';
  if (transceiver.rtpSender && transceiver.sendEncodingParameters[0].rtx) {
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
        ' cname:' + SDPUtils.localCName + '\r\n';
  }
  return sdp;
}

// Edge does not like
// 1) stun: filtered after 14393 unless ?transport=udp is present
// 2) turn: that does not have all of turn:host:port?transport=udp
// 3) turn: with ipv6 addresses
// 4) turn: occurring muliple times
function filterIceServers(iceServers, edgeVersion) {
  var hasTurn = false;
  iceServers = JSON.parse(JSON.stringify(iceServers));
  return iceServers.filter(function(server) {
    if (server && (server.urls || server.url)) {
      var urls = server.urls || server.url;
      if (server.url && !server.urls) {
        console.warn('RTCIceServer.url is deprecated! Use urls instead.');
      }
      var isString = typeof urls === 'string';
      if (isString) {
        urls = [urls];
      }
      urls = urls.filter(function(url) {
        var validTurn = url.indexOf('turn:') === 0 &&
            url.indexOf('transport=udp') !== -1 &&
            url.indexOf('turn:[') === -1 &&
            !hasTurn;

        if (validTurn) {
          hasTurn = true;
          return true;
        }
        return url.indexOf('stun:') === 0 && edgeVersion >= 14393 &&
            url.indexOf('?transport=udp') === -1;
      });

      delete server.url;
      server.urls = isString ? urls[0] : urls;
      return !!urls.length;
    }
  });
}

// Determines the intersection of local and remote capabilities.
function getCommonCapabilities(localCapabilities, remoteCapabilities) {
  var commonCapabilities = {
    codecs: [],
    headerExtensions: [],
    fecMechanisms: []
  };

  var findCodecByPayloadType = function(pt, codecs) {
    pt = parseInt(pt, 10);
    for (var i = 0; i < codecs.length; i++) {
      if (codecs[i].payloadType === pt ||
          codecs[i].preferredPayloadType === pt) {
        return codecs[i];
      }
    }
  };

  var rtxCapabilityMatches = function(lRtx, rRtx, lCodecs, rCodecs) {
    var lCodec = findCodecByPayloadType(lRtx.parameters.apt, lCodecs);
    var rCodec = findCodecByPayloadType(rRtx.parameters.apt, rCodecs);
    return lCodec && rCodec &&
        lCodec.name.toLowerCase() === rCodec.name.toLowerCase();
  };

  localCapabilities.codecs.forEach(function(lCodec) {
    for (var i = 0; i < remoteCapabilities.codecs.length; i++) {
      var rCodec = remoteCapabilities.codecs[i];
      if (lCodec.name.toLowerCase() === rCodec.name.toLowerCase() &&
          lCodec.clockRate === rCodec.clockRate) {
        if (lCodec.name.toLowerCase() === 'rtx' &&
            lCodec.parameters && rCodec.parameters.apt) {
          // for RTX we need to find the local rtx that has a apt
          // which points to the same local codec as the remote one.
          if (!rtxCapabilityMatches(lCodec, rCodec,
              localCapabilities.codecs, remoteCapabilities.codecs)) {
            continue;
          }
        }
        rCodec = JSON.parse(JSON.stringify(rCodec)); // deepcopy
        // number of channels is the highest common number of channels
        rCodec.numChannels = Math.min(lCodec.numChannels,
            rCodec.numChannels);
        // push rCodec so we reply with offerer payload type
        commonCapabilities.codecs.push(rCodec);

        // determine common feedback mechanisms
        rCodec.rtcpFeedback = rCodec.rtcpFeedback.filter(function(fb) {
          for (var j = 0; j < lCodec.rtcpFeedback.length; j++) {
            if (lCodec.rtcpFeedback[j].type === fb.type &&
                lCodec.rtcpFeedback[j].parameter === fb.parameter) {
              return true;
            }
          }
          return false;
        });
        // FIXME: also need to determine .parameters
        //  see https://github.com/openpeer/ortc/issues/569
        break;
      }
    }
  });

  localCapabilities.headerExtensions.forEach(function(lHeaderExtension) {
    for (var i = 0; i < remoteCapabilities.headerExtensions.length;
         i++) {
      var rHeaderExtension = remoteCapabilities.headerExtensions[i];
      if (lHeaderExtension.uri === rHeaderExtension.uri) {
        commonCapabilities.headerExtensions.push(rHeaderExtension);
        break;
      }
    }
  });

  // FIXME: fecMechanisms
  return commonCapabilities;
}

// is action=setLocalDescription with type allowed in signalingState
function isActionAllowedInSignalingState(action, type, signalingState) {
  return {
    offer: {
      setLocalDescription: ['stable', 'have-local-offer'],
      setRemoteDescription: ['stable', 'have-remote-offer']
    },
    answer: {
      setLocalDescription: ['have-remote-offer', 'have-local-pranswer'],
      setRemoteDescription: ['have-local-offer', 'have-remote-pranswer']
    }
  }[type][action].indexOf(signalingState) !== -1;
}

function maybeAddCandidate(iceTransport, candidate) {
  // Edge's internal representation adds some fields therefore
  // not all fieldѕ are taken into account.
  var alreadyAdded = iceTransport.getRemoteCandidates()
      .find(function(remoteCandidate) {
        return candidate.foundation === remoteCandidate.foundation &&
            candidate.ip === remoteCandidate.ip &&
            candidate.port === remoteCandidate.port &&
            candidate.priority === remoteCandidate.priority &&
            candidate.protocol === remoteCandidate.protocol &&
            candidate.type === remoteCandidate.type;
      });
  if (!alreadyAdded) {
    iceTransport.addRemoteCandidate(candidate);
  }
  return !alreadyAdded;
}


function makeError(name, description) {
  var e = new Error(description);
  e.name = name;
  // legacy error codes from https://heycam.github.io/webidl/#idl-DOMException-error-names
  e.code = {
    NotSupportedError: 9,
    InvalidStateError: 11,
    InvalidAccessError: 15,
    TypeError: undefined,
    OperationError: undefined
  }[name];
  return e;
}

module.exports = function(window, edgeVersion) {
  // https://w3c.github.io/mediacapture-main/#mediastream
  // Helper function to add the track to the stream and
  // dispatch the event ourselves.
  function addTrackToStreamAndFireEvent(track, stream) {
    stream.addTrack(track);
    stream.dispatchEvent(new window.MediaStreamTrackEvent('addtrack',
        {track: track}));
  }

  function removeTrackFromStreamAndFireEvent(track, stream) {
    stream.removeTrack(track);
    stream.dispatchEvent(new window.MediaStreamTrackEvent('removetrack',
        {track: track}));
  }

  function fireAddTrack(pc, track, receiver, streams) {
    var trackEvent = new Event('track');
    trackEvent.track = track;
    trackEvent.receiver = receiver;
    trackEvent.transceiver = {receiver: receiver};
    trackEvent.streams = streams;
    window.setTimeout(function() {
      pc._dispatchEvent('track', trackEvent);
    });
  }

  var RTCPeerConnection = function(config) {
    var pc = this;

    var _eventTarget = document.createDocumentFragment();
    ['addEventListener', 'removeEventListener', 'dispatchEvent']
        .forEach(function(method) {
          pc[method] = _eventTarget[method].bind(_eventTarget);
        });

    this.canTrickleIceCandidates = null;

    this.needNegotiation = false;

    this.localStreams = [];
    this.remoteStreams = [];

    this._localDescription = null;
    this._remoteDescription = null;

    this.signalingState = 'stable';
    this.iceConnectionState = 'new';
    this.connectionState = 'new';
    this.iceGatheringState = 'new';

    config = JSON.parse(JSON.stringify(config || {}));

    this.usingBundle = config.bundlePolicy === 'max-bundle';
    if (config.rtcpMuxPolicy === 'negotiate') {
      throw(makeError('NotSupportedError',
          'rtcpMuxPolicy \'negotiate\' is not supported'));
    } else if (!config.rtcpMuxPolicy) {
      config.rtcpMuxPolicy = 'require';
    }

    switch (config.iceTransportPolicy) {
      case 'all':
      case 'relay':
        break;
      default:
        config.iceTransportPolicy = 'all';
        break;
    }

    switch (config.bundlePolicy) {
      case 'balanced':
      case 'max-compat':
      case 'max-bundle':
        break;
      default:
        config.bundlePolicy = 'balanced';
        break;
    }

    config.iceServers = filterIceServers(config.iceServers || [], edgeVersion);

    this._iceGatherers = [];
    if (config.iceCandidatePoolSize) {
      for (var i = config.iceCandidatePoolSize; i > 0; i--) {
        this._iceGatherers.push(new window.RTCIceGatherer({
          iceServers: config.iceServers,
          gatherPolicy: config.iceTransportPolicy
        }));
      }
    } else {
      config.iceCandidatePoolSize = 0;
    }

    this._config = config;

    // per-track iceGathers, iceTransports, dtlsTransports, rtpSenders, ...
    // everything that is needed to describe a SDP m-line.
    this.transceivers = [];

    this._sdpSessionId = SDPUtils.generateSessionId();
    this._sdpSessionVersion = 0;

    this._dtlsRole = undefined; // role for a=setup to use in answers.

    this._isClosed = false;
  };

  Object.defineProperty(RTCPeerConnection.prototype, 'localDescription', {
    configurable: true,
    get: function() {
      return this._localDescription;
    }
  });
  Object.defineProperty(RTCPeerConnection.prototype, 'remoteDescription', {
    configurable: true,
    get: function() {
      return this._remoteDescription;
    }
  });

  // set up event handlers on prototype
  RTCPeerConnection.prototype.onicecandidate = null;
  RTCPeerConnection.prototype.onaddstream = null;
  RTCPeerConnection.prototype.ontrack = null;
  RTCPeerConnection.prototype.onremovestream = null;
  RTCPeerConnection.prototype.onsignalingstatechange = null;
  RTCPeerConnection.prototype.oniceconnectionstatechange = null;
  RTCPeerConnection.prototype.onconnectionstatechange = null;
  RTCPeerConnection.prototype.onicegatheringstatechange = null;
  RTCPeerConnection.prototype.onnegotiationneeded = null;
  RTCPeerConnection.prototype.ondatachannel = null;

  RTCPeerConnection.prototype._dispatchEvent = function(name, event) {
    if (this._isClosed) {
      return;
    }
    this.dispatchEvent(event);
    if (typeof this['on' + name] === 'function') {
      this['on' + name](event);
    }
  };

  RTCPeerConnection.prototype._emitGatheringStateChange = function() {
    var event = new Event('icegatheringstatechange');
    this._dispatchEvent('icegatheringstatechange', event);
  };

  RTCPeerConnection.prototype.getConfiguration = function() {
    return this._config;
  };

  RTCPeerConnection.prototype.getLocalStreams = function() {
    return this.localStreams;
  };

  RTCPeerConnection.prototype.getRemoteStreams = function() {
    return this.remoteStreams;
  };

  // internal helper to create a transceiver object.
  // (which is not yet the same as the WebRTC 1.0 transceiver)
  RTCPeerConnection.prototype._createTransceiver = function(kind, doNotAdd) {
    var hasBundleTransport = this.transceivers.length > 0;
    var transceiver = {
      track: null,
      iceGatherer: null,
      iceTransport: null,
      dtlsTransport: null,
      localCapabilities: null,
      remoteCapabilities: null,
      rtpSender: null,
      rtpReceiver: null,
      kind: kind,
      mid: null,
      sendEncodingParameters: null,
      recvEncodingParameters: null,
      stream: null,
      associatedRemoteMediaStreams: [],
      wantReceive: true
    };
    if (this.usingBundle && hasBundleTransport) {
      transceiver.iceTransport = this.transceivers[0].iceTransport;
      transceiver.dtlsTransport = this.transceivers[0].dtlsTransport;
    } else {
      var transports = this._createIceAndDtlsTransports();
      transceiver.iceTransport = transports.iceTransport;
      transceiver.dtlsTransport = transports.dtlsTransport;
    }
    if (!doNotAdd) {
      this.transceivers.push(transceiver);
    }
    return transceiver;
  };

  RTCPeerConnection.prototype.addTrack = function(track, stream) {
    if (this._isClosed) {
      throw makeError('InvalidStateError',
          'Attempted to call addTrack on a closed peerconnection.');
    }

    var alreadyExists = this.transceivers.find(function(s) {
      return s.track === track;
    });

    if (alreadyExists) {
      throw makeError('InvalidAccessError', 'Track already exists.');
    }

    var transceiver;
    for (var i = 0; i < this.transceivers.length; i++) {
      if (!this.transceivers[i].track &&
          this.transceivers[i].kind === track.kind) {
        transceiver = this.transceivers[i];
      }
    }
    if (!transceiver) {
      transceiver = this._createTransceiver(track.kind);
    }

    this._maybeFireNegotiationNeeded();

    if (this.localStreams.indexOf(stream) === -1) {
      this.localStreams.push(stream);
    }

    transceiver.track = track;
    transceiver.stream = stream;
    transceiver.rtpSender = new window.RTCRtpSender(track,
        transceiver.dtlsTransport);
    return transceiver.rtpSender;
  };

  RTCPeerConnection.prototype.addStream = function(stream) {
    var pc = this;
    if (edgeVersion >= 15025) {
      stream.getTracks().forEach(function(track) {
        pc.addTrack(track, stream);
      });
    } else {
      // Clone is necessary for local demos mostly, attaching directly
      // to two different senders does not work (build 10547).
      // Fixed in 15025 (or earlier)
      var clonedStream = stream.clone();
      stream.getTracks().forEach(function(track, idx) {
        var clonedTrack = clonedStream.getTracks()[idx];
        track.addEventListener('enabled', function(event) {
          clonedTrack.enabled = event.enabled;
        });
      });
      clonedStream.getTracks().forEach(function(track) {
        pc.addTrack(track, clonedStream);
      });
    }
  };

  RTCPeerConnection.prototype.removeTrack = function(sender) {
    if (this._isClosed) {
      throw makeError('InvalidStateError',
          'Attempted to call removeTrack on a closed peerconnection.');
    }

    if (!(sender instanceof window.RTCRtpSender)) {
      throw new TypeError('Argument 1 of RTCPeerConnection.removeTrack ' +
          'does not implement interface RTCRtpSender.');
    }

    var transceiver = this.transceivers.find(function(t) {
      return t.rtpSender === sender;
    });

    if (!transceiver) {
      throw makeError('InvalidAccessError',
          'Sender was not created by this connection.');
    }
    var stream = transceiver.stream;

    transceiver.rtpSender.stop();
    transceiver.rtpSender = null;
    transceiver.track = null;
    transceiver.stream = null;

    // remove the stream from the set of local streams
    var localStreams = this.transceivers.map(function(t) {
      return t.stream;
    });
    if (localStreams.indexOf(stream) === -1 &&
        this.localStreams.indexOf(stream) > -1) {
      this.localStreams.splice(this.localStreams.indexOf(stream), 1);
    }

    this._maybeFireNegotiationNeeded();
  };

  RTCPeerConnection.prototype.removeStream = function(stream) {
    var pc = this;
    stream.getTracks().forEach(function(track) {
      var sender = pc.getSenders().find(function(s) {
        return s.track === track;
      });
      if (sender) {
        pc.removeTrack(sender);
      }
    });
  };

  RTCPeerConnection.prototype.getSenders = function() {
    return this.transceivers.filter(function(transceiver) {
      return !!transceiver.rtpSender;
    })
    .map(function(transceiver) {
      return transceiver.rtpSender;
    });
  };

  RTCPeerConnection.prototype.getReceivers = function() {
    return this.transceivers.filter(function(transceiver) {
      return !!transceiver.rtpReceiver;
    })
    .map(function(transceiver) {
      return transceiver.rtpReceiver;
    });
  };


  RTCPeerConnection.prototype._createIceGatherer = function(sdpMLineIndex,
      usingBundle) {
    var pc = this;
    if (usingBundle && sdpMLineIndex > 0) {
      return this.transceivers[0].iceGatherer;
    } else if (this._iceGatherers.length) {
      return this._iceGatherers.shift();
    }
    var iceGatherer = new window.RTCIceGatherer({
      iceServers: this._config.iceServers,
      gatherPolicy: this._config.iceTransportPolicy
    });
    Object.defineProperty(iceGatherer, 'state',
        {value: 'new', writable: true}
    );

    this.transceivers[sdpMLineIndex].bufferedCandidateEvents = [];
    this.transceivers[sdpMLineIndex].bufferCandidates = function(event) {
      var end = !event.candidate || Object.keys(event.candidate).length === 0;
      // polyfill since RTCIceGatherer.state is not implemented in
      // Edge 10547 yet.
      iceGatherer.state = end ? 'completed' : 'gathering';
      if (pc.transceivers[sdpMLineIndex].bufferedCandidateEvents !== null) {
        pc.transceivers[sdpMLineIndex].bufferedCandidateEvents.push(event);
      }
    };
    iceGatherer.addEventListener('localcandidate',
      this.transceivers[sdpMLineIndex].bufferCandidates);
    return iceGatherer;
  };

  // start gathering from an RTCIceGatherer.
  RTCPeerConnection.prototype._gather = function(mid, sdpMLineIndex) {
    var pc = this;
    var iceGatherer = this.transceivers[sdpMLineIndex].iceGatherer;
    if (iceGatherer.onlocalcandidate) {
      return;
    }
    var bufferedCandidateEvents =
      this.transceivers[sdpMLineIndex].bufferedCandidateEvents;
    this.transceivers[sdpMLineIndex].bufferedCandidateEvents = null;
    iceGatherer.removeEventListener('localcandidate',
      this.transceivers[sdpMLineIndex].bufferCandidates);
    iceGatherer.onlocalcandidate = function(evt) {
      if (pc.usingBundle && sdpMLineIndex > 0) {
        // if we know that we use bundle we can drop candidates with
        // ѕdpMLineIndex > 0. If we don't do this then our state gets
        // confused since we dispose the extra ice gatherer.
        return;
      }
      var event = new Event('icecandidate');
      event.candidate = {sdpMid: mid, sdpMLineIndex: sdpMLineIndex};

      var cand = evt.candidate;
      // Edge emits an empty object for RTCIceCandidateComplete‥
      var end = !cand || Object.keys(cand).length === 0;
      if (end) {
        // polyfill since RTCIceGatherer.state is not implemented in
        // Edge 10547 yet.
        if (iceGatherer.state === 'new' || iceGatherer.state === 'gathering') {
          iceGatherer.state = 'completed';
        }
      } else {
        if (iceGatherer.state === 'new') {
          iceGatherer.state = 'gathering';
        }
        // RTCIceCandidate doesn't have a component, needs to be added
        cand.component = 1;
        // also the usernameFragment. TODO: update SDP to take both variants.
        cand.ufrag = iceGatherer.getLocalParameters().usernameFragment;

        var serializedCandidate = SDPUtils.writeCandidate(cand);
        event.candidate = Object.assign(event.candidate,
            SDPUtils.parseCandidate(serializedCandidate));

        event.candidate.candidate = serializedCandidate;
        event.candidate.toJSON = function() {
          return {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment
          };
        };
      }

      // update local description.
      var sections = SDPUtils.getMediaSections(pc._localDescription.sdp);
      if (!end) {
        sections[event.candidate.sdpMLineIndex] +=
            'a=' + event.candidate.candidate + '\r\n';
      } else {
        sections[event.candidate.sdpMLineIndex] +=
            'a=end-of-candidates\r\n';
      }
      pc._localDescription.sdp =
          SDPUtils.getDescription(pc._localDescription.sdp) +
          sections.join('');
      var complete = pc.transceivers.every(function(transceiver) {
        return transceiver.iceGatherer &&
            transceiver.iceGatherer.state === 'completed';
      });

      if (pc.iceGatheringState !== 'gathering') {
        pc.iceGatheringState = 'gathering';
        pc._emitGatheringStateChange();
      }

      // Emit candidate. Also emit null candidate when all gatherers are
      // complete.
      if (!end) {
        pc._dispatchEvent('icecandidate', event);
      }
      if (complete) {
        pc._dispatchEvent('icecandidate', new Event('icecandidate'));
        pc.iceGatheringState = 'complete';
        pc._emitGatheringStateChange();
      }
    };

    // emit already gathered candidates.
    window.setTimeout(function() {
      bufferedCandidateEvents.forEach(function(e) {
        iceGatherer.onlocalcandidate(e);
      });
    }, 0);
  };

  // Create ICE transport and DTLS transport.
  RTCPeerConnection.prototype._createIceAndDtlsTransports = function() {
    var pc = this;
    var iceTransport = new window.RTCIceTransport(null);
    iceTransport.onicestatechange = function() {
      pc._updateIceConnectionState();
      pc._updateConnectionState();
    };

    var dtlsTransport = new window.RTCDtlsTransport(iceTransport);
    dtlsTransport.ondtlsstatechange = function() {
      pc._updateConnectionState();
    };
    dtlsTransport.onerror = function() {
      // onerror does not set state to failed by itself.
      Object.defineProperty(dtlsTransport, 'state',
          {value: 'failed', writable: true});
      pc._updateConnectionState();
    };

    return {
      iceTransport: iceTransport,
      dtlsTransport: dtlsTransport
    };
  };

  // Destroy ICE gatherer, ICE transport and DTLS transport.
  // Without triggering the callbacks.
  RTCPeerConnection.prototype._disposeIceAndDtlsTransports = function(
      sdpMLineIndex) {
    var iceGatherer = this.transceivers[sdpMLineIndex].iceGatherer;
    if (iceGatherer) {
      delete iceGatherer.onlocalcandidate;
      delete this.transceivers[sdpMLineIndex].iceGatherer;
    }
    var iceTransport = this.transceivers[sdpMLineIndex].iceTransport;
    if (iceTransport) {
      delete iceTransport.onicestatechange;
      delete this.transceivers[sdpMLineIndex].iceTransport;
    }
    var dtlsTransport = this.transceivers[sdpMLineIndex].dtlsTransport;
    if (dtlsTransport) {
      delete dtlsTransport.ondtlsstatechange;
      delete dtlsTransport.onerror;
      delete this.transceivers[sdpMLineIndex].dtlsTransport;
    }
  };

  // Start the RTP Sender and Receiver for a transceiver.
  RTCPeerConnection.prototype._transceive = function(transceiver,
      send, recv) {
    var params = getCommonCapabilities(transceiver.localCapabilities,
        transceiver.remoteCapabilities);
    if (send && transceiver.rtpSender) {
      params.encodings = transceiver.sendEncodingParameters;
      params.rtcp = {
        cname: SDPUtils.localCName,
        compound: transceiver.rtcpParameters.compound
      };
      if (transceiver.recvEncodingParameters.length) {
        params.rtcp.ssrc = transceiver.recvEncodingParameters[0].ssrc;
      }
      transceiver.rtpSender.send(params);
    }
    if (recv && transceiver.rtpReceiver && params.codecs.length > 0) {
      // remove RTX field in Edge 14942
      if (transceiver.kind === 'video'
          && transceiver.recvEncodingParameters
          && edgeVersion < 15019) {
        transceiver.recvEncodingParameters.forEach(function(p) {
          delete p.rtx;
        });
      }
      if (transceiver.recvEncodingParameters.length) {
        params.encodings = transceiver.recvEncodingParameters;
      } else {
        params.encodings = [{}];
      }
      params.rtcp = {
        compound: transceiver.rtcpParameters.compound
      };
      if (transceiver.rtcpParameters.cname) {
        params.rtcp.cname = transceiver.rtcpParameters.cname;
      }
      if (transceiver.sendEncodingParameters.length) {
        params.rtcp.ssrc = transceiver.sendEncodingParameters[0].ssrc;
      }
      transceiver.rtpReceiver.receive(params);
    }
  };

  RTCPeerConnection.prototype.setLocalDescription = function(description) {
    var pc = this;

    // Note: pranswer is not supported.
    if (['offer', 'answer'].indexOf(description.type) === -1) {
      return Promise.reject(makeError('TypeError',
          'Unsupported type "' + description.type + '"'));
    }

    if (!isActionAllowedInSignalingState('setLocalDescription',
        description.type, pc.signalingState) || pc._isClosed) {
      return Promise.reject(makeError('InvalidStateError',
          'Can not set local ' + description.type +
          ' in state ' + pc.signalingState));
    }

    var sections;
    var sessionpart;
    if (description.type === 'offer') {
      // VERY limited support for SDP munging. Limited to:
      // * changing the order of codecs
      sections = SDPUtils.splitSections(description.sdp);
      sessionpart = sections.shift();
      sections.forEach(function(mediaSection, sdpMLineIndex) {
        var caps = SDPUtils.parseRtpParameters(mediaSection);
        pc.transceivers[sdpMLineIndex].localCapabilities = caps;
      });

      pc.transceivers.forEach(function(transceiver, sdpMLineIndex) {
        pc._gather(transceiver.mid, sdpMLineIndex);
      });
    } else if (description.type === 'answer') {
      sections = SDPUtils.splitSections(pc._remoteDescription.sdp);
      sessionpart = sections.shift();
      var isIceLite = SDPUtils.matchPrefix(sessionpart,
          'a=ice-lite').length > 0;
      sections.forEach(function(mediaSection, sdpMLineIndex) {
        var transceiver = pc.transceivers[sdpMLineIndex];
        var iceGatherer = transceiver.iceGatherer;
        var iceTransport = transceiver.iceTransport;
        var dtlsTransport = transceiver.dtlsTransport;
        var localCapabilities = transceiver.localCapabilities;
        var remoteCapabilities = transceiver.remoteCapabilities;

        // treat bundle-only as not-rejected.
        var rejected = SDPUtils.isRejected(mediaSection) &&
            SDPUtils.matchPrefix(mediaSection, 'a=bundle-only').length === 0;

        if (!rejected && !transceiver.rejected) {
          var remoteIceParameters = SDPUtils.getIceParameters(
              mediaSection, sessionpart);
          var remoteDtlsParameters = SDPUtils.getDtlsParameters(
              mediaSection, sessionpart);
          if (isIceLite) {
            remoteDtlsParameters.role = 'server';
          }

          if (!pc.usingBundle || sdpMLineIndex === 0) {
            pc._gather(transceiver.mid, sdpMLineIndex);
            if (iceTransport.state === 'new') {
              iceTransport.start(iceGatherer, remoteIceParameters,
                  isIceLite ? 'controlling' : 'controlled');
            }
            if (dtlsTransport.state === 'new') {
              dtlsTransport.start(remoteDtlsParameters);
            }
          }

          // Calculate intersection of capabilities.
          var params = getCommonCapabilities(localCapabilities,
              remoteCapabilities);

          // Start the RTCRtpSender. The RTCRtpReceiver for this
          // transceiver has already been started in setRemoteDescription.
          pc._transceive(transceiver,
              params.codecs.length > 0,
              false);
        }
      });
    }

    pc._localDescription = {
      type: description.type,
      sdp: description.sdp
    };
    if (description.type === 'offer') {
      pc._updateSignalingState('have-local-offer');
    } else {
      pc._updateSignalingState('stable');
    }

    return Promise.resolve();
  };

  RTCPeerConnection.prototype.setRemoteDescription = function(description) {
    var pc = this;

    // Note: pranswer is not supported.
    if (['offer', 'answer'].indexOf(description.type) === -1) {
      return Promise.reject(makeError('TypeError',
          'Unsupported type "' + description.type + '"'));
    }

    if (!isActionAllowedInSignalingState('setRemoteDescription',
        description.type, pc.signalingState) || pc._isClosed) {
      return Promise.reject(makeError('InvalidStateError',
          'Can not set remote ' + description.type +
          ' in state ' + pc.signalingState));
    }

    var streams = {};
    pc.remoteStreams.forEach(function(stream) {
      streams[stream.id] = stream;
    });
    var receiverList = [];
    var sections = SDPUtils.splitSections(description.sdp);
    var sessionpart = sections.shift();
    var isIceLite = SDPUtils.matchPrefix(sessionpart,
        'a=ice-lite').length > 0;
    var usingBundle = SDPUtils.matchPrefix(sessionpart,
        'a=group:BUNDLE ').length > 0;
    pc.usingBundle = usingBundle;
    var iceOptions = SDPUtils.matchPrefix(sessionpart,
        'a=ice-options:')[0];
    if (iceOptions) {
      pc.canTrickleIceCandidates = iceOptions.substr(14).split(' ')
          .indexOf('trickle') >= 0;
    } else {
      pc.canTrickleIceCandidates = false;
    }

    sections.forEach(function(mediaSection, sdpMLineIndex) {
      var lines = SDPUtils.splitLines(mediaSection);
      var kind = SDPUtils.getKind(mediaSection);
      // treat bundle-only as not-rejected.
      var rejected = SDPUtils.isRejected(mediaSection) &&
          SDPUtils.matchPrefix(mediaSection, 'a=bundle-only').length === 0;
      var protocol = lines[0].substr(2).split(' ')[2];

      var direction = SDPUtils.getDirection(mediaSection, sessionpart);
      var remoteMsid = SDPUtils.parseMsid(mediaSection);

      var mid = SDPUtils.getMid(mediaSection) || SDPUtils.generateIdentifier();

      // Reject datachannels which are not implemented yet.
      if (rejected || (kind === 'application' && (protocol === 'DTLS/SCTP' ||
          protocol === 'UDP/DTLS/SCTP'))) {
        // TODO: this is dangerous in the case where a non-rejected m-line
        //     becomes rejected.
        pc.transceivers[sdpMLineIndex] = {
          mid: mid,
          kind: kind,
          protocol: protocol,
          rejected: true
        };
        return;
      }

      if (!rejected && pc.transceivers[sdpMLineIndex] &&
          pc.transceivers[sdpMLineIndex].rejected) {
        // recycle a rejected transceiver.
        pc.transceivers[sdpMLineIndex] = pc._createTransceiver(kind, true);
      }

      var transceiver;
      var iceGatherer;
      var iceTransport;
      var dtlsTransport;
      var rtpReceiver;
      var sendEncodingParameters;
      var recvEncodingParameters;
      var localCapabilities;

      var track;
      // FIXME: ensure the mediaSection has rtcp-mux set.
      var remoteCapabilities = SDPUtils.parseRtpParameters(mediaSection);
      var remoteIceParameters;
      var remoteDtlsParameters;
      if (!rejected) {
        remoteIceParameters = SDPUtils.getIceParameters(mediaSection,
            sessionpart);
        remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection,
            sessionpart);
        remoteDtlsParameters.role = 'client';
      }
      recvEncodingParameters =
          SDPUtils.parseRtpEncodingParameters(mediaSection);

      var rtcpParameters = SDPUtils.parseRtcpParameters(mediaSection);

      var isComplete = SDPUtils.matchPrefix(mediaSection,
          'a=end-of-candidates', sessionpart).length > 0;
      var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:')
          .map(function(cand) {
            return SDPUtils.parseCandidate(cand);
          })
          .filter(function(cand) {
            return cand.component === 1;
          });

      // Check if we can use BUNDLE and dispose transports.
      if ((description.type === 'offer' || description.type === 'answer') &&
          !rejected && usingBundle && sdpMLineIndex > 0 &&
          pc.transceivers[sdpMLineIndex]) {
        pc._disposeIceAndDtlsTransports(sdpMLineIndex);
        pc.transceivers[sdpMLineIndex].iceGatherer =
            pc.transceivers[0].iceGatherer;
        pc.transceivers[sdpMLineIndex].iceTransport =
            pc.transceivers[0].iceTransport;
        pc.transceivers[sdpMLineIndex].dtlsTransport =
            pc.transceivers[0].dtlsTransport;
        if (pc.transceivers[sdpMLineIndex].rtpSender) {
          pc.transceivers[sdpMLineIndex].rtpSender.setTransport(
              pc.transceivers[0].dtlsTransport);
        }
        if (pc.transceivers[sdpMLineIndex].rtpReceiver) {
          pc.transceivers[sdpMLineIndex].rtpReceiver.setTransport(
              pc.transceivers[0].dtlsTransport);
        }
      }
      if (description.type === 'offer' && !rejected) {
        transceiver = pc.transceivers[sdpMLineIndex] ||
            pc._createTransceiver(kind);
        transceiver.mid = mid;

        if (!transceiver.iceGatherer) {
          transceiver.iceGatherer = pc._createIceGatherer(sdpMLineIndex,
              usingBundle);
        }

        if (cands.length && transceiver.iceTransport.state === 'new') {
          if (isComplete && (!usingBundle || sdpMLineIndex === 0)) {
            transceiver.iceTransport.setRemoteCandidates(cands);
          } else {
            cands.forEach(function(candidate) {
              maybeAddCandidate(transceiver.iceTransport, candidate);
            });
          }
        }

        localCapabilities = window.RTCRtpReceiver.getCapabilities(kind);

        // filter RTX until additional stuff needed for RTX is implemented
        // in adapter.js
        if (edgeVersion < 15019) {
          localCapabilities.codecs = localCapabilities.codecs.filter(
              function(codec) {
                return codec.name !== 'rtx';
              });
        }

        sendEncodingParameters = transceiver.sendEncodingParameters || [{
          ssrc: (2 * sdpMLineIndex + 2) * 1001
        }];

        // TODO: rewrite to use http://w3c.github.io/webrtc-pc/#set-associated-remote-streams
        var isNewTrack = false;
        if (direction === 'sendrecv' || direction === 'sendonly') {
          isNewTrack = !transceiver.rtpReceiver;
          rtpReceiver = transceiver.rtpReceiver ||
              new window.RTCRtpReceiver(transceiver.dtlsTransport, kind);

          if (isNewTrack) {
            var stream;
            track = rtpReceiver.track;
            // FIXME: does not work with Plan B.
            if (remoteMsid && remoteMsid.stream === '-') {
              // no-op. a stream id of '-' means: no associated stream.
            } else if (remoteMsid) {
              if (!streams[remoteMsid.stream]) {
                streams[remoteMsid.stream] = new window.MediaStream();
                Object.defineProperty(streams[remoteMsid.stream], 'id', {
                  get: function() {
                    return remoteMsid.stream;
                  }
                });
              }
              Object.defineProperty(track, 'id', {
                get: function() {
                  return remoteMsid.track;
                }
              });
              stream = streams[remoteMsid.stream];
            } else {
              if (!streams.default) {
                streams.default = new window.MediaStream();
              }
              stream = streams.default;
            }
            if (stream) {
              addTrackToStreamAndFireEvent(track, stream);
              transceiver.associatedRemoteMediaStreams.push(stream);
            }
            receiverList.push([track, rtpReceiver, stream]);
          }
        } else if (transceiver.rtpReceiver && transceiver.rtpReceiver.track) {
          transceiver.associatedRemoteMediaStreams.forEach(function(s) {
            var nativeTrack = s.getTracks().find(function(t) {
              return t.id === transceiver.rtpReceiver.track.id;
            });
            if (nativeTrack) {
              removeTrackFromStreamAndFireEvent(nativeTrack, s);
            }
          });
          transceiver.associatedRemoteMediaStreams = [];
        }

        transceiver.localCapabilities = localCapabilities;
        transceiver.remoteCapabilities = remoteCapabilities;
        transceiver.rtpReceiver = rtpReceiver;
        transceiver.rtcpParameters = rtcpParameters;
        transceiver.sendEncodingParameters = sendEncodingParameters;
        transceiver.recvEncodingParameters = recvEncodingParameters;

        // Start the RTCRtpReceiver now. The RTPSender is started in
        // setLocalDescription.
        pc._transceive(pc.transceivers[sdpMLineIndex],
            false,
            isNewTrack);
      } else if (description.type === 'answer' && !rejected) {
        transceiver = pc.transceivers[sdpMLineIndex];
        iceGatherer = transceiver.iceGatherer;
        iceTransport = transceiver.iceTransport;
        dtlsTransport = transceiver.dtlsTransport;
        rtpReceiver = transceiver.rtpReceiver;
        sendEncodingParameters = transceiver.sendEncodingParameters;
        localCapabilities = transceiver.localCapabilities;

        pc.transceivers[sdpMLineIndex].recvEncodingParameters =
            recvEncodingParameters;
        pc.transceivers[sdpMLineIndex].remoteCapabilities =
            remoteCapabilities;
        pc.transceivers[sdpMLineIndex].rtcpParameters = rtcpParameters;

        if (cands.length && iceTransport.state === 'new') {
          if ((isIceLite || isComplete) &&
              (!usingBundle || sdpMLineIndex === 0)) {
            iceTransport.setRemoteCandidates(cands);
          } else {
            cands.forEach(function(candidate) {
              maybeAddCandidate(transceiver.iceTransport, candidate);
            });
          }
        }

        if (!usingBundle || sdpMLineIndex === 0) {
          if (iceTransport.state === 'new') {
            iceTransport.start(iceGatherer, remoteIceParameters,
                'controlling');
          }
          if (dtlsTransport.state === 'new') {
            dtlsTransport.start(remoteDtlsParameters);
          }
        }

        // If the offer contained RTX but the answer did not,
        // remove RTX from sendEncodingParameters.
        var commonCapabilities = getCommonCapabilities(
          transceiver.localCapabilities,
          transceiver.remoteCapabilities);

        var hasRtx = commonCapabilities.codecs.filter(function(c) {
          return c.name.toLowerCase() === 'rtx';
        }).length;
        if (!hasRtx && transceiver.sendEncodingParameters[0].rtx) {
          delete transceiver.sendEncodingParameters[0].rtx;
        }

        pc._transceive(transceiver,
            direction === 'sendrecv' || direction === 'recvonly',
            direction === 'sendrecv' || direction === 'sendonly');

        // TODO: rewrite to use http://w3c.github.io/webrtc-pc/#set-associated-remote-streams
        if (rtpReceiver &&
            (direction === 'sendrecv' || direction === 'sendonly')) {
          track = rtpReceiver.track;
          if (remoteMsid) {
            if (!streams[remoteMsid.stream]) {
              streams[remoteMsid.stream] = new window.MediaStream();
            }
            addTrackToStreamAndFireEvent(track, streams[remoteMsid.stream]);
            receiverList.push([track, rtpReceiver, streams[remoteMsid.stream]]);
          } else {
            if (!streams.default) {
              streams.default = new window.MediaStream();
            }
            addTrackToStreamAndFireEvent(track, streams.default);
            receiverList.push([track, rtpReceiver, streams.default]);
          }
        } else {
          // FIXME: actually the receiver should be created later.
          delete transceiver.rtpReceiver;
        }
      }
    });

    if (pc._dtlsRole === undefined) {
      pc._dtlsRole = description.type === 'offer' ? 'active' : 'passive';
    }

    pc._remoteDescription = {
      type: description.type,
      sdp: description.sdp
    };
    if (description.type === 'offer') {
      pc._updateSignalingState('have-remote-offer');
    } else {
      pc._updateSignalingState('stable');
    }
    Object.keys(streams).forEach(function(sid) {
      var stream = streams[sid];
      if (stream.getTracks().length) {
        if (pc.remoteStreams.indexOf(stream) === -1) {
          pc.remoteStreams.push(stream);
          var event = new Event('addstream');
          event.stream = stream;
          window.setTimeout(function() {
            pc._dispatchEvent('addstream', event);
          });
        }

        receiverList.forEach(function(item) {
          var track = item[0];
          var receiver = item[1];
          if (stream.id !== item[2].id) {
            return;
          }
          fireAddTrack(pc, track, receiver, [stream]);
        });
      }
    });
    receiverList.forEach(function(item) {
      if (item[2]) {
        return;
      }
      fireAddTrack(pc, item[0], item[1], []);
    });

    // check whether addIceCandidate({}) was called within four seconds after
    // setRemoteDescription.
    window.setTimeout(function() {
      if (!(pc && pc.transceivers)) {
        return;
      }
      pc.transceivers.forEach(function(transceiver) {
        if (transceiver.iceTransport &&
            transceiver.iceTransport.state === 'new' &&
            transceiver.iceTransport.getRemoteCandidates().length > 0) {
          console.warn('Timeout for addRemoteCandidate. Consider sending ' +
              'an end-of-candidates notification');
          transceiver.iceTransport.addRemoteCandidate({});
        }
      });
    }, 4000);

    return Promise.resolve();
  };

  RTCPeerConnection.prototype.close = function() {
    this.transceivers.forEach(function(transceiver) {
      /* not yet
      if (transceiver.iceGatherer) {
        transceiver.iceGatherer.close();
      }
      */
      if (transceiver.iceTransport) {
        transceiver.iceTransport.stop();
      }
      if (transceiver.dtlsTransport) {
        transceiver.dtlsTransport.stop();
      }
      if (transceiver.rtpSender) {
        transceiver.rtpSender.stop();
      }
      if (transceiver.rtpReceiver) {
        transceiver.rtpReceiver.stop();
      }
    });
    // FIXME: clean up tracks, local streams, remote streams, etc
    this._isClosed = true;
    this._updateSignalingState('closed');
  };

  // Update the signaling state.
  RTCPeerConnection.prototype._updateSignalingState = function(newState) {
    this.signalingState = newState;
    var event = new Event('signalingstatechange');
    this._dispatchEvent('signalingstatechange', event);
  };

  // Determine whether to fire the negotiationneeded event.
  RTCPeerConnection.prototype._maybeFireNegotiationNeeded = function() {
    var pc = this;
    if (this.signalingState !== 'stable' || this.needNegotiation === true) {
      return;
    }
    this.needNegotiation = true;
    window.setTimeout(function() {
      if (pc.needNegotiation) {
        pc.needNegotiation = false;
        var event = new Event('negotiationneeded');
        pc._dispatchEvent('negotiationneeded', event);
      }
    }, 0);
  };

  // Update the ice connection state.
  RTCPeerConnection.prototype._updateIceConnectionState = function() {
    var newState;
    var states = {
      'new': 0,
      closed: 0,
      checking: 0,
      connected: 0,
      completed: 0,
      disconnected: 0,
      failed: 0
    };
    this.transceivers.forEach(function(transceiver) {
      if (transceiver.iceTransport && !transceiver.rejected) {
        states[transceiver.iceTransport.state]++;
      }
    });

    newState = 'new';
    if (states.failed > 0) {
      newState = 'failed';
    } else if (states.checking > 0) {
      newState = 'checking';
    } else if (states.disconnected > 0) {
      newState = 'disconnected';
    } else if (states.new > 0) {
      newState = 'new';
    } else if (states.connected > 0) {
      newState = 'connected';
    } else if (states.completed > 0) {
      newState = 'completed';
    }

    if (newState !== this.iceConnectionState) {
      this.iceConnectionState = newState;
      var event = new Event('iceconnectionstatechange');
      this._dispatchEvent('iceconnectionstatechange', event);
    }
  };

  // Update the connection state.
  RTCPeerConnection.prototype._updateConnectionState = function() {
    var newState;
    var states = {
      'new': 0,
      closed: 0,
      connecting: 0,
      connected: 0,
      completed: 0,
      disconnected: 0,
      failed: 0
    };
    this.transceivers.forEach(function(transceiver) {
      if (transceiver.iceTransport && transceiver.dtlsTransport &&
          !transceiver.rejected) {
        states[transceiver.iceTransport.state]++;
        states[transceiver.dtlsTransport.state]++;
      }
    });
    // ICETransport.completed and connected are the same for this purpose.
    states.connected += states.completed;

    newState = 'new';
    if (states.failed > 0) {
      newState = 'failed';
    } else if (states.connecting > 0) {
      newState = 'connecting';
    } else if (states.disconnected > 0) {
      newState = 'disconnected';
    } else if (states.new > 0) {
      newState = 'new';
    } else if (states.connected > 0) {
      newState = 'connected';
    }

    if (newState !== this.connectionState) {
      this.connectionState = newState;
      var event = new Event('connectionstatechange');
      this._dispatchEvent('connectionstatechange', event);
    }
  };

  RTCPeerConnection.prototype.createOffer = function() {
    var pc = this;

    if (pc._isClosed) {
      return Promise.reject(makeError('InvalidStateError',
          'Can not call createOffer after close'));
    }

    var numAudioTracks = pc.transceivers.filter(function(t) {
      return t.kind === 'audio';
    }).length;
    var numVideoTracks = pc.transceivers.filter(function(t) {
      return t.kind === 'video';
    }).length;

    // Determine number of audio and video tracks we need to send/recv.
    var offerOptions = arguments[0];
    if (offerOptions) {
      // Reject Chrome legacy constraints.
      if (offerOptions.mandatory || offerOptions.optional) {
        throw new TypeError(
            'Legacy mandatory/optional constraints not supported.');
      }
      if (offerOptions.offerToReceiveAudio !== undefined) {
        if (offerOptions.offerToReceiveAudio === true) {
          numAudioTracks = 1;
        } else if (offerOptions.offerToReceiveAudio === false) {
          numAudioTracks = 0;
        } else {
          numAudioTracks = offerOptions.offerToReceiveAudio;
        }
      }
      if (offerOptions.offerToReceiveVideo !== undefined) {
        if (offerOptions.offerToReceiveVideo === true) {
          numVideoTracks = 1;
        } else if (offerOptions.offerToReceiveVideo === false) {
          numVideoTracks = 0;
        } else {
          numVideoTracks = offerOptions.offerToReceiveVideo;
        }
      }
    }

    pc.transceivers.forEach(function(transceiver) {
      if (transceiver.kind === 'audio') {
        numAudioTracks--;
        if (numAudioTracks < 0) {
          transceiver.wantReceive = false;
        }
      } else if (transceiver.kind === 'video') {
        numVideoTracks--;
        if (numVideoTracks < 0) {
          transceiver.wantReceive = false;
        }
      }
    });

    // Create M-lines for recvonly streams.
    while (numAudioTracks > 0 || numVideoTracks > 0) {
      if (numAudioTracks > 0) {
        pc._createTransceiver('audio');
        numAudioTracks--;
      }
      if (numVideoTracks > 0) {
        pc._createTransceiver('video');
        numVideoTracks--;
      }
    }

    var sdp = SDPUtils.writeSessionBoilerplate(pc._sdpSessionId,
        pc._sdpSessionVersion++);
    pc.transceivers.forEach(function(transceiver, sdpMLineIndex) {
      // For each track, create an ice gatherer, ice transport,
      // dtls transport, potentially rtpsender and rtpreceiver.
      var track = transceiver.track;
      var kind = transceiver.kind;
      var mid = transceiver.mid || SDPUtils.generateIdentifier();
      transceiver.mid = mid;

      if (!transceiver.iceGatherer) {
        transceiver.iceGatherer = pc._createIceGatherer(sdpMLineIndex,
            pc.usingBundle);
      }

      var localCapabilities = window.RTCRtpSender.getCapabilities(kind);
      // filter RTX until additional stuff needed for RTX is implemented
      // in adapter.js
      if (edgeVersion < 15019) {
        localCapabilities.codecs = localCapabilities.codecs.filter(
            function(codec) {
              return codec.name !== 'rtx';
            });
      }
      localCapabilities.codecs.forEach(function(codec) {
        // work around https://bugs.chromium.org/p/webrtc/issues/detail?id=6552
        // by adding level-asymmetry-allowed=1
        if (codec.name === 'H264' &&
            codec.parameters['level-asymmetry-allowed'] === undefined) {
          codec.parameters['level-asymmetry-allowed'] = '1';
        }

        // for subsequent offers, we might have to re-use the payload
        // type of the last offer.
        if (transceiver.remoteCapabilities &&
            transceiver.remoteCapabilities.codecs) {
          transceiver.remoteCapabilities.codecs.forEach(function(remoteCodec) {
            if (codec.name.toLowerCase() === remoteCodec.name.toLowerCase() &&
                codec.clockRate === remoteCodec.clockRate) {
              codec.preferredPayloadType = remoteCodec.payloadType;
            }
          });
        }
      });
      localCapabilities.headerExtensions.forEach(function(hdrExt) {
        var remoteExtensions = transceiver.remoteCapabilities &&
            transceiver.remoteCapabilities.headerExtensions || [];
        remoteExtensions.forEach(function(rHdrExt) {
          if (hdrExt.uri === rHdrExt.uri) {
            hdrExt.id = rHdrExt.id;
          }
        });
      });

      // generate an ssrc now, to be used later in rtpSender.send
      var sendEncodingParameters = transceiver.sendEncodingParameters || [{
        ssrc: (2 * sdpMLineIndex + 1) * 1001
      }];
      if (track) {
        // add RTX
        if (edgeVersion >= 15019 && kind === 'video' &&
            !sendEncodingParameters[0].rtx) {
          sendEncodingParameters[0].rtx = {
            ssrc: sendEncodingParameters[0].ssrc + 1
          };
        }
      }

      if (transceiver.wantReceive) {
        transceiver.rtpReceiver = new window.RTCRtpReceiver(
            transceiver.dtlsTransport, kind);
      }

      transceiver.localCapabilities = localCapabilities;
      transceiver.sendEncodingParameters = sendEncodingParameters;
    });

    // always offer BUNDLE and dispose on return if not supported.
    if (pc._config.bundlePolicy !== 'max-compat') {
      sdp += 'a=group:BUNDLE ' + pc.transceivers.map(function(t) {
        return t.mid;
      }).join(' ') + '\r\n';
    }
    sdp += 'a=ice-options:trickle\r\n';

    pc.transceivers.forEach(function(transceiver, sdpMLineIndex) {
      sdp += writeMediaSection(transceiver, transceiver.localCapabilities,
          'offer', transceiver.stream, pc._dtlsRole);
      sdp += 'a=rtcp-rsize\r\n';

      if (transceiver.iceGatherer && pc.iceGatheringState !== 'new' &&
          (sdpMLineIndex === 0 || !pc.usingBundle)) {
        transceiver.iceGatherer.getLocalCandidates().forEach(function(cand) {
          cand.component = 1;
          sdp += 'a=' + SDPUtils.writeCandidate(cand) + '\r\n';
        });

        if (transceiver.iceGatherer.state === 'completed') {
          sdp += 'a=end-of-candidates\r\n';
        }
      }
    });

    var desc = new window.RTCSessionDescription({
      type: 'offer',
      sdp: sdp
    });
    return Promise.resolve(desc);
  };

  RTCPeerConnection.prototype.createAnswer = function() {
    var pc = this;

    if (pc._isClosed) {
      return Promise.reject(makeError('InvalidStateError',
          'Can not call createAnswer after close'));
    }

    if (!(pc.signalingState === 'have-remote-offer' ||
        pc.signalingState === 'have-local-pranswer')) {
      return Promise.reject(makeError('InvalidStateError',
          'Can not call createAnswer in signalingState ' + pc.signalingState));
    }

    var sdp = SDPUtils.writeSessionBoilerplate(pc._sdpSessionId,
        pc._sdpSessionVersion++);
    if (pc.usingBundle) {
      sdp += 'a=group:BUNDLE ' + pc.transceivers.map(function(t) {
        return t.mid;
      }).join(' ') + '\r\n';
    }
    sdp += 'a=ice-options:trickle\r\n';

    var mediaSectionsInOffer = SDPUtils.getMediaSections(
        pc._remoteDescription.sdp).length;
    pc.transceivers.forEach(function(transceiver, sdpMLineIndex) {
      if (sdpMLineIndex + 1 > mediaSectionsInOffer) {
        return;
      }
      if (transceiver.rejected) {
        if (transceiver.kind === 'application') {
          if (transceiver.protocol === 'DTLS/SCTP') { // legacy fmt
            sdp += 'm=application 0 DTLS/SCTP 5000\r\n';
          } else {
            sdp += 'm=application 0 ' + transceiver.protocol +
                ' webrtc-datachannel\r\n';
          }
        } else if (transceiver.kind === 'audio') {
          sdp += 'm=audio 0 UDP/TLS/RTP/SAVPF 0\r\n' +
              'a=rtpmap:0 PCMU/8000\r\n';
        } else if (transceiver.kind === 'video') {
          sdp += 'm=video 0 UDP/TLS/RTP/SAVPF 120\r\n' +
              'a=rtpmap:120 VP8/90000\r\n';
        }
        sdp += 'c=IN IP4 0.0.0.0\r\n' +
            'a=inactive\r\n' +
            'a=mid:' + transceiver.mid + '\r\n';
        return;
      }

      // FIXME: look at direction.
      if (transceiver.stream) {
        var localTrack;
        if (transceiver.kind === 'audio') {
          localTrack = transceiver.stream.getAudioTracks()[0];
        } else if (transceiver.kind === 'video') {
          localTrack = transceiver.stream.getVideoTracks()[0];
        }
        if (localTrack) {
          // add RTX
          if (edgeVersion >= 15019 && transceiver.kind === 'video' &&
              !transceiver.sendEncodingParameters[0].rtx) {
            transceiver.sendEncodingParameters[0].rtx = {
              ssrc: transceiver.sendEncodingParameters[0].ssrc + 1
            };
          }
        }
      }

      // Calculate intersection of capabilities.
      var commonCapabilities = getCommonCapabilities(
          transceiver.localCapabilities,
          transceiver.remoteCapabilities);

      var hasRtx = commonCapabilities.codecs.filter(function(c) {
        return c.name.toLowerCase() === 'rtx';
      }).length;
      if (!hasRtx && transceiver.sendEncodingParameters[0].rtx) {
        delete transceiver.sendEncodingParameters[0].rtx;
      }

      sdp += writeMediaSection(transceiver, commonCapabilities,
          'answer', transceiver.stream, pc._dtlsRole);
      if (transceiver.rtcpParameters &&
          transceiver.rtcpParameters.reducedSize) {
        sdp += 'a=rtcp-rsize\r\n';
      }
    });

    var desc = new window.RTCSessionDescription({
      type: 'answer',
      sdp: sdp
    });
    return Promise.resolve(desc);
  };

  RTCPeerConnection.prototype.addIceCandidate = function(candidate) {
    var pc = this;
    var sections;
    if (candidate && !(candidate.sdpMLineIndex !== undefined ||
        candidate.sdpMid)) {
      return Promise.reject(new TypeError('sdpMLineIndex or sdpMid required'));
    }

    // TODO: needs to go into ops queue.
    return new Promise(function(resolve, reject) {
      if (!pc._remoteDescription) {
        return reject(makeError('InvalidStateError',
            'Can not add ICE candidate without a remote description'));
      } else if (!candidate || candidate.candidate === '') {
        for (var j = 0; j < pc.transceivers.length; j++) {
          if (pc.transceivers[j].rejected) {
            continue;
          }
          pc.transceivers[j].iceTransport.addRemoteCandidate({});
          sections = SDPUtils.getMediaSections(pc._remoteDescription.sdp);
          sections[j] += 'a=end-of-candidates\r\n';
          pc._remoteDescription.sdp =
              SDPUtils.getDescription(pc._remoteDescription.sdp) +
              sections.join('');
          if (pc.usingBundle) {
            break;
          }
        }
      } else {
        var sdpMLineIndex = candidate.sdpMLineIndex;
        if (candidate.sdpMid) {
          for (var i = 0; i < pc.transceivers.length; i++) {
            if (pc.transceivers[i].mid === candidate.sdpMid) {
              sdpMLineIndex = i;
              break;
            }
          }
        }
        var transceiver = pc.transceivers[sdpMLineIndex];
        if (transceiver) {
          if (transceiver.rejected) {
            return resolve();
          }
          var cand = Object.keys(candidate.candidate).length > 0 ?
              SDPUtils.parseCandidate(candidate.candidate) : {};
          // Ignore Chrome's invalid candidates since Edge does not like them.
          if (cand.protocol === 'tcp' && (cand.port === 0 || cand.port === 9)) {
            return resolve();
          }
          // Ignore RTCP candidates, we assume RTCP-MUX.
          if (cand.component && cand.component !== 1) {
            return resolve();
          }
          // when using bundle, avoid adding candidates to the wrong
          // ice transport. And avoid adding candidates added in the SDP.
          if (sdpMLineIndex === 0 || (sdpMLineIndex > 0 &&
              transceiver.iceTransport !== pc.transceivers[0].iceTransport)) {
            if (!maybeAddCandidate(transceiver.iceTransport, cand)) {
              return reject(makeError('OperationError',
                  'Can not add ICE candidate'));
            }
          }

          // update the remoteDescription.
          var candidateString = candidate.candidate.trim();
          if (candidateString.indexOf('a=') === 0) {
            candidateString = candidateString.substr(2);
          }
          sections = SDPUtils.getMediaSections(pc._remoteDescription.sdp);
          sections[sdpMLineIndex] += 'a=' +
              (cand.type ? candidateString : 'end-of-candidates')
              + '\r\n';
          pc._remoteDescription.sdp =
              SDPUtils.getDescription(pc._remoteDescription.sdp) +
              sections.join('');
        } else {
          return reject(makeError('OperationError',
              'Can not add ICE candidate'));
        }
      }
      resolve();
    });
  };

  RTCPeerConnection.prototype.getStats = function(selector) {
    if (selector && selector instanceof window.MediaStreamTrack) {
      var senderOrReceiver = null;
      this.transceivers.forEach(function(transceiver) {
        if (transceiver.rtpSender &&
            transceiver.rtpSender.track === selector) {
          senderOrReceiver = transceiver.rtpSender;
        } else if (transceiver.rtpReceiver &&
            transceiver.rtpReceiver.track === selector) {
          senderOrReceiver = transceiver.rtpReceiver;
        }
      });
      if (!senderOrReceiver) {
        throw makeError('InvalidAccessError', 'Invalid selector.');
      }
      return senderOrReceiver.getStats();
    }

    var promises = [];
    this.transceivers.forEach(function(transceiver) {
      ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport',
          'dtlsTransport'].forEach(function(method) {
            if (transceiver[method]) {
              promises.push(transceiver[method].getStats());
            }
          });
    });
    return Promise.all(promises).then(function(allStats) {
      var results = new Map();
      allStats.forEach(function(stats) {
        stats.forEach(function(stat) {
          results.set(stat.id, stat);
        });
      });
      return results;
    });
  };

  // fix low-level stat names and return Map instead of object.
  var ortcObjects = ['RTCRtpSender', 'RTCRtpReceiver', 'RTCIceGatherer',
    'RTCIceTransport', 'RTCDtlsTransport'];
  ortcObjects.forEach(function(ortcObjectName) {
    var obj = window[ortcObjectName];
    if (obj && obj.prototype && obj.prototype.getStats) {
      var nativeGetstats = obj.prototype.getStats;
      obj.prototype.getStats = function() {
        return nativeGetstats.apply(this)
        .then(function(nativeStats) {
          var mapStats = new Map();
          Object.keys(nativeStats).forEach(function(id) {
            nativeStats[id].type = fixStatsType(nativeStats[id]);
            mapStats.set(id, nativeStats[id]);
          });
          return mapStats;
        });
      };
    }
  });

  // legacy callback shims. Should be moved to adapter.js some days.
  var methods = ['createOffer', 'createAnswer'];
  methods.forEach(function(method) {
    var nativeMethod = RTCPeerConnection.prototype[method];
    RTCPeerConnection.prototype[method] = function() {
      var args = arguments;
      if (typeof args[0] === 'function' ||
          typeof args[1] === 'function') { // legacy
        return nativeMethod.apply(this, [arguments[2]])
        .then(function(description) {
          if (typeof args[0] === 'function') {
            args[0].apply(null, [description]);
          }
        }, function(error) {
          if (typeof args[1] === 'function') {
            args[1].apply(null, [error]);
          }
        });
      }
      return nativeMethod.apply(this, arguments);
    };
  });

  methods = ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'];
  methods.forEach(function(method) {
    var nativeMethod = RTCPeerConnection.prototype[method];
    RTCPeerConnection.prototype[method] = function() {
      var args = arguments;
      if (typeof args[1] === 'function' ||
          typeof args[2] === 'function') { // legacy
        return nativeMethod.apply(this, arguments)
        .then(function() {
          if (typeof args[1] === 'function') {
            args[1].apply(null);
          }
        }, function(error) {
          if (typeof args[2] === 'function') {
            args[2].apply(null, [error]);
          }
        });
      }
      return nativeMethod.apply(this, arguments);
    };
  });

  // getStats is special. It doesn't have a spec legacy method yet we support
  // getStats(something, cb) without error callbacks.
  ['getStats'].forEach(function(method) {
    var nativeMethod = RTCPeerConnection.prototype[method];
    RTCPeerConnection.prototype[method] = function() {
      var args = arguments;
      if (typeof args[1] === 'function') {
        return nativeMethod.apply(this, arguments)
        .then(function() {
          if (typeof args[1] === 'function') {
            args[1].apply(null);
          }
        });
      }
      return nativeMethod.apply(this, arguments);
    };
  });

  return RTCPeerConnection;
};

},{"sdp":15}],15:[function(require,module,exports){
/* eslint-env node */
'use strict';

// SDP helpers.
var SDPUtils = {};

// Generate an alphanumeric identifier for cname or mids.
// TODO: use UUIDs instead? https://gist.github.com/jed/982883
SDPUtils.generateIdentifier = function() {
  return Math.random().toString(36).substr(2, 10);
};

// The RTCP CNAME used by all peerconnections from the same JS.
SDPUtils.localCName = SDPUtils.generateIdentifier();

// Splits SDP into lines, dealing with both CRLF and LF.
SDPUtils.splitLines = function(blob) {
  return blob.trim().split('\n').map(function(line) {
    return line.trim();
  });
};
// Splits SDP into sessionpart and mediasections. Ensures CRLF.
SDPUtils.splitSections = function(blob) {
  var parts = blob.split('\nm=');
  return parts.map(function(part, index) {
    return (index > 0 ? 'm=' + part : part).trim() + '\r\n';
  });
};

// returns the session description.
SDPUtils.getDescription = function(blob) {
  var sections = SDPUtils.splitSections(blob);
  return sections && sections[0];
};

// returns the individual media sections.
SDPUtils.getMediaSections = function(blob) {
  var sections = SDPUtils.splitSections(blob);
  sections.shift();
  return sections;
};

// Returns lines that start with a certain prefix.
SDPUtils.matchPrefix = function(blob, prefix) {
  return SDPUtils.splitLines(blob).filter(function(line) {
    return line.indexOf(prefix) === 0;
  });
};

// Parses an ICE candidate line. Sample input:
// candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8
// rport 55996"
SDPUtils.parseCandidate = function(line) {
  var parts;
  // Parse both variants.
  if (line.indexOf('a=candidate:') === 0) {
    parts = line.substring(12).split(' ');
  } else {
    parts = line.substring(10).split(' ');
  }

  var candidate = {
    foundation: parts[0],
    component: parseInt(parts[1], 10),
    protocol: parts[2].toLowerCase(),
    priority: parseInt(parts[3], 10),
    ip: parts[4],
    address: parts[4], // address is an alias for ip.
    port: parseInt(parts[5], 10),
    // skip parts[6] == 'typ'
    type: parts[7]
  };

  for (var i = 8; i < parts.length; i += 2) {
    switch (parts[i]) {
      case 'raddr':
        candidate.relatedAddress = parts[i + 1];
        break;
      case 'rport':
        candidate.relatedPort = parseInt(parts[i + 1], 10);
        break;
      case 'tcptype':
        candidate.tcpType = parts[i + 1];
        break;
      case 'ufrag':
        candidate.ufrag = parts[i + 1]; // for backward compability.
        candidate.usernameFragment = parts[i + 1];
        break;
      default: // extension handling, in particular ufrag
        candidate[parts[i]] = parts[i + 1];
        break;
    }
  }
  return candidate;
};

// Translates a candidate object into SDP candidate attribute.
SDPUtils.writeCandidate = function(candidate) {
  var sdp = [];
  sdp.push(candidate.foundation);
  sdp.push(candidate.component);
  sdp.push(candidate.protocol.toUpperCase());
  sdp.push(candidate.priority);
  sdp.push(candidate.address || candidate.ip);
  sdp.push(candidate.port);

  var type = candidate.type;
  sdp.push('typ');
  sdp.push(type);
  if (type !== 'host' && candidate.relatedAddress &&
      candidate.relatedPort) {
    sdp.push('raddr');
    sdp.push(candidate.relatedAddress);
    sdp.push('rport');
    sdp.push(candidate.relatedPort);
  }
  if (candidate.tcpType && candidate.protocol.toLowerCase() === 'tcp') {
    sdp.push('tcptype');
    sdp.push(candidate.tcpType);
  }
  if (candidate.usernameFragment || candidate.ufrag) {
    sdp.push('ufrag');
    sdp.push(candidate.usernameFragment || candidate.ufrag);
  }
  return 'candidate:' + sdp.join(' ');
};

// Parses an ice-options line, returns an array of option tags.
// a=ice-options:foo bar
SDPUtils.parseIceOptions = function(line) {
  return line.substr(14).split(' ');
};

// Parses an rtpmap line, returns RTCRtpCoddecParameters. Sample input:
// a=rtpmap:111 opus/48000/2
SDPUtils.parseRtpMap = function(line) {
  var parts = line.substr(9).split(' ');
  var parsed = {
    payloadType: parseInt(parts.shift(), 10) // was: id
  };

  parts = parts[0].split('/');

  parsed.name = parts[0];
  parsed.clockRate = parseInt(parts[1], 10); // was: clockrate
  parsed.channels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
  // legacy alias, got renamed back to channels in ORTC.
  parsed.numChannels = parsed.channels;
  return parsed;
};

// Generate an a=rtpmap line from RTCRtpCodecCapability or
// RTCRtpCodecParameters.
SDPUtils.writeRtpMap = function(codec) {
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  var channels = codec.channels || codec.numChannels || 1;
  return 'a=rtpmap:' + pt + ' ' + codec.name + '/' + codec.clockRate +
      (channels !== 1 ? '/' + channels : '') + '\r\n';
};

// Parses an a=extmap line (headerextension from RFC 5285). Sample input:
// a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
// a=extmap:2/sendonly urn:ietf:params:rtp-hdrext:toffset
SDPUtils.parseExtmap = function(line) {
  var parts = line.substr(9).split(' ');
  return {
    id: parseInt(parts[0], 10),
    direction: parts[0].indexOf('/') > 0 ? parts[0].split('/')[1] : 'sendrecv',
    uri: parts[1]
  };
};

// Generates a=extmap line from RTCRtpHeaderExtensionParameters or
// RTCRtpHeaderExtension.
SDPUtils.writeExtmap = function(headerExtension) {
  return 'a=extmap:' + (headerExtension.id || headerExtension.preferredId) +
      (headerExtension.direction && headerExtension.direction !== 'sendrecv'
        ? '/' + headerExtension.direction
        : '') +
      ' ' + headerExtension.uri + '\r\n';
};

// Parses an ftmp line, returns dictionary. Sample input:
// a=fmtp:96 vbr=on;cng=on
// Also deals with vbr=on; cng=on
SDPUtils.parseFmtp = function(line) {
  var parsed = {};
  var kv;
  var parts = line.substr(line.indexOf(' ') + 1).split(';');
  for (var j = 0; j < parts.length; j++) {
    kv = parts[j].trim().split('=');
    parsed[kv[0].trim()] = kv[1];
  }
  return parsed;
};

// Generates an a=ftmp line from RTCRtpCodecCapability or RTCRtpCodecParameters.
SDPUtils.writeFmtp = function(codec) {
  var line = '';
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  if (codec.parameters && Object.keys(codec.parameters).length) {
    var params = [];
    Object.keys(codec.parameters).forEach(function(param) {
      if (codec.parameters[param]) {
        params.push(param + '=' + codec.parameters[param]);
      } else {
        params.push(param);
      }
    });
    line += 'a=fmtp:' + pt + ' ' + params.join(';') + '\r\n';
  }
  return line;
};

// Parses an rtcp-fb line, returns RTCPRtcpFeedback object. Sample input:
// a=rtcp-fb:98 nack rpsi
SDPUtils.parseRtcpFb = function(line) {
  var parts = line.substr(line.indexOf(' ') + 1).split(' ');
  return {
    type: parts.shift(),
    parameter: parts.join(' ')
  };
};
// Generate a=rtcp-fb lines from RTCRtpCodecCapability or RTCRtpCodecParameters.
SDPUtils.writeRtcpFb = function(codec) {
  var lines = '';
  var pt = codec.payloadType;
  if (codec.preferredPayloadType !== undefined) {
    pt = codec.preferredPayloadType;
  }
  if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
    // FIXME: special handling for trr-int?
    codec.rtcpFeedback.forEach(function(fb) {
      lines += 'a=rtcp-fb:' + pt + ' ' + fb.type +
      (fb.parameter && fb.parameter.length ? ' ' + fb.parameter : '') +
          '\r\n';
    });
  }
  return lines;
};

// Parses an RFC 5576 ssrc media attribute. Sample input:
// a=ssrc:3735928559 cname:something
SDPUtils.parseSsrcMedia = function(line) {
  var sp = line.indexOf(' ');
  var parts = {
    ssrc: parseInt(line.substr(7, sp - 7), 10)
  };
  var colon = line.indexOf(':', sp);
  if (colon > -1) {
    parts.attribute = line.substr(sp + 1, colon - sp - 1);
    parts.value = line.substr(colon + 1);
  } else {
    parts.attribute = line.substr(sp + 1);
  }
  return parts;
};

SDPUtils.parseSsrcGroup = function(line) {
  var parts = line.substr(13).split(' ');
  return {
    semantics: parts.shift(),
    ssrcs: parts.map(function(ssrc) {
      return parseInt(ssrc, 10);
    })
  };
};

// Extracts the MID (RFC 5888) from a media section.
// returns the MID or undefined if no mid line was found.
SDPUtils.getMid = function(mediaSection) {
  var mid = SDPUtils.matchPrefix(mediaSection, 'a=mid:')[0];
  if (mid) {
    return mid.substr(6);
  }
};

SDPUtils.parseFingerprint = function(line) {
  var parts = line.substr(14).split(' ');
  return {
    algorithm: parts[0].toLowerCase(), // algorithm is case-sensitive in Edge.
    value: parts[1]
  };
};

// Extracts DTLS parameters from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the fingerprint line as input. See also getIceParameters.
SDPUtils.getDtlsParameters = function(mediaSection, sessionpart) {
  var lines = SDPUtils.matchPrefix(mediaSection + sessionpart,
    'a=fingerprint:');
  // Note: a=setup line is ignored since we use the 'auto' role.
  // Note2: 'algorithm' is not case sensitive except in Edge.
  return {
    role: 'auto',
    fingerprints: lines.map(SDPUtils.parseFingerprint)
  };
};

// Serializes DTLS parameters to SDP.
SDPUtils.writeDtlsParameters = function(params, setupType) {
  var sdp = 'a=setup:' + setupType + '\r\n';
  params.fingerprints.forEach(function(fp) {
    sdp += 'a=fingerprint:' + fp.algorithm + ' ' + fp.value + '\r\n';
  });
  return sdp;
};

// Parses a=crypto lines into
//   https://rawgit.com/aboba/edgertc/master/msortc-rs4.html#dictionary-rtcsrtpsdesparameters-members
SDPUtils.parseCryptoLine = function(line) {
  var parts = line.substr(9).split(' ');
  return {
    tag: parseInt(parts[0], 10),
    cryptoSuite: parts[1],
    keyParams: parts[2],
    sessionParams: parts.slice(3),
  };
};

SDPUtils.writeCryptoLine = function(parameters) {
  return 'a=crypto:' + parameters.tag + ' ' +
    parameters.cryptoSuite + ' ' +
    (typeof parameters.keyParams === 'object'
      ? SDPUtils.writeCryptoKeyParams(parameters.keyParams)
      : parameters.keyParams) +
    (parameters.sessionParams ? ' ' + parameters.sessionParams.join(' ') : '') +
    '\r\n';
};

// Parses the crypto key parameters into
//   https://rawgit.com/aboba/edgertc/master/msortc-rs4.html#rtcsrtpkeyparam*
SDPUtils.parseCryptoKeyParams = function(keyParams) {
  if (keyParams.indexOf('inline:') !== 0) {
    return null;
  }
  var parts = keyParams.substr(7).split('|');
  return {
    keyMethod: 'inline',
    keySalt: parts[0],
    lifeTime: parts[1],
    mkiValue: parts[2] ? parts[2].split(':')[0] : undefined,
    mkiLength: parts[2] ? parts[2].split(':')[1] : undefined,
  };
};

SDPUtils.writeCryptoKeyParams = function(keyParams) {
  return keyParams.keyMethod + ':'
    + keyParams.keySalt +
    (keyParams.lifeTime ? '|' + keyParams.lifeTime : '') +
    (keyParams.mkiValue && keyParams.mkiLength
      ? '|' + keyParams.mkiValue + ':' + keyParams.mkiLength
      : '');
};

// Extracts all SDES paramters.
SDPUtils.getCryptoParameters = function(mediaSection, sessionpart) {
  var lines = SDPUtils.matchPrefix(mediaSection + sessionpart,
    'a=crypto:');
  return lines.map(SDPUtils.parseCryptoLine);
};

// Parses ICE information from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the ice-ufrag and ice-pwd lines as input.
SDPUtils.getIceParameters = function(mediaSection, sessionpart) {
  var ufrag = SDPUtils.matchPrefix(mediaSection + sessionpart,
    'a=ice-ufrag:')[0];
  var pwd = SDPUtils.matchPrefix(mediaSection + sessionpart,
    'a=ice-pwd:')[0];
  if (!(ufrag && pwd)) {
    return null;
  }
  return {
    usernameFragment: ufrag.substr(12),
    password: pwd.substr(10),
  };
};

// Serializes ICE parameters to SDP.
SDPUtils.writeIceParameters = function(params) {
  return 'a=ice-ufrag:' + params.usernameFragment + '\r\n' +
      'a=ice-pwd:' + params.password + '\r\n';
};

// Parses the SDP media section and returns RTCRtpParameters.
SDPUtils.parseRtpParameters = function(mediaSection) {
  var description = {
    codecs: [],
    headerExtensions: [],
    fecMechanisms: [],
    rtcp: []
  };
  var lines = SDPUtils.splitLines(mediaSection);
  var mline = lines[0].split(' ');
  for (var i = 3; i < mline.length; i++) { // find all codecs from mline[3..]
    var pt = mline[i];
    var rtpmapline = SDPUtils.matchPrefix(
      mediaSection, 'a=rtpmap:' + pt + ' ')[0];
    if (rtpmapline) {
      var codec = SDPUtils.parseRtpMap(rtpmapline);
      var fmtps = SDPUtils.matchPrefix(
        mediaSection, 'a=fmtp:' + pt + ' ');
      // Only the first a=fmtp:<pt> is considered.
      codec.parameters = fmtps.length ? SDPUtils.parseFmtp(fmtps[0]) : {};
      codec.rtcpFeedback = SDPUtils.matchPrefix(
        mediaSection, 'a=rtcp-fb:' + pt + ' ')
        .map(SDPUtils.parseRtcpFb);
      description.codecs.push(codec);
      // parse FEC mechanisms from rtpmap lines.
      switch (codec.name.toUpperCase()) {
        case 'RED':
        case 'ULPFEC':
          description.fecMechanisms.push(codec.name.toUpperCase());
          break;
        default: // only RED and ULPFEC are recognized as FEC mechanisms.
          break;
      }
    }
  }
  SDPUtils.matchPrefix(mediaSection, 'a=extmap:').forEach(function(line) {
    description.headerExtensions.push(SDPUtils.parseExtmap(line));
  });
  // FIXME: parse rtcp.
  return description;
};

// Generates parts of the SDP media section describing the capabilities /
// parameters.
SDPUtils.writeRtpDescription = function(kind, caps) {
  var sdp = '';

  // Build the mline.
  sdp += 'm=' + kind + ' ';
  sdp += caps.codecs.length > 0 ? '9' : '0'; // reject if no codecs.
  sdp += ' UDP/TLS/RTP/SAVPF ';
  sdp += caps.codecs.map(function(codec) {
    if (codec.preferredPayloadType !== undefined) {
      return codec.preferredPayloadType;
    }
    return codec.payloadType;
  }).join(' ') + '\r\n';

  sdp += 'c=IN IP4 0.0.0.0\r\n';
  sdp += 'a=rtcp:9 IN IP4 0.0.0.0\r\n';

  // Add a=rtpmap lines for each codec. Also fmtp and rtcp-fb.
  caps.codecs.forEach(function(codec) {
    sdp += SDPUtils.writeRtpMap(codec);
    sdp += SDPUtils.writeFmtp(codec);
    sdp += SDPUtils.writeRtcpFb(codec);
  });
  var maxptime = 0;
  caps.codecs.forEach(function(codec) {
    if (codec.maxptime > maxptime) {
      maxptime = codec.maxptime;
    }
  });
  if (maxptime > 0) {
    sdp += 'a=maxptime:' + maxptime + '\r\n';
  }
  sdp += 'a=rtcp-mux\r\n';

  if (caps.headerExtensions) {
    caps.headerExtensions.forEach(function(extension) {
      sdp += SDPUtils.writeExtmap(extension);
    });
  }
  // FIXME: write fecMechanisms.
  return sdp;
};

// Parses the SDP media section and returns an array of
// RTCRtpEncodingParameters.
SDPUtils.parseRtpEncodingParameters = function(mediaSection) {
  var encodingParameters = [];
  var description = SDPUtils.parseRtpParameters(mediaSection);
  var hasRed = description.fecMechanisms.indexOf('RED') !== -1;
  var hasUlpfec = description.fecMechanisms.indexOf('ULPFEC') !== -1;

  // filter a=ssrc:... cname:, ignore PlanB-msid
  var ssrcs = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
    .map(function(line) {
      return SDPUtils.parseSsrcMedia(line);
    })
    .filter(function(parts) {
      return parts.attribute === 'cname';
    });
  var primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
  var secondarySsrc;

  var flows = SDPUtils.matchPrefix(mediaSection, 'a=ssrc-group:FID')
    .map(function(line) {
      var parts = line.substr(17).split(' ');
      return parts.map(function(part) {
        return parseInt(part, 10);
      });
    });
  if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
    secondarySsrc = flows[0][1];
  }

  description.codecs.forEach(function(codec) {
    if (codec.name.toUpperCase() === 'RTX' && codec.parameters.apt) {
      var encParam = {
        ssrc: primarySsrc,
        codecPayloadType: parseInt(codec.parameters.apt, 10)
      };
      if (primarySsrc && secondarySsrc) {
        encParam.rtx = {ssrc: secondarySsrc};
      }
      encodingParameters.push(encParam);
      if (hasRed) {
        encParam = JSON.parse(JSON.stringify(encParam));
        encParam.fec = {
          ssrc: primarySsrc,
          mechanism: hasUlpfec ? 'red+ulpfec' : 'red'
        };
        encodingParameters.push(encParam);
      }
    }
  });
  if (encodingParameters.length === 0 && primarySsrc) {
    encodingParameters.push({
      ssrc: primarySsrc
    });
  }

  // we support both b=AS and b=TIAS but interpret AS as TIAS.
  var bandwidth = SDPUtils.matchPrefix(mediaSection, 'b=');
  if (bandwidth.length) {
    if (bandwidth[0].indexOf('b=TIAS:') === 0) {
      bandwidth = parseInt(bandwidth[0].substr(7), 10);
    } else if (bandwidth[0].indexOf('b=AS:') === 0) {
      // use formula from JSEP to convert b=AS to TIAS value.
      bandwidth = parseInt(bandwidth[0].substr(5), 10) * 1000 * 0.95
          - (50 * 40 * 8);
    } else {
      bandwidth = undefined;
    }
    encodingParameters.forEach(function(params) {
      params.maxBitrate = bandwidth;
    });
  }
  return encodingParameters;
};

// parses http://draft.ortc.org/#rtcrtcpparameters*
SDPUtils.parseRtcpParameters = function(mediaSection) {
  var rtcpParameters = {};

  // Gets the first SSRC. Note tha with RTX there might be multiple
  // SSRCs.
  var remoteSsrc = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
    .map(function(line) {
      return SDPUtils.parseSsrcMedia(line);
    })
    .filter(function(obj) {
      return obj.attribute === 'cname';
    })[0];
  if (remoteSsrc) {
    rtcpParameters.cname = remoteSsrc.value;
    rtcpParameters.ssrc = remoteSsrc.ssrc;
  }

  // Edge uses the compound attribute instead of reducedSize
  // compound is !reducedSize
  var rsize = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-rsize');
  rtcpParameters.reducedSize = rsize.length > 0;
  rtcpParameters.compound = rsize.length === 0;

  // parses the rtcp-mux attrіbute.
  // Note that Edge does not support unmuxed RTCP.
  var mux = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-mux');
  rtcpParameters.mux = mux.length > 0;

  return rtcpParameters;
};

// parses either a=msid: or a=ssrc:... msid lines and returns
// the id of the MediaStream and MediaStreamTrack.
SDPUtils.parseMsid = function(mediaSection) {
  var parts;
  var spec = SDPUtils.matchPrefix(mediaSection, 'a=msid:');
  if (spec.length === 1) {
    parts = spec[0].substr(7).split(' ');
    return {stream: parts[0], track: parts[1]};
  }
  var planB = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
    .map(function(line) {
      return SDPUtils.parseSsrcMedia(line);
    })
    .filter(function(msidParts) {
      return msidParts.attribute === 'msid';
    });
  if (planB.length > 0) {
    parts = planB[0].value.split(' ');
    return {stream: parts[0], track: parts[1]};
  }
};

// SCTP
// parses draft-ietf-mmusic-sctp-sdp-26 first and falls back
// to draft-ietf-mmusic-sctp-sdp-05
SDPUtils.parseSctpDescription = function(mediaSection) {
  var mline = SDPUtils.parseMLine(mediaSection);
  var maxSizeLine = SDPUtils.matchPrefix(mediaSection, 'a=max-message-size:');
  var maxMessageSize;
  if (maxSizeLine.length > 0) {
    maxMessageSize = parseInt(maxSizeLine[0].substr(19), 10);
  }
  if (isNaN(maxMessageSize)) {
    maxMessageSize = 65536;
  }
  var sctpPort = SDPUtils.matchPrefix(mediaSection, 'a=sctp-port:');
  if (sctpPort.length > 0) {
    return {
      port: parseInt(sctpPort[0].substr(12), 10),
      protocol: mline.fmt,
      maxMessageSize: maxMessageSize
    };
  }
  var sctpMapLines = SDPUtils.matchPrefix(mediaSection, 'a=sctpmap:');
  if (sctpMapLines.length > 0) {
    var parts = SDPUtils.matchPrefix(mediaSection, 'a=sctpmap:')[0]
      .substr(10)
      .split(' ');
    return {
      port: parseInt(parts[0], 10),
      protocol: parts[1],
      maxMessageSize: maxMessageSize
    };
  }
};

// SCTP
// outputs the draft-ietf-mmusic-sctp-sdp-26 version that all browsers
// support by now receiving in this format, unless we originally parsed
// as the draft-ietf-mmusic-sctp-sdp-05 format (indicated by the m-line
// protocol of DTLS/SCTP -- without UDP/ or TCP/)
SDPUtils.writeSctpDescription = function(media, sctp) {
  var output = [];
  if (media.protocol !== 'DTLS/SCTP') {
    output = [
      'm=' + media.kind + ' 9 ' + media.protocol + ' ' + sctp.protocol + '\r\n',
      'c=IN IP4 0.0.0.0\r\n',
      'a=sctp-port:' + sctp.port + '\r\n'
    ];
  } else {
    output = [
      'm=' + media.kind + ' 9 ' + media.protocol + ' ' + sctp.port + '\r\n',
      'c=IN IP4 0.0.0.0\r\n',
      'a=sctpmap:' + sctp.port + ' ' + sctp.protocol + ' 65535\r\n'
    ];
  }
  if (sctp.maxMessageSize !== undefined) {
    output.push('a=max-message-size:' + sctp.maxMessageSize + '\r\n');
  }
  return output.join('');
};

// Generate a session ID for SDP.
// https://tools.ietf.org/html/draft-ietf-rtcweb-jsep-20#section-5.2.1
// recommends using a cryptographically random +ve 64-bit value
// but right now this should be acceptable and within the right range
SDPUtils.generateSessionId = function() {
  return Math.random().toString().substr(2, 21);
};

// Write boilder plate for start of SDP
// sessId argument is optional - if not supplied it will
// be generated randomly
// sessVersion is optional and defaults to 2
// sessUser is optional and defaults to 'thisisadapterortc'
SDPUtils.writeSessionBoilerplate = function(sessId, sessVer, sessUser) {
  var sessionId;
  var version = sessVer !== undefined ? sessVer : 2;
  if (sessId) {
    sessionId = sessId;
  } else {
    sessionId = SDPUtils.generateSessionId();
  }
  var user = sessUser || 'thisisadapterortc';
  // FIXME: sess-id should be an NTP timestamp.
  return 'v=0\r\n' +
      'o=' + user + ' ' + sessionId + ' ' + version +
        ' IN IP4 127.0.0.1\r\n' +
      's=-\r\n' +
      't=0 0\r\n';
};

SDPUtils.writeMediaSection = function(transceiver, caps, type, stream) {
  var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

  // Map ICE parameters (ufrag, pwd) to SDP.
  sdp += SDPUtils.writeIceParameters(
    transceiver.iceGatherer.getLocalParameters());

  // Map DTLS parameters to SDP.
  sdp += SDPUtils.writeDtlsParameters(
    transceiver.dtlsTransport.getLocalParameters(),
    type === 'offer' ? 'actpass' : 'active');

  sdp += 'a=mid:' + transceiver.mid + '\r\n';

  if (transceiver.direction) {
    sdp += 'a=' + transceiver.direction + '\r\n';
  } else if (transceiver.rtpSender && transceiver.rtpReceiver) {
    sdp += 'a=sendrecv\r\n';
  } else if (transceiver.rtpSender) {
    sdp += 'a=sendonly\r\n';
  } else if (transceiver.rtpReceiver) {
    sdp += 'a=recvonly\r\n';
  } else {
    sdp += 'a=inactive\r\n';
  }

  if (transceiver.rtpSender) {
    // spec.
    var msid = 'msid:' + stream.id + ' ' +
        transceiver.rtpSender.track.id + '\r\n';
    sdp += 'a=' + msid;

    // for Chrome.
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
        ' ' + msid;
    if (transceiver.sendEncodingParameters[0].rtx) {
      sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
          ' ' + msid;
      sdp += 'a=ssrc-group:FID ' +
          transceiver.sendEncodingParameters[0].ssrc + ' ' +
          transceiver.sendEncodingParameters[0].rtx.ssrc +
          '\r\n';
    }
  }
  // FIXME: this should be written by writeRtpDescription.
  sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
      ' cname:' + SDPUtils.localCName + '\r\n';
  if (transceiver.rtpSender && transceiver.sendEncodingParameters[0].rtx) {
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
        ' cname:' + SDPUtils.localCName + '\r\n';
  }
  return sdp;
};

// Gets the direction from the mediaSection or the sessionpart.
SDPUtils.getDirection = function(mediaSection, sessionpart) {
  // Look for sendrecv, sendonly, recvonly, inactive, default to sendrecv.
  var lines = SDPUtils.splitLines(mediaSection);
  for (var i = 0; i < lines.length; i++) {
    switch (lines[i]) {
      case 'a=sendrecv':
      case 'a=sendonly':
      case 'a=recvonly':
      case 'a=inactive':
        return lines[i].substr(2);
      default:
        // FIXME: What should happen here?
    }
  }
  if (sessionpart) {
    return SDPUtils.getDirection(sessionpart);
  }
  return 'sendrecv';
};

SDPUtils.getKind = function(mediaSection) {
  var lines = SDPUtils.splitLines(mediaSection);
  var mline = lines[0].split(' ');
  return mline[0].substr(2);
};

SDPUtils.isRejected = function(mediaSection) {
  return mediaSection.split(' ', 2)[1] === '0';
};

SDPUtils.parseMLine = function(mediaSection) {
  var lines = SDPUtils.splitLines(mediaSection);
  var parts = lines[0].substr(2).split(' ');
  return {
    kind: parts[0],
    port: parseInt(parts[1], 10),
    protocol: parts[2],
    fmt: parts.slice(3).join(' ')
  };
};

SDPUtils.parseOLine = function(mediaSection) {
  var line = SDPUtils.matchPrefix(mediaSection, 'o=')[0];
  var parts = line.substr(2).split(' ');
  return {
    username: parts[0],
    sessionId: parts[1],
    sessionVersion: parseInt(parts[2], 10),
    netType: parts[3],
    addressType: parts[4],
    address: parts[5]
  };
};

// a very naive interpretation of a valid SDP.
SDPUtils.isValidSDP = function(blob) {
  if (typeof blob !== 'string' || blob.length === 0) {
    return false;
  }
  var lines = SDPUtils.splitLines(blob);
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].length < 2 || lines[i].charAt(1) !== '=') {
      return false;
    }
    // TODO: check the modifier a bit more.
  }
  return true;
};

// Expose public methods.
if (typeof module === 'object') {
  module.exports = SDPUtils;
}

},{}],16:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  return ([
    bth[buf[i++]], bth[buf[i++]],
    bth[buf[i++]], bth[buf[i++]], '-',
    bth[buf[i++]], bth[buf[i++]], '-',
    bth[buf[i++]], bth[buf[i++]], '-',
    bth[buf[i++]], bth[buf[i++]], '-',
    bth[buf[i++]], bth[buf[i++]],
    bth[buf[i++]], bth[buf[i++]],
    bth[buf[i++]], bth[buf[i++]]
  ]).join('');
}

module.exports = bytesToUuid;

},{}],17:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection

// getRandomValues needs to be invoked in a context where "this" is a Crypto
// implementation. Also, find the complete implementation of crypto on IE11.
var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto)) ||
                      (typeof(msCrypto) != 'undefined' && typeof window.msCrypto.getRandomValues == 'function' && msCrypto.getRandomValues.bind(msCrypto));

if (getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

  module.exports = function whatwgRNG() {
    getRandomValues(rnds8);
    return rnds8;
  };
} else {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);

  module.exports = function mathRNG() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

},{}],18:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":16,"./lib/rng":17}],19:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _adapter_factory = require('./adapter_factory.js');

var adapter = (0, _adapter_factory.adapterFactory)({ window: typeof window === 'undefined' ? undefined : window });
exports.default = adapter;

},{"./adapter_factory.js":20}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.adapterFactory = adapterFactory;

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

var _chrome_shim = require('./chrome/chrome_shim');

var chromeShim = _interopRequireWildcard(_chrome_shim);

var _edge_shim = require('./edge/edge_shim');

var edgeShim = _interopRequireWildcard(_edge_shim);

var _firefox_shim = require('./firefox/firefox_shim');

var firefoxShim = _interopRequireWildcard(_firefox_shim);

var _safari_shim = require('./safari/safari_shim');

var safariShim = _interopRequireWildcard(_safari_shim);

var _common_shim = require('./common_shim');

var commonShim = _interopRequireWildcard(_common_shim);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// Shimming starts here.
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
function adapterFactory() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      window = _ref.window;

  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    shimChrome: true,
    shimFirefox: true,
    shimEdge: true,
    shimSafari: true
  };

  // Utils.
  var logging = utils.log;
  var browserDetails = utils.detectBrowser(window);

  var adapter = {
    browserDetails: browserDetails,
    commonShim: commonShim,
    extractVersion: utils.extractVersion,
    disableLog: utils.disableLog,
    disableWarnings: utils.disableWarnings
  };

  // Shim browser if found.
  switch (browserDetails.browser) {
    case 'chrome':
      if (!chromeShim || !chromeShim.shimPeerConnection || !options.shimChrome) {
        logging('Chrome shim is not included in this adapter release.');
        return adapter;
      }
      if (browserDetails.version === null) {
        logging('Chrome shim can not determine version, not shimming.');
        return adapter;
      }
      logging('adapter.js shimming chrome.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = chromeShim;

      chromeShim.shimGetUserMedia(window);
      chromeShim.shimMediaStream(window);
      chromeShim.shimPeerConnection(window);
      chromeShim.shimOnTrack(window);
      chromeShim.shimAddTrackRemoveTrack(window);
      chromeShim.shimGetSendersWithDtmf(window);
      chromeShim.shimGetStats(window);
      chromeShim.shimSenderReceiverGetStats(window);
      chromeShim.fixNegotiationNeeded(window);

      commonShim.shimRTCIceCandidate(window);
      commonShim.shimConnectionState(window);
      commonShim.shimMaxMessageSize(window);
      commonShim.shimSendThrowTypeError(window);
      commonShim.removeAllowExtmapMixed(window);
      break;
    case 'firefox':
      if (!firefoxShim || !firefoxShim.shimPeerConnection || !options.shimFirefox) {
        logging('Firefox shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming firefox.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = firefoxShim;

      firefoxShim.shimGetUserMedia(window);
      firefoxShim.shimPeerConnection(window);
      firefoxShim.shimOnTrack(window);
      firefoxShim.shimRemoveStream(window);
      firefoxShim.shimSenderGetStats(window);
      firefoxShim.shimReceiverGetStats(window);
      firefoxShim.shimRTCDataChannel(window);
      firefoxShim.shimAddTransceiver(window);
      firefoxShim.shimGetParameters(window);
      firefoxShim.shimCreateOffer(window);
      firefoxShim.shimCreateAnswer(window);

      commonShim.shimRTCIceCandidate(window);
      commonShim.shimConnectionState(window);
      commonShim.shimMaxMessageSize(window);
      commonShim.shimSendThrowTypeError(window);
      break;
    case 'edge':
      if (!edgeShim || !edgeShim.shimPeerConnection || !options.shimEdge) {
        logging('MS edge shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming edge.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = edgeShim;

      edgeShim.shimGetUserMedia(window);
      edgeShim.shimGetDisplayMedia(window);
      edgeShim.shimPeerConnection(window);
      edgeShim.shimReplaceTrack(window);

      // the edge shim implements the full RTCIceCandidate object.

      commonShim.shimMaxMessageSize(window);
      commonShim.shimSendThrowTypeError(window);
      break;
    case 'safari':
      if (!safariShim || !options.shimSafari) {
        logging('Safari shim is not included in this adapter release.');
        return adapter;
      }
      logging('adapter.js shimming safari.');
      // Export to the adapter global object visible in the browser.
      adapter.browserShim = safariShim;

      safariShim.shimRTCIceServerUrls(window);
      safariShim.shimCreateOfferLegacy(window);
      safariShim.shimCallbacksAPI(window);
      safariShim.shimLocalStreamsAPI(window);
      safariShim.shimRemoteStreamsAPI(window);
      safariShim.shimTrackEventTransceiver(window);
      safariShim.shimGetUserMedia(window);
      safariShim.shimAudioContext(window);

      commonShim.shimRTCIceCandidate(window);
      commonShim.shimMaxMessageSize(window);
      commonShim.shimSendThrowTypeError(window);
      commonShim.removeAllowExtmapMixed(window);
      break;
    default:
      logging('Unsupported browser!');
      break;
  }

  return adapter;
}

// Browser shims.

},{"./chrome/chrome_shim":21,"./common_shim":24,"./edge/edge_shim":25,"./firefox/firefox_shim":29,"./safari/safari_shim":32,"./utils":33}],21:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shimGetDisplayMedia = exports.shimGetUserMedia = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _getusermedia = require('./getusermedia');

Object.defineProperty(exports, 'shimGetUserMedia', {
  enumerable: true,
  get: function get() {
    return _getusermedia.shimGetUserMedia;
  }
});

var _getdisplaymedia = require('./getdisplaymedia');

Object.defineProperty(exports, 'shimGetDisplayMedia', {
  enumerable: true,
  get: function get() {
    return _getdisplaymedia.shimGetDisplayMedia;
  }
});
exports.shimMediaStream = shimMediaStream;
exports.shimOnTrack = shimOnTrack;
exports.shimGetSendersWithDtmf = shimGetSendersWithDtmf;
exports.shimGetStats = shimGetStats;
exports.shimSenderReceiverGetStats = shimSenderReceiverGetStats;
exports.shimAddTrackRemoveTrackWithNative = shimAddTrackRemoveTrackWithNative;
exports.shimAddTrackRemoveTrack = shimAddTrackRemoveTrack;
exports.shimPeerConnection = shimPeerConnection;
exports.fixNegotiationNeeded = fixNegotiationNeeded;

var _utils = require('../utils.js');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function shimMediaStream(window) {
  window.MediaStream = window.MediaStream || window.webkitMediaStream;
}

function shimOnTrack(window) {
  if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection && !('ontrack' in window.RTCPeerConnection.prototype)) {
    Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
      get: function get() {
        return this._ontrack;
      },
      set: function set(f) {
        if (this._ontrack) {
          this.removeEventListener('track', this._ontrack);
        }
        this.addEventListener('track', this._ontrack = f);
      },

      enumerable: true,
      configurable: true
    });
    var origSetRemoteDescription = window.RTCPeerConnection.prototype.setRemoteDescription;
    window.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
      var _this = this;

      if (!this._ontrackpoly) {
        this._ontrackpoly = function (e) {
          // onaddstream does not fire when a track is added to an existing
          // stream. But stream.onaddtrack is implemented so we use that.
          e.stream.addEventListener('addtrack', function (te) {
            var receiver = void 0;
            if (window.RTCPeerConnection.prototype.getReceivers) {
              receiver = _this.getReceivers().find(function (r) {
                return r.track && r.track.id === te.track.id;
              });
            } else {
              receiver = { track: te.track };
            }

            var event = new Event('track');
            event.track = te.track;
            event.receiver = receiver;
            event.transceiver = { receiver: receiver };
            event.streams = [e.stream];
            _this.dispatchEvent(event);
          });
          e.stream.getTracks().forEach(function (track) {
            var receiver = void 0;
            if (window.RTCPeerConnection.prototype.getReceivers) {
              receiver = _this.getReceivers().find(function (r) {
                return r.track && r.track.id === track.id;
              });
            } else {
              receiver = { track: track };
            }
            var event = new Event('track');
            event.track = track;
            event.receiver = receiver;
            event.transceiver = { receiver: receiver };
            event.streams = [e.stream];
            _this.dispatchEvent(event);
          });
        };
        this.addEventListener('addstream', this._ontrackpoly);
      }
      return origSetRemoteDescription.apply(this, arguments);
    };
  } else {
    // even if RTCRtpTransceiver is in window, it is only used and
    // emitted in unified-plan. Unfortunately this means we need
    // to unconditionally wrap the event.
    utils.wrapPeerConnectionEvent(window, 'track', function (e) {
      if (!e.transceiver) {
        Object.defineProperty(e, 'transceiver', { value: { receiver: e.receiver } });
      }
      return e;
    });
  }
}

function shimGetSendersWithDtmf(window) {
  // Overrides addTrack/removeTrack, depends on shimAddTrackRemoveTrack.
  if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection && !('getSenders' in window.RTCPeerConnection.prototype) && 'createDTMFSender' in window.RTCPeerConnection.prototype) {
    var shimSenderWithDtmf = function shimSenderWithDtmf(pc, track) {
      return {
        track: track,
        get dtmf() {
          if (this._dtmf === undefined) {
            if (track.kind === 'audio') {
              this._dtmf = pc.createDTMFSender(track);
            } else {
              this._dtmf = null;
            }
          }
          return this._dtmf;
        },
        _pc: pc
      };
    };

    // augment addTrack when getSenders is not available.
    if (!window.RTCPeerConnection.prototype.getSenders) {
      window.RTCPeerConnection.prototype.getSenders = function getSenders() {
        this._senders = this._senders || [];
        return this._senders.slice(); // return a copy of the internal state.
      };
      var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
      window.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
        var sender = origAddTrack.apply(this, arguments);
        if (!sender) {
          sender = shimSenderWithDtmf(this, track);
          this._senders.push(sender);
        }
        return sender;
      };

      var origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;
      window.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
        origRemoveTrack.apply(this, arguments);
        var idx = this._senders.indexOf(sender);
        if (idx !== -1) {
          this._senders.splice(idx, 1);
        }
      };
    }
    var origAddStream = window.RTCPeerConnection.prototype.addStream;
    window.RTCPeerConnection.prototype.addStream = function addStream(stream) {
      var _this2 = this;

      this._senders = this._senders || [];
      origAddStream.apply(this, [stream]);
      stream.getTracks().forEach(function (track) {
        _this2._senders.push(shimSenderWithDtmf(_this2, track));
      });
    };

    var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
    window.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
      var _this3 = this;

      this._senders = this._senders || [];
      origRemoveStream.apply(this, [stream]);

      stream.getTracks().forEach(function (track) {
        var sender = _this3._senders.find(function (s) {
          return s.track === track;
        });
        if (sender) {
          // remove sender
          _this3._senders.splice(_this3._senders.indexOf(sender), 1);
        }
      });
    };
  } else if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection && 'getSenders' in window.RTCPeerConnection.prototype && 'createDTMFSender' in window.RTCPeerConnection.prototype && window.RTCRtpSender && !('dtmf' in window.RTCRtpSender.prototype)) {
    var origGetSenders = window.RTCPeerConnection.prototype.getSenders;
    window.RTCPeerConnection.prototype.getSenders = function getSenders() {
      var _this4 = this;

      var senders = origGetSenders.apply(this, []);
      senders.forEach(function (sender) {
        return sender._pc = _this4;
      });
      return senders;
    };

    Object.defineProperty(window.RTCRtpSender.prototype, 'dtmf', {
      get: function get() {
        if (this._dtmf === undefined) {
          if (this.track.kind === 'audio') {
            this._dtmf = this._pc.createDTMFSender(this.track);
          } else {
            this._dtmf = null;
          }
        }
        return this._dtmf;
      }
    });
  }
}

function shimGetStats(window) {
  if (!window.RTCPeerConnection) {
    return;
  }

  var origGetStats = window.RTCPeerConnection.prototype.getStats;
  window.RTCPeerConnection.prototype.getStats = function getStats() {
    var _this5 = this;

    var _arguments = Array.prototype.slice.call(arguments),
        selector = _arguments[0],
        onSucc = _arguments[1],
        onErr = _arguments[2];

    // If selector is a function then we are in the old style stats so just
    // pass back the original getStats format to avoid breaking old users.


    if (arguments.length > 0 && typeof selector === 'function') {
      return origGetStats.apply(this, arguments);
    }

    // When spec-style getStats is supported, return those when called with
    // either no arguments or the selector argument is null.
    if (origGetStats.length === 0 && (arguments.length === 0 || typeof selector !== 'function')) {
      return origGetStats.apply(this, []);
    }

    var fixChromeStats_ = function fixChromeStats_(response) {
      var standardReport = {};
      var reports = response.result();
      reports.forEach(function (report) {
        var standardStats = {
          id: report.id,
          timestamp: report.timestamp,
          type: {
            localcandidate: 'local-candidate',
            remotecandidate: 'remote-candidate'
          }[report.type] || report.type
        };
        report.names().forEach(function (name) {
          standardStats[name] = report.stat(name);
        });
        standardReport[standardStats.id] = standardStats;
      });

      return standardReport;
    };

    // shim getStats with maplike support
    var makeMapStats = function makeMapStats(stats) {
      return new Map(Object.keys(stats).map(function (key) {
        return [key, stats[key]];
      }));
    };

    if (arguments.length >= 2) {
      var successCallbackWrapper_ = function successCallbackWrapper_(response) {
        onSucc(makeMapStats(fixChromeStats_(response)));
      };

      return origGetStats.apply(this, [successCallbackWrapper_, selector]);
    }

    // promise-support
    return new Promise(function (resolve, reject) {
      origGetStats.apply(_this5, [function (response) {
        resolve(makeMapStats(fixChromeStats_(response)));
      }, reject]);
    }).then(onSucc, onErr);
  };
}

function shimSenderReceiverGetStats(window) {
  if (!((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection && window.RTCRtpSender && window.RTCRtpReceiver)) {
    return;
  }

  // shim sender stats.
  if (!('getStats' in window.RTCRtpSender.prototype)) {
    var origGetSenders = window.RTCPeerConnection.prototype.getSenders;
    if (origGetSenders) {
      window.RTCPeerConnection.prototype.getSenders = function getSenders() {
        var _this6 = this;

        var senders = origGetSenders.apply(this, []);
        senders.forEach(function (sender) {
          return sender._pc = _this6;
        });
        return senders;
      };
    }

    var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
    if (origAddTrack) {
      window.RTCPeerConnection.prototype.addTrack = function addTrack() {
        var sender = origAddTrack.apply(this, arguments);
        sender._pc = this;
        return sender;
      };
    }
    window.RTCRtpSender.prototype.getStats = function getStats() {
      var sender = this;
      return this._pc.getStats().then(function (result) {
        return (
          /* Note: this will include stats of all senders that
           *   send a track with the same id as sender.track as
           *   it is not possible to identify the RTCRtpSender.
           */
          utils.filterStats(result, sender.track, true)
        );
      });
    };
  }

  // shim receiver stats.
  if (!('getStats' in window.RTCRtpReceiver.prototype)) {
    var origGetReceivers = window.RTCPeerConnection.prototype.getReceivers;
    if (origGetReceivers) {
      window.RTCPeerConnection.prototype.getReceivers = function getReceivers() {
        var _this7 = this;

        var receivers = origGetReceivers.apply(this, []);
        receivers.forEach(function (receiver) {
          return receiver._pc = _this7;
        });
        return receivers;
      };
    }
    utils.wrapPeerConnectionEvent(window, 'track', function (e) {
      e.receiver._pc = e.srcElement;
      return e;
    });
    window.RTCRtpReceiver.prototype.getStats = function getStats() {
      var receiver = this;
      return this._pc.getStats().then(function (result) {
        return utils.filterStats(result, receiver.track, false);
      });
    };
  }

  if (!('getStats' in window.RTCRtpSender.prototype && 'getStats' in window.RTCRtpReceiver.prototype)) {
    return;
  }

  // shim RTCPeerConnection.getStats(track).
  var origGetStats = window.RTCPeerConnection.prototype.getStats;
  window.RTCPeerConnection.prototype.getStats = function getStats() {
    if (arguments.length > 0 && arguments[0] instanceof window.MediaStreamTrack) {
      var track = arguments[0];
      var sender = void 0;
      var receiver = void 0;
      var err = void 0;
      this.getSenders().forEach(function (s) {
        if (s.track === track) {
          if (sender) {
            err = true;
          } else {
            sender = s;
          }
        }
      });
      this.getReceivers().forEach(function (r) {
        if (r.track === track) {
          if (receiver) {
            err = true;
          } else {
            receiver = r;
          }
        }
        return r.track === track;
      });
      if (err || sender && receiver) {
        return Promise.reject(new DOMException('There are more than one sender or receiver for the track.', 'InvalidAccessError'));
      } else if (sender) {
        return sender.getStats();
      } else if (receiver) {
        return receiver.getStats();
      }
      return Promise.reject(new DOMException('There is no sender or receiver for the track.', 'InvalidAccessError'));
    }
    return origGetStats.apply(this, arguments);
  };
}

function shimAddTrackRemoveTrackWithNative(window) {
  // shim addTrack/removeTrack with native variants in order to make
  // the interactions with legacy getLocalStreams behave as in other browsers.
  // Keeps a mapping stream.id => [stream, rtpsenders...]
  window.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
    var _this8 = this;

    this._shimmedLocalStreams = this._shimmedLocalStreams || {};
    return Object.keys(this._shimmedLocalStreams).map(function (streamId) {
      return _this8._shimmedLocalStreams[streamId][0];
    });
  };

  var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
  window.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
    if (!stream) {
      return origAddTrack.apply(this, arguments);
    }
    this._shimmedLocalStreams = this._shimmedLocalStreams || {};

    var sender = origAddTrack.apply(this, arguments);
    if (!this._shimmedLocalStreams[stream.id]) {
      this._shimmedLocalStreams[stream.id] = [stream, sender];
    } else if (this._shimmedLocalStreams[stream.id].indexOf(sender) === -1) {
      this._shimmedLocalStreams[stream.id].push(sender);
    }
    return sender;
  };

  var origAddStream = window.RTCPeerConnection.prototype.addStream;
  window.RTCPeerConnection.prototype.addStream = function addStream(stream) {
    var _this9 = this;

    this._shimmedLocalStreams = this._shimmedLocalStreams || {};

    stream.getTracks().forEach(function (track) {
      var alreadyExists = _this9.getSenders().find(function (s) {
        return s.track === track;
      });
      if (alreadyExists) {
        throw new DOMException('Track already exists.', 'InvalidAccessError');
      }
    });
    var existingSenders = this.getSenders();
    origAddStream.apply(this, arguments);
    var newSenders = this.getSenders().filter(function (newSender) {
      return existingSenders.indexOf(newSender) === -1;
    });
    this._shimmedLocalStreams[stream.id] = [stream].concat(newSenders);
  };

  var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
  window.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
    this._shimmedLocalStreams = this._shimmedLocalStreams || {};
    delete this._shimmedLocalStreams[stream.id];
    return origRemoveStream.apply(this, arguments);
  };

  var origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;
  window.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
    var _this10 = this;

    this._shimmedLocalStreams = this._shimmedLocalStreams || {};
    if (sender) {
      Object.keys(this._shimmedLocalStreams).forEach(function (streamId) {
        var idx = _this10._shimmedLocalStreams[streamId].indexOf(sender);
        if (idx !== -1) {
          _this10._shimmedLocalStreams[streamId].splice(idx, 1);
        }
        if (_this10._shimmedLocalStreams[streamId].length === 1) {
          delete _this10._shimmedLocalStreams[streamId];
        }
      });
    }
    return origRemoveTrack.apply(this, arguments);
  };
}

function shimAddTrackRemoveTrack(window) {
  if (!window.RTCPeerConnection) {
    return;
  }
  var browserDetails = utils.detectBrowser(window);
  // shim addTrack and removeTrack.
  if (window.RTCPeerConnection.prototype.addTrack && browserDetails.version >= 65) {
    return shimAddTrackRemoveTrackWithNative(window);
  }

  // also shim pc.getLocalStreams when addTrack is shimmed
  // to return the original streams.
  var origGetLocalStreams = window.RTCPeerConnection.prototype.getLocalStreams;
  window.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
    var _this11 = this;

    var nativeStreams = origGetLocalStreams.apply(this);
    this._reverseStreams = this._reverseStreams || {};
    return nativeStreams.map(function (stream) {
      return _this11._reverseStreams[stream.id];
    });
  };

  var origAddStream = window.RTCPeerConnection.prototype.addStream;
  window.RTCPeerConnection.prototype.addStream = function addStream(stream) {
    var _this12 = this;

    this._streams = this._streams || {};
    this._reverseStreams = this._reverseStreams || {};

    stream.getTracks().forEach(function (track) {
      var alreadyExists = _this12.getSenders().find(function (s) {
        return s.track === track;
      });
      if (alreadyExists) {
        throw new DOMException('Track already exists.', 'InvalidAccessError');
      }
    });
    // Add identity mapping for consistency with addTrack.
    // Unless this is being used with a stream from addTrack.
    if (!this._reverseStreams[stream.id]) {
      var newStream = new window.MediaStream(stream.getTracks());
      this._streams[stream.id] = newStream;
      this._reverseStreams[newStream.id] = stream;
      stream = newStream;
    }
    origAddStream.apply(this, [stream]);
  };

  var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
  window.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
    this._streams = this._streams || {};
    this._reverseStreams = this._reverseStreams || {};

    origRemoveStream.apply(this, [this._streams[stream.id] || stream]);
    delete this._reverseStreams[this._streams[stream.id] ? this._streams[stream.id].id : stream.id];
    delete this._streams[stream.id];
  };

  window.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
    var _this13 = this;

    if (this.signalingState === 'closed') {
      throw new DOMException('The RTCPeerConnection\'s signalingState is \'closed\'.', 'InvalidStateError');
    }
    var streams = [].slice.call(arguments, 1);
    if (streams.length !== 1 || !streams[0].getTracks().find(function (t) {
      return t === track;
    })) {
      // this is not fully correct but all we can manage without
      // [[associated MediaStreams]] internal slot.
      throw new DOMException('The adapter.js addTrack polyfill only supports a single ' + ' stream which is associated with the specified track.', 'NotSupportedError');
    }

    var alreadyExists = this.getSenders().find(function (s) {
      return s.track === track;
    });
    if (alreadyExists) {
      throw new DOMException('Track already exists.', 'InvalidAccessError');
    }

    this._streams = this._streams || {};
    this._reverseStreams = this._reverseStreams || {};
    var oldStream = this._streams[stream.id];
    if (oldStream) {
      // this is using odd Chrome behaviour, use with caution:
      // https://bugs.chromium.org/p/webrtc/issues/detail?id=7815
      // Note: we rely on the high-level addTrack/dtmf shim to
      // create the sender with a dtmf sender.
      oldStream.addTrack(track);

      // Trigger ONN async.
      Promise.resolve().then(function () {
        _this13.dispatchEvent(new Event('negotiationneeded'));
      });
    } else {
      var newStream = new window.MediaStream([track]);
      this._streams[stream.id] = newStream;
      this._reverseStreams[newStream.id] = stream;
      this.addStream(newStream);
    }
    return this.getSenders().find(function (s) {
      return s.track === track;
    });
  };

  // replace the internal stream id with the external one and
  // vice versa.
  function replaceInternalStreamId(pc, description) {
    var sdp = description.sdp;
    Object.keys(pc._reverseStreams || []).forEach(function (internalId) {
      var externalStream = pc._reverseStreams[internalId];
      var internalStream = pc._streams[externalStream.id];
      sdp = sdp.replace(new RegExp(internalStream.id, 'g'), externalStream.id);
    });
    return new RTCSessionDescription({
      type: description.type,
      sdp: sdp
    });
  }
  function replaceExternalStreamId(pc, description) {
    var sdp = description.sdp;
    Object.keys(pc._reverseStreams || []).forEach(function (internalId) {
      var externalStream = pc._reverseStreams[internalId];
      var internalStream = pc._streams[externalStream.id];
      sdp = sdp.replace(new RegExp(externalStream.id, 'g'), internalStream.id);
    });
    return new RTCSessionDescription({
      type: description.type,
      sdp: sdp
    });
  }
  ['createOffer', 'createAnswer'].forEach(function (method) {
    var nativeMethod = window.RTCPeerConnection.prototype[method];
    var methodObj = _defineProperty({}, method, function () {
      var _this14 = this;

      var args = arguments;
      var isLegacyCall = arguments.length && typeof arguments[0] === 'function';
      if (isLegacyCall) {
        return nativeMethod.apply(this, [function (description) {
          var desc = replaceInternalStreamId(_this14, description);
          args[0].apply(null, [desc]);
        }, function (err) {
          if (args[1]) {
            args[1].apply(null, err);
          }
        }, arguments[2]]);
      }
      return nativeMethod.apply(this, arguments).then(function (description) {
        return replaceInternalStreamId(_this14, description);
      });
    });
    window.RTCPeerConnection.prototype[method] = methodObj[method];
  });

  var origSetLocalDescription = window.RTCPeerConnection.prototype.setLocalDescription;
  window.RTCPeerConnection.prototype.setLocalDescription = function setLocalDescription() {
    if (!arguments.length || !arguments[0].type) {
      return origSetLocalDescription.apply(this, arguments);
    }
    arguments[0] = replaceExternalStreamId(this, arguments[0]);
    return origSetLocalDescription.apply(this, arguments);
  };

  // TODO: mangle getStats: https://w3c.github.io/webrtc-stats/#dom-rtcmediastreamstats-streamidentifier

  var origLocalDescription = Object.getOwnPropertyDescriptor(window.RTCPeerConnection.prototype, 'localDescription');
  Object.defineProperty(window.RTCPeerConnection.prototype, 'localDescription', {
    get: function get() {
      var description = origLocalDescription.get.apply(this);
      if (description.type === '') {
        return description;
      }
      return replaceInternalStreamId(this, description);
    }
  });

  window.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
    var _this15 = this;

    if (this.signalingState === 'closed') {
      throw new DOMException('The RTCPeerConnection\'s signalingState is \'closed\'.', 'InvalidStateError');
    }
    // We can not yet check for sender instanceof RTCRtpSender
    // since we shim RTPSender. So we check if sender._pc is set.
    if (!sender._pc) {
      throw new DOMException('Argument 1 of RTCPeerConnection.removeTrack ' + 'does not implement interface RTCRtpSender.', 'TypeError');
    }
    var isLocal = sender._pc === this;
    if (!isLocal) {
      throw new DOMException('Sender was not created by this connection.', 'InvalidAccessError');
    }

    // Search for the native stream the senders track belongs to.
    this._streams = this._streams || {};
    var stream = void 0;
    Object.keys(this._streams).forEach(function (streamid) {
      var hasTrack = _this15._streams[streamid].getTracks().find(function (track) {
        return sender.track === track;
      });
      if (hasTrack) {
        stream = _this15._streams[streamid];
      }
    });

    if (stream) {
      if (stream.getTracks().length === 1) {
        // if this is the last track of the stream, remove the stream. This
        // takes care of any shimmed _senders.
        this.removeStream(this._reverseStreams[stream.id]);
      } else {
        // relying on the same odd chrome behaviour as above.
        stream.removeTrack(sender.track);
      }
      this.dispatchEvent(new Event('negotiationneeded'));
    }
  };
}

function shimPeerConnection(window) {
  var browserDetails = utils.detectBrowser(window);

  if (!window.RTCPeerConnection && window.webkitRTCPeerConnection) {
    // very basic support for old versions.
    window.RTCPeerConnection = window.webkitRTCPeerConnection;
  }
  if (!window.RTCPeerConnection) {
    return;
  }

  var addIceCandidateNullSupported = window.RTCPeerConnection.prototype.addIceCandidate.length === 0;

  // shim implicit creation of RTCSessionDescription/RTCIceCandidate
  if (browserDetails.version < 53) {
    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function (method) {
      var nativeMethod = window.RTCPeerConnection.prototype[method];
      var methodObj = _defineProperty({}, method, function () {
        arguments[0] = new (method === 'addIceCandidate' ? window.RTCIceCandidate : window.RTCSessionDescription)(arguments[0]);
        return nativeMethod.apply(this, arguments);
      });
      window.RTCPeerConnection.prototype[method] = methodObj[method];
    });
  }

  // support for addIceCandidate(null or undefined)
  var nativeAddIceCandidate = window.RTCPeerConnection.prototype.addIceCandidate;
  window.RTCPeerConnection.prototype.addIceCandidate = function addIceCandidate() {
    if (!addIceCandidateNullSupported && !arguments[0]) {
      if (arguments[1]) {
        arguments[1].apply(null);
      }
      return Promise.resolve();
    }
    // Firefox 68+ emits and processes {candidate: "", ...}, ignore
    // in older versions. Native support planned for Chrome M77.
    if (browserDetails.version < 78 && arguments[0] && arguments[0].candidate === '') {
      return Promise.resolve();
    }
    return nativeAddIceCandidate.apply(this, arguments);
  };
}

// Attempt to fix ONN in plan-b mode.
function fixNegotiationNeeded(window) {
  var browserDetails = utils.detectBrowser(window);
  utils.wrapPeerConnectionEvent(window, 'negotiationneeded', function (e) {
    var pc = e.target;
    if (browserDetails.version < 72 || pc.getConfiguration && pc.getConfiguration().sdpSemantics === 'plan-b') {
      if (pc.signalingState !== 'stable') {
        return;
      }
    }
    return e;
  });
}

},{"../utils.js":33,"./getdisplaymedia":22,"./getusermedia":23}],22:[function(require,module,exports){
/*
 *  Copyright (c) 2018 The adapter.js project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shimGetDisplayMedia = shimGetDisplayMedia;
function shimGetDisplayMedia(window, getSourceId) {
  if (window.navigator.mediaDevices && 'getDisplayMedia' in window.navigator.mediaDevices) {
    return;
  }
  if (!window.navigator.mediaDevices) {
    return;
  }
  // getSourceId is a function that returns a promise resolving with
  // the sourceId of the screen/window/tab to be shared.
  if (typeof getSourceId !== 'function') {
    console.error('shimGetDisplayMedia: getSourceId argument is not ' + 'a function');
    return;
  }
  window.navigator.mediaDevices.getDisplayMedia = function getDisplayMedia(constraints) {
    return getSourceId(constraints).then(function (sourceId) {
      var widthSpecified = constraints.video && constraints.video.width;
      var heightSpecified = constraints.video && constraints.video.height;
      var frameRateSpecified = constraints.video && constraints.video.frameRate;
      constraints.video = {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          maxFrameRate: frameRateSpecified || 3
        }
      };
      if (widthSpecified) {
        constraints.video.mandatory.maxWidth = widthSpecified;
      }
      if (heightSpecified) {
        constraints.video.mandatory.maxHeight = heightSpecified;
      }
      return window.navigator.mediaDevices.getUserMedia(constraints);
    });
  };
}

},{}],23:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.shimGetUserMedia = shimGetUserMedia;

var _utils = require('../utils.js');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var logging = utils.log;

function shimGetUserMedia(window) {
  var navigator = window && window.navigator;

  if (!navigator.mediaDevices) {
    return;
  }

  var browserDetails = utils.detectBrowser(window);

  var constraintsToChrome_ = function constraintsToChrome_(c) {
    if ((typeof c === 'undefined' ? 'undefined' : _typeof(c)) !== 'object' || c.mandatory || c.optional) {
      return c;
    }
    var cc = {};
    Object.keys(c).forEach(function (key) {
      if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
        return;
      }
      var r = _typeof(c[key]) === 'object' ? c[key] : { ideal: c[key] };
      if (r.exact !== undefined && typeof r.exact === 'number') {
        r.min = r.max = r.exact;
      }
      var oldname_ = function oldname_(prefix, name) {
        if (prefix) {
          return prefix + name.charAt(0).toUpperCase() + name.slice(1);
        }
        return name === 'deviceId' ? 'sourceId' : name;
      };
      if (r.ideal !== undefined) {
        cc.optional = cc.optional || [];
        var oc = {};
        if (typeof r.ideal === 'number') {
          oc[oldname_('min', key)] = r.ideal;
          cc.optional.push(oc);
          oc = {};
          oc[oldname_('max', key)] = r.ideal;
          cc.optional.push(oc);
        } else {
          oc[oldname_('', key)] = r.ideal;
          cc.optional.push(oc);
        }
      }
      if (r.exact !== undefined && typeof r.exact !== 'number') {
        cc.mandatory = cc.mandatory || {};
        cc.mandatory[oldname_('', key)] = r.exact;
      } else {
        ['min', 'max'].forEach(function (mix) {
          if (r[mix] !== undefined) {
            cc.mandatory = cc.mandatory || {};
            cc.mandatory[oldname_(mix, key)] = r[mix];
          }
        });
      }
    });
    if (c.advanced) {
      cc.optional = (cc.optional || []).concat(c.advanced);
    }
    return cc;
  };

  var shimConstraints_ = function shimConstraints_(constraints, func) {
    if (browserDetails.version >= 61) {
      return func(constraints);
    }
    constraints = JSON.parse(JSON.stringify(constraints));
    if (constraints && _typeof(constraints.audio) === 'object') {
      var remap = function remap(obj, a, b) {
        if (a in obj && !(b in obj)) {
          obj[b] = obj[a];
          delete obj[a];
        }
      };
      constraints = JSON.parse(JSON.stringify(constraints));
      remap(constraints.audio, 'autoGainControl', 'googAutoGainControl');
      remap(constraints.audio, 'noiseSuppression', 'googNoiseSuppression');
      constraints.audio = constraintsToChrome_(constraints.audio);
    }
    if (constraints && _typeof(constraints.video) === 'object') {
      // Shim facingMode for mobile & surface pro.
      var face = constraints.video.facingMode;
      face = face && ((typeof face === 'undefined' ? 'undefined' : _typeof(face)) === 'object' ? face : { ideal: face });
      var getSupportedFacingModeLies = browserDetails.version < 66;

      if (face && (face.exact === 'user' || face.exact === 'environment' || face.ideal === 'user' || face.ideal === 'environment') && !(navigator.mediaDevices.getSupportedConstraints && navigator.mediaDevices.getSupportedConstraints().facingMode && !getSupportedFacingModeLies)) {
        delete constraints.video.facingMode;
        var matches = void 0;
        if (face.exact === 'environment' || face.ideal === 'environment') {
          matches = ['back', 'rear'];
        } else if (face.exact === 'user' || face.ideal === 'user') {
          matches = ['front'];
        }
        if (matches) {
          // Look for matches in label, or use last cam for back (typical).
          return navigator.mediaDevices.enumerateDevices().then(function (devices) {
            devices = devices.filter(function (d) {
              return d.kind === 'videoinput';
            });
            var dev = devices.find(function (d) {
              return matches.some(function (match) {
                return d.label.toLowerCase().includes(match);
              });
            });
            if (!dev && devices.length && matches.includes('back')) {
              dev = devices[devices.length - 1]; // more likely the back cam
            }
            if (dev) {
              constraints.video.deviceId = face.exact ? { exact: dev.deviceId } : { ideal: dev.deviceId };
            }
            constraints.video = constraintsToChrome_(constraints.video);
            logging('chrome: ' + JSON.stringify(constraints));
            return func(constraints);
          });
        }
      }
      constraints.video = constraintsToChrome_(constraints.video);
    }
    logging('chrome: ' + JSON.stringify(constraints));
    return func(constraints);
  };

  var shimError_ = function shimError_(e) {
    if (browserDetails.version >= 64) {
      return e;
    }
    return {
      name: {
        PermissionDeniedError: 'NotAllowedError',
        PermissionDismissedError: 'NotAllowedError',
        InvalidStateError: 'NotAllowedError',
        DevicesNotFoundError: 'NotFoundError',
        ConstraintNotSatisfiedError: 'OverconstrainedError',
        TrackStartError: 'NotReadableError',
        MediaDeviceFailedDueToShutdown: 'NotAllowedError',
        MediaDeviceKillSwitchOn: 'NotAllowedError',
        TabCaptureError: 'AbortError',
        ScreenCaptureError: 'AbortError',
        DeviceCaptureError: 'AbortError'
      }[e.name] || e.name,
      message: e.message,
      constraint: e.constraint || e.constraintName,
      toString: function toString() {
        return this.name + (this.message && ': ') + this.message;
      }
    };
  };

  var getUserMedia_ = function getUserMedia_(constraints, onSuccess, onError) {
    shimConstraints_(constraints, function (c) {
      navigator.webkitGetUserMedia(c, onSuccess, function (e) {
        if (onError) {
          onError(shimError_(e));
        }
      });
    });
  };
  navigator.getUserMedia = getUserMedia_.bind(navigator);

  // Even though Chrome 45 has navigator.mediaDevices and a getUserMedia
  // function which returns a Promise, it does not accept spec-style
  // constraints.
  if (navigator.mediaDevices.getUserMedia) {
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function (cs) {
      return shimConstraints_(cs, function (c) {
        return origGetUserMedia(c).then(function (stream) {
          if (c.audio && !stream.getAudioTracks().length || c.video && !stream.getVideoTracks().length) {
            stream.getTracks().forEach(function (track) {
              track.stop();
            });
            throw new DOMException('', 'NotFoundError');
          }
          return stream;
        }, function (e) {
          return Promise.reject(shimError_(e));
        });
      });
    };
  }
}

},{"../utils.js":33}],24:[function(require,module,exports){
/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.shimRTCIceCandidate = shimRTCIceCandidate;
exports.shimMaxMessageSize = shimMaxMessageSize;
exports.shimSendThrowTypeError = shimSendThrowTypeError;
exports.shimConnectionState = shimConnectionState;
exports.removeAllowExtmapMixed = removeAllowExtmapMixed;

var _sdp = require('sdp');

var _sdp2 = _interopRequireDefault(_sdp);

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function shimRTCIceCandidate(window) {
  // foundation is arbitrarily chosen as an indicator for full support for
  // https://w3c.github.io/webrtc-pc/#rtcicecandidate-interface
  if (!window.RTCIceCandidate || window.RTCIceCandidate && 'foundation' in window.RTCIceCandidate.prototype) {
    return;
  }

  var NativeRTCIceCandidate = window.RTCIceCandidate;
  window.RTCIceCandidate = function RTCIceCandidate(args) {
    // Remove the a= which shouldn't be part of the candidate string.
    if ((typeof args === 'undefined' ? 'undefined' : _typeof(args)) === 'object' && args.candidate && args.candidate.indexOf('a=') === 0) {
      args = JSON.parse(JSON.stringify(args));
      args.candidate = args.candidate.substr(2);
    }

    if (args.candidate && args.candidate.length) {
      // Augment the native candidate with the parsed fields.
      var nativeCandidate = new NativeRTCIceCandidate(args);
      var parsedCandidate = _sdp2.default.parseCandidate(args.candidate);
      var augmentedCandidate = Object.assign(nativeCandidate, parsedCandidate);

      // Add a serializer that does not serialize the extra attributes.
      augmentedCandidate.toJSON = function toJSON() {
        return {
          candidate: augmentedCandidate.candidate,
          sdpMid: augmentedCandidate.sdpMid,
          sdpMLineIndex: augmentedCandidate.sdpMLineIndex,
          usernameFragment: augmentedCandidate.usernameFragment
        };
      };
      return augmentedCandidate;
    }
    return new NativeRTCIceCandidate(args);
  };
  window.RTCIceCandidate.prototype = NativeRTCIceCandidate.prototype;

  // Hook up the augmented candidate in onicecandidate and
  // addEventListener('icecandidate', ...)
  utils.wrapPeerConnectionEvent(window, 'icecandidate', function (e) {
    if (e.candidate) {
      Object.defineProperty(e, 'candidate', {
        value: new window.RTCIceCandidate(e.candidate),
        writable: 'false'
      });
    }
    return e;
  });
}

function shimMaxMessageSize(window) {
  if (!window.RTCPeerConnection) {
    return;
  }
  var browserDetails = utils.detectBrowser(window);

  if (!('sctp' in window.RTCPeerConnection.prototype)) {
    Object.defineProperty(window.RTCPeerConnection.prototype, 'sctp', {
      get: function get() {
        return typeof this._sctp === 'undefined' ? null : this._sctp;
      }
    });
  }

  var sctpInDescription = function sctpInDescription(description) {
    if (!description || !description.sdp) {
      return false;
    }
    var sections = _sdp2.default.splitSections(description.sdp);
    sections.shift();
    return sections.some(function (mediaSection) {
      var mLine = _sdp2.default.parseMLine(mediaSection);
      return mLine && mLine.kind === 'application' && mLine.protocol.indexOf('SCTP') !== -1;
    });
  };

  var getRemoteFirefoxVersion = function getRemoteFirefoxVersion(description) {
    // TODO: Is there a better solution for detecting Firefox?
    var match = description.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);
    if (match === null || match.length < 2) {
      return -1;
    }
    var version = parseInt(match[1], 10);
    // Test for NaN (yes, this is ugly)
    return version !== version ? -1 : version;
  };

  var getCanSendMaxMessageSize = function getCanSendMaxMessageSize(remoteIsFirefox) {
    // Every implementation we know can send at least 64 KiB.
    // Note: Although Chrome is technically able to send up to 256 KiB, the
    //       data does not reach the other peer reliably.
    //       See: https://bugs.chromium.org/p/webrtc/issues/detail?id=8419
    var canSendMaxMessageSize = 65536;
    if (browserDetails.browser === 'firefox') {
      if (browserDetails.version < 57) {
        if (remoteIsFirefox === -1) {
          // FF < 57 will send in 16 KiB chunks using the deprecated PPID
          // fragmentation.
          canSendMaxMessageSize = 16384;
        } else {
          // However, other FF (and RAWRTC) can reassemble PPID-fragmented
          // messages. Thus, supporting ~2 GiB when sending.
          canSendMaxMessageSize = 2147483637;
        }
      } else if (browserDetails.version < 60) {
        // Currently, all FF >= 57 will reset the remote maximum message size
        // to the default value when a data channel is created at a later
        // stage. :(
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1426831
        canSendMaxMessageSize = browserDetails.version === 57 ? 65535 : 65536;
      } else {
        // FF >= 60 supports sending ~2 GiB
        canSendMaxMessageSize = 2147483637;
      }
    }
    return canSendMaxMessageSize;
  };

  var getMaxMessageSize = function getMaxMessageSize(description, remoteIsFirefox) {
    // Note: 65536 bytes is the default value from the SDP spec. Also,
    //       every implementation we know supports receiving 65536 bytes.
    var maxMessageSize = 65536;

    // FF 57 has a slightly incorrect default remote max message size, so
    // we need to adjust it here to avoid a failure when sending.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1425697
    if (browserDetails.browser === 'firefox' && browserDetails.version === 57) {
      maxMessageSize = 65535;
    }

    var match = _sdp2.default.matchPrefix(description.sdp, 'a=max-message-size:');
    if (match.length > 0) {
      maxMessageSize = parseInt(match[0].substr(19), 10);
    } else if (browserDetails.browser === 'firefox' && remoteIsFirefox !== -1) {
      // If the maximum message size is not present in the remote SDP and
      // both local and remote are Firefox, the remote peer can receive
      // ~2 GiB.
      maxMessageSize = 2147483637;
    }
    return maxMessageSize;
  };

  var origSetRemoteDescription = window.RTCPeerConnection.prototype.setRemoteDescription;
  window.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
    this._sctp = null;
    // Chrome decided to not expose .sctp in plan-b mode.
    // As usual, adapter.js has to do an 'ugly worakaround'
    // to cover up the mess.
    if (browserDetails.browser === 'chrome' && browserDetails.version >= 76) {
      var _getConfiguration = this.getConfiguration(),
          sdpSemantics = _getConfiguration.sdpSemantics;

      if (sdpSemantics === 'plan-b') {
        Object.defineProperty(this, 'sctp', {
          get: function get() {
            return typeof this._sctp === 'undefined' ? null : this._sctp;
          },

          enumerable: true,
          configurable: true
        });
      }
    }

    if (sctpInDescription(arguments[0])) {
      // Check if the remote is FF.
      var isFirefox = getRemoteFirefoxVersion(arguments[0]);

      // Get the maximum message size the local peer is capable of sending
      var canSendMMS = getCanSendMaxMessageSize(isFirefox);

      // Get the maximum message size of the remote peer.
      var remoteMMS = getMaxMessageSize(arguments[0], isFirefox);

      // Determine final maximum message size
      var maxMessageSize = void 0;
      if (canSendMMS === 0 && remoteMMS === 0) {
        maxMessageSize = Number.POSITIVE_INFINITY;
      } else if (canSendMMS === 0 || remoteMMS === 0) {
        maxMessageSize = Math.max(canSendMMS, remoteMMS);
      } else {
        maxMessageSize = Math.min(canSendMMS, remoteMMS);
      }

      // Create a dummy RTCSctpTransport object and the 'maxMessageSize'
      // attribute.
      var sctp = {};
      Object.defineProperty(sctp, 'maxMessageSize', {
        get: function get() {
          return maxMessageSize;
        }
      });
      this._sctp = sctp;
    }

    return origSetRemoteDescription.apply(this, arguments);
  };
}

function shimSendThrowTypeError(window) {
  if (!(window.RTCPeerConnection && 'createDataChannel' in window.RTCPeerConnection.prototype)) {
    return;
  }

  // Note: Although Firefox >= 57 has a native implementation, the maximum
  //       message size can be reset for all data channels at a later stage.
  //       See: https://bugzilla.mozilla.org/show_bug.cgi?id=1426831

  function wrapDcSend(dc, pc) {
    var origDataChannelSend = dc.send;
    dc.send = function send() {
      var data = arguments[0];
      var length = data.length || data.size || data.byteLength;
      if (dc.readyState === 'open' && pc.sctp && length > pc.sctp.maxMessageSize) {
        throw new TypeError('Message too large (can send a maximum of ' + pc.sctp.maxMessageSize + ' bytes)');
      }
      return origDataChannelSend.apply(dc, arguments);
    };
  }
  var origCreateDataChannel = window.RTCPeerConnection.prototype.createDataChannel;
  window.RTCPeerConnection.prototype.createDataChannel = function createDataChannel() {
    var dataChannel = origCreateDataChannel.apply(this, arguments);
    wrapDcSend(dataChannel, this);
    return dataChannel;
  };
  utils.wrapPeerConnectionEvent(window, 'datachannel', function (e) {
    wrapDcSend(e.channel, e.target);
    return e;
  });
}

/* shims RTCConnectionState by pretending it is the same as iceConnectionState.
 * See https://bugs.chromium.org/p/webrtc/issues/detail?id=6145#c12
 * for why this is a valid hack in Chrome. In Firefox it is slightly incorrect
 * since DTLS failures would be hidden. See
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1265827
 * for the Firefox tracking bug.
 */
function shimConnectionState(window) {
  if (!window.RTCPeerConnection || 'connectionState' in window.RTCPeerConnection.prototype) {
    return;
  }
  var proto = window.RTCPeerConnection.prototype;
  Object.defineProperty(proto, 'connectionState', {
    get: function get() {
      return {
        completed: 'connected',
        checking: 'connecting'
      }[this.iceConnectionState] || this.iceConnectionState;
    },

    enumerable: true,
    configurable: true
  });
  Object.defineProperty(proto, 'onconnectionstatechange', {
    get: function get() {
      return this._onconnectionstatechange || null;
    },
    set: function set(cb) {
      if (this._onconnectionstatechange) {
        this.removeEventListener('connectionstatechange', this._onconnectionstatechange);
        delete this._onconnectionstatechange;
      }
      if (cb) {
        this.addEventListener('connectionstatechange', this._onconnectionstatechange = cb);
      }
    },

    enumerable: true,
    configurable: true
  });

  ['setLocalDescription', 'setRemoteDescription'].forEach(function (method) {
    var origMethod = proto[method];
    proto[method] = function () {
      if (!this._connectionstatechangepoly) {
        this._connectionstatechangepoly = function (e) {
          var pc = e.target;
          if (pc._lastConnectionState !== pc.connectionState) {
            pc._lastConnectionState = pc.connectionState;
            var newEvent = new Event('connectionstatechange', e);
            pc.dispatchEvent(newEvent);
          }
          return e;
        };
        this.addEventListener('iceconnectionstatechange', this._connectionstatechangepoly);
      }
      return origMethod.apply(this, arguments);
    };
  });
}

function removeAllowExtmapMixed(window) {
  /* remove a=extmap-allow-mixed for webrtc.org < M71 */
  if (!window.RTCPeerConnection) {
    return;
  }
  var browserDetails = utils.detectBrowser(window);
  if (browserDetails.browser === 'chrome' && browserDetails.version >= 71) {
    return;
  }
  if (browserDetails.browser === 'safari' && browserDetails.version >= 605) {
    return;
  }
  var nativeSRD = window.RTCPeerConnection.prototype.setRemoteDescription;
  window.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription(desc) {
    if (desc && desc.sdp && desc.sdp.indexOf('\na=extmap-allow-mixed') !== -1) {
      desc.sdp = desc.sdp.split('\n').filter(function (line) {
        return line.trim() !== 'a=extmap-allow-mixed';
      }).join('\n');
    }
    return nativeSRD.apply(this, arguments);
  };
}

},{"./utils":33,"sdp":15}],25:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shimGetDisplayMedia = exports.shimGetUserMedia = undefined;

var _getusermedia = require('./getusermedia');

Object.defineProperty(exports, 'shimGetUserMedia', {
  enumerable: true,
  get: function get() {
    return _getusermedia.shimGetUserMedia;
  }
});

var _getdisplaymedia = require('./getdisplaymedia');

Object.defineProperty(exports, 'shimGetDisplayMedia', {
  enumerable: true,
  get: function get() {
    return _getdisplaymedia.shimGetDisplayMedia;
  }
});
exports.shimPeerConnection = shimPeerConnection;
exports.shimReplaceTrack = shimReplaceTrack;

var _utils = require('../utils');

var utils = _interopRequireWildcard(_utils);

var _filtericeservers = require('./filtericeservers');

var _rtcpeerconnectionShim = require('rtcpeerconnection-shim');

var _rtcpeerconnectionShim2 = _interopRequireDefault(_rtcpeerconnectionShim);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function shimPeerConnection(window) {
  var browserDetails = utils.detectBrowser(window);

  if (window.RTCIceGatherer) {
    if (!window.RTCIceCandidate) {
      window.RTCIceCandidate = function RTCIceCandidate(args) {
        return args;
      };
    }
    if (!window.RTCSessionDescription) {
      window.RTCSessionDescription = function RTCSessionDescription(args) {
        return args;
      };
    }
    // this adds an additional event listener to MediaStrackTrack that signals
    // when a tracks enabled property was changed. Workaround for a bug in
    // addStream, see below. No longer required in 15025+
    if (browserDetails.version < 15025) {
      var origMSTEnabled = Object.getOwnPropertyDescriptor(window.MediaStreamTrack.prototype, 'enabled');
      Object.defineProperty(window.MediaStreamTrack.prototype, 'enabled', {
        set: function set(value) {
          origMSTEnabled.set.call(this, value);
          var ev = new Event('enabled');
          ev.enabled = value;
          this.dispatchEvent(ev);
        }
      });
    }
  }

  // ORTC defines the DTMF sender a bit different.
  // https://github.com/w3c/ortc/issues/714
  if (window.RTCRtpSender && !('dtmf' in window.RTCRtpSender.prototype)) {
    Object.defineProperty(window.RTCRtpSender.prototype, 'dtmf', {
      get: function get() {
        if (this._dtmf === undefined) {
          if (this.track.kind === 'audio') {
            this._dtmf = new window.RTCDtmfSender(this);
          } else if (this.track.kind === 'video') {
            this._dtmf = null;
          }
        }
        return this._dtmf;
      }
    });
  }
  // Edge currently only implements the RTCDtmfSender, not the
  // RTCDTMFSender alias. See http://draft.ortc.org/#rtcdtmfsender2*
  if (window.RTCDtmfSender && !window.RTCDTMFSender) {
    window.RTCDTMFSender = window.RTCDtmfSender;
  }

  var RTCPeerConnectionShim = (0, _rtcpeerconnectionShim2.default)(window, browserDetails.version);
  window.RTCPeerConnection = function RTCPeerConnection(config) {
    if (config && config.iceServers) {
      config.iceServers = (0, _filtericeservers.filterIceServers)(config.iceServers, browserDetails.version);
      utils.log('ICE servers after filtering:', config.iceServers);
    }
    return new RTCPeerConnectionShim(config);
  };
  window.RTCPeerConnection.prototype = RTCPeerConnectionShim.prototype;
}

function shimReplaceTrack(window) {
  // ORTC has replaceTrack -- https://github.com/w3c/ortc/issues/614
  if (window.RTCRtpSender && !('replaceTrack' in window.RTCRtpSender.prototype)) {
    window.RTCRtpSender.prototype.replaceTrack = window.RTCRtpSender.prototype.setTrack;
  }
}

},{"../utils":33,"./filtericeservers":26,"./getdisplaymedia":27,"./getusermedia":28,"rtcpeerconnection-shim":14}],26:[function(require,module,exports){
/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filterIceServers = filterIceServers;

var _utils = require('../utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

// Edge does not like
// 1) stun: filtered after 14393 unless ?transport=udp is present
// 2) turn: that does not have all of turn:host:port?transport=udp
// 3) turn: with ipv6 addresses
// 4) turn: occurring muliple times
function filterIceServers(iceServers, edgeVersion) {
  var hasTurn = false;
  iceServers = JSON.parse(JSON.stringify(iceServers));
  return iceServers.filter(function (server) {
    if (server && (server.urls || server.url)) {
      var urls = server.urls || server.url;
      if (server.url && !server.urls) {
        utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
      }
      var isString = typeof urls === 'string';
      if (isString) {
        urls = [urls];
      }
      urls = urls.filter(function (url) {
        // filter STUN unconditionally.
        if (url.indexOf('stun:') === 0) {
          return false;
        }

        var validTurn = url.startsWith('turn') && !url.startsWith('turn:[') && url.includes('transport=udp');
        if (validTurn && !hasTurn) {
          hasTurn = true;
          return true;
        }
        return validTurn && !hasTurn;
      });

      delete server.url;
      server.urls = isString ? urls[0] : urls;
      return !!urls.length;
    }
  });
}

},{"../utils":33}],27:[function(require,module,exports){
/*
 *  Copyright (c) 2018 The adapter.js project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shimGetDisplayMedia = shimGetDisplayMedia;
function shimGetDisplayMedia(window) {
  if (!('getDisplayMedia' in window.navigator)) {
    return;
  }
  if (!window.navigator.mediaDevices) {
    return;
  }
  if (window.navigator.mediaDevices && 'getDisplayMedia' in window.navigator.mediaDevices) {
    return;
  }
  window.navigator.mediaDevices.getDisplayMedia = window.navigator.getDisplayMedia.bind(window.navigator);
}

},{}],28:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shimGetUserMedia = shimGetUserMedia;
function shimGetUserMedia(window) {
  var navigator = window && window.navigator;

  var shimError_ = function shimError_(e) {
    return {
      name: { PermissionDeniedError: 'NotAllowedError' }[e.name] || e.name,
      message: e.message,
      constraint: e.constraint,
      toString: function toString() {
        return this.name;
      }
    };
  };

  // getUserMedia error shim.
  var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = function (c) {
    return origGetUserMedia(c).catch(function (e) {
      return Promise.reject(shimError_(e));
    });
  };
}

},{}],29:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shimGetDisplayMedia = exports.shimGetUserMedia = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _getusermedia = require('./getusermedia');

Object.defineProperty(exports, 'shimGetUserMedia', {
  enumerable: true,
  get: function get() {
    return _getusermedia.shimGetUserMedia;
  }
});

var _getdisplaymedia = require('./getdisplaymedia');

Object.defineProperty(exports, 'shimGetDisplayMedia', {
  enumerable: true,
  get: function get() {
    return _getdisplaymedia.shimGetDisplayMedia;
  }
});
exports.shimOnTrack = shimOnTrack;
exports.shimPeerConnection = shimPeerConnection;
exports.shimSenderGetStats = shimSenderGetStats;
exports.shimReceiverGetStats = shimReceiverGetStats;
exports.shimRemoveStream = shimRemoveStream;
exports.shimRTCDataChannel = shimRTCDataChannel;
exports.shimAddTransceiver = shimAddTransceiver;
exports.shimGetParameters = shimGetParameters;
exports.shimCreateOffer = shimCreateOffer;
exports.shimCreateAnswer = shimCreateAnswer;

var _utils = require('../utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function shimOnTrack(window) {
  if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCTrackEvent && 'receiver' in window.RTCTrackEvent.prototype && !('transceiver' in window.RTCTrackEvent.prototype)) {
    Object.defineProperty(window.RTCTrackEvent.prototype, 'transceiver', {
      get: function get() {
        return { receiver: this.receiver };
      }
    });
  }
}

function shimPeerConnection(window) {
  var browserDetails = utils.detectBrowser(window);

  if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object' || !(window.RTCPeerConnection || window.mozRTCPeerConnection)) {
    return; // probably media.peerconnection.enabled=false in about:config
  }
  if (!window.RTCPeerConnection && window.mozRTCPeerConnection) {
    // very basic support for old versions.
    window.RTCPeerConnection = window.mozRTCPeerConnection;
  }

  if (browserDetails.version < 53) {
    // shim away need for obsolete RTCIceCandidate/RTCSessionDescription.
    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function (method) {
      var nativeMethod = window.RTCPeerConnection.prototype[method];
      var methodObj = _defineProperty({}, method, function () {
        arguments[0] = new (method === 'addIceCandidate' ? window.RTCIceCandidate : window.RTCSessionDescription)(arguments[0]);
        return nativeMethod.apply(this, arguments);
      });
      window.RTCPeerConnection.prototype[method] = methodObj[method];
    });
  }

  // support for addIceCandidate(null or undefined)
  // as well as ignoring {sdpMid, candidate: ""}
  if (browserDetails.version < 68) {
    var nativeAddIceCandidate = window.RTCPeerConnection.prototype.addIceCandidate;
    window.RTCPeerConnection.prototype.addIceCandidate = function addIceCandidate() {
      if (!arguments[0]) {
        if (arguments[1]) {
          arguments[1].apply(null);
        }
        return Promise.resolve();
      }
      // Firefox 68+ emits and processes {candidate: "", ...}, ignore
      // in older versions.
      if (arguments[0] && arguments[0].candidate === '') {
        return Promise.resolve();
      }
      return nativeAddIceCandidate.apply(this, arguments);
    };
  }

  var modernStatsTypes = {
    inboundrtp: 'inbound-rtp',
    outboundrtp: 'outbound-rtp',
    candidatepair: 'candidate-pair',
    localcandidate: 'local-candidate',
    remotecandidate: 'remote-candidate'
  };

  var nativeGetStats = window.RTCPeerConnection.prototype.getStats;
  window.RTCPeerConnection.prototype.getStats = function getStats() {
    var _arguments = Array.prototype.slice.call(arguments),
        selector = _arguments[0],
        onSucc = _arguments[1],
        onErr = _arguments[2];

    return nativeGetStats.apply(this, [selector || null]).then(function (stats) {
      if (browserDetails.version < 53 && !onSucc) {
        // Shim only promise getStats with spec-hyphens in type names
        // Leave callback version alone; misc old uses of forEach before Map
        try {
          stats.forEach(function (stat) {
            stat.type = modernStatsTypes[stat.type] || stat.type;
          });
        } catch (e) {
          if (e.name !== 'TypeError') {
            throw e;
          }
          // Avoid TypeError: "type" is read-only, in old versions. 34-43ish
          stats.forEach(function (stat, i) {
            stats.set(i, Object.assign({}, stat, {
              type: modernStatsTypes[stat.type] || stat.type
            }));
          });
        }
      }
      return stats;
    }).then(onSucc, onErr);
  };
}

function shimSenderGetStats(window) {
  if (!((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection && window.RTCRtpSender)) {
    return;
  }
  if (window.RTCRtpSender && 'getStats' in window.RTCRtpSender.prototype) {
    return;
  }
  var origGetSenders = window.RTCPeerConnection.prototype.getSenders;
  if (origGetSenders) {
    window.RTCPeerConnection.prototype.getSenders = function getSenders() {
      var _this = this;

      var senders = origGetSenders.apply(this, []);
      senders.forEach(function (sender) {
        return sender._pc = _this;
      });
      return senders;
    };
  }

  var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
  if (origAddTrack) {
    window.RTCPeerConnection.prototype.addTrack = function addTrack() {
      var sender = origAddTrack.apply(this, arguments);
      sender._pc = this;
      return sender;
    };
  }
  window.RTCRtpSender.prototype.getStats = function getStats() {
    return this.track ? this._pc.getStats(this.track) : Promise.resolve(new Map());
  };
}

function shimReceiverGetStats(window) {
  if (!((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection && window.RTCRtpSender)) {
    return;
  }
  if (window.RTCRtpSender && 'getStats' in window.RTCRtpReceiver.prototype) {
    return;
  }
  var origGetReceivers = window.RTCPeerConnection.prototype.getReceivers;
  if (origGetReceivers) {
    window.RTCPeerConnection.prototype.getReceivers = function getReceivers() {
      var _this2 = this;

      var receivers = origGetReceivers.apply(this, []);
      receivers.forEach(function (receiver) {
        return receiver._pc = _this2;
      });
      return receivers;
    };
  }
  utils.wrapPeerConnectionEvent(window, 'track', function (e) {
    e.receiver._pc = e.srcElement;
    return e;
  });
  window.RTCRtpReceiver.prototype.getStats = function getStats() {
    return this._pc.getStats(this.track);
  };
}

function shimRemoveStream(window) {
  if (!window.RTCPeerConnection || 'removeStream' in window.RTCPeerConnection.prototype) {
    return;
  }
  window.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
    var _this3 = this;

    utils.deprecated('removeStream', 'removeTrack');
    this.getSenders().forEach(function (sender) {
      if (sender.track && stream.getTracks().includes(sender.track)) {
        _this3.removeTrack(sender);
      }
    });
  };
}

function shimRTCDataChannel(window) {
  // rename DataChannel to RTCDataChannel (native fix in FF60):
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1173851
  if (window.DataChannel && !window.RTCDataChannel) {
    window.RTCDataChannel = window.DataChannel;
  }
}

function shimAddTransceiver(window) {
  // https://github.com/webrtcHacks/adapter/issues/998#issuecomment-516921647
  // Firefox ignores the init sendEncodings options passed to addTransceiver
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1396918
  if (!((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection)) {
    return;
  }
  var origAddTransceiver = window.RTCPeerConnection.prototype.addTransceiver;
  if (origAddTransceiver) {
    window.RTCPeerConnection.prototype.addTransceiver = function addTransceiver() {
      this.setParametersPromises = [];
      var initParameters = arguments[1];
      var shouldPerformCheck = initParameters && 'sendEncodings' in initParameters;
      if (shouldPerformCheck) {
        // If sendEncodings params are provided, validate grammar
        initParameters.sendEncodings.forEach(function (encodingParam) {
          if ('rid' in encodingParam) {
            var ridRegex = /^[a-z0-9]{0,16}$/i;
            if (!ridRegex.test(encodingParam.rid)) {
              throw new TypeError('Invalid RID value provided.');
            }
          }
          if ('scaleResolutionDownBy' in encodingParam) {
            if (!(parseFloat(encodingParam.scaleResolutionDownBy) >= 1.0)) {
              throw new RangeError('scale_resolution_down_by must be >= 1.0');
            }
          }
          if ('maxFramerate' in encodingParam) {
            if (!(parseFloat(encodingParam.maxFramerate) >= 0)) {
              throw new RangeError('max_framerate must be >= 0.0');
            }
          }
        });
      }
      var transceiver = origAddTransceiver.apply(this, arguments);
      if (shouldPerformCheck) {
        // Check if the init options were applied. If not we do this in an
        // asynchronous way and save the promise reference in a global object.
        // This is an ugly hack, but at the same time is way more robust than
        // checking the sender parameters before and after the createOffer
        // Also note that after the createoffer we are not 100% sure that
        // the params were asynchronously applied so we might miss the
        // opportunity to recreate offer.
        var sender = transceiver.sender;

        var params = sender.getParameters();
        if (!('encodings' in params) ||
        // Avoid being fooled by patched getParameters() below.
        params.encodings.length === 1 && Object.keys(params.encodings[0]).length === 0) {
          params.encodings = initParameters.sendEncodings;
          sender.sendEncodings = initParameters.sendEncodings;
          this.setParametersPromises.push(sender.setParameters(params).then(function () {
            delete sender.sendEncodings;
          }).catch(function () {
            delete sender.sendEncodings;
          }));
        }
      }
      return transceiver;
    };
  }
}

function shimGetParameters(window) {
  if (!((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCRtpSender)) {
    return;
  }
  var origGetParameters = window.RTCRtpSender.prototype.getParameters;
  if (origGetParameters) {
    window.RTCRtpSender.prototype.getParameters = function getParameters() {
      var params = origGetParameters.apply(this, arguments);
      if (!('encodings' in params)) {
        params.encodings = [].concat(this.sendEncodings || [{}]);
      }
      return params;
    };
  }
}

function shimCreateOffer(window) {
  // https://github.com/webrtcHacks/adapter/issues/998#issuecomment-516921647
  // Firefox ignores the init sendEncodings options passed to addTransceiver
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1396918
  if (!((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection)) {
    return;
  }
  var origCreateOffer = window.RTCPeerConnection.prototype.createOffer;
  window.RTCPeerConnection.prototype.createOffer = function createOffer() {
    var _this4 = this,
        _arguments2 = arguments;

    if (this.setParametersPromises && this.setParametersPromises.length) {
      return Promise.all(this.setParametersPromises).then(function () {
        return origCreateOffer.apply(_this4, _arguments2);
      }).finally(function () {
        _this4.setParametersPromises = [];
      });
    }
    return origCreateOffer.apply(this, arguments);
  };
}

function shimCreateAnswer(window) {
  // https://github.com/webrtcHacks/adapter/issues/998#issuecomment-516921647
  // Firefox ignores the init sendEncodings options passed to addTransceiver
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1396918
  if (!((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCPeerConnection)) {
    return;
  }
  var origCreateAnswer = window.RTCPeerConnection.prototype.createAnswer;
  window.RTCPeerConnection.prototype.createAnswer = function createAnswer() {
    var _this5 = this,
        _arguments3 = arguments;

    if (this.setParametersPromises && this.setParametersPromises.length) {
      return Promise.all(this.setParametersPromises).then(function () {
        return origCreateAnswer.apply(_this5, _arguments3);
      }).finally(function () {
        _this5.setParametersPromises = [];
      });
    }
    return origCreateAnswer.apply(this, arguments);
  };
}

},{"../utils":33,"./getdisplaymedia":30,"./getusermedia":31}],30:[function(require,module,exports){
/*
 *  Copyright (c) 2018 The adapter.js project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shimGetDisplayMedia = shimGetDisplayMedia;
function shimGetDisplayMedia(window, preferredMediaSource) {
  if (window.navigator.mediaDevices && 'getDisplayMedia' in window.navigator.mediaDevices) {
    return;
  }
  if (!window.navigator.mediaDevices) {
    return;
  }
  window.navigator.mediaDevices.getDisplayMedia = function getDisplayMedia(constraints) {
    if (!(constraints && constraints.video)) {
      var err = new DOMException('getDisplayMedia without video ' + 'constraints is undefined');
      err.name = 'NotFoundError';
      // from https://heycam.github.io/webidl/#idl-DOMException-error-names
      err.code = 8;
      return Promise.reject(err);
    }
    if (constraints.video === true) {
      constraints.video = { mediaSource: preferredMediaSource };
    } else {
      constraints.video.mediaSource = preferredMediaSource;
    }
    return window.navigator.mediaDevices.getUserMedia(constraints);
  };
}

},{}],31:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.shimGetUserMedia = shimGetUserMedia;

var _utils = require('../utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function shimGetUserMedia(window) {
  var browserDetails = utils.detectBrowser(window);
  var navigator = window && window.navigator;
  var MediaStreamTrack = window && window.MediaStreamTrack;

  navigator.getUserMedia = function (constraints, onSuccess, onError) {
    // Replace Firefox 44+'s deprecation warning with unprefixed version.
    utils.deprecated('navigator.getUserMedia', 'navigator.mediaDevices.getUserMedia');
    navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
  };

  if (!(browserDetails.version > 55 && 'autoGainControl' in navigator.mediaDevices.getSupportedConstraints())) {
    var remap = function remap(obj, a, b) {
      if (a in obj && !(b in obj)) {
        obj[b] = obj[a];
        delete obj[a];
      }
    };

    var nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function (c) {
      if ((typeof c === 'undefined' ? 'undefined' : _typeof(c)) === 'object' && _typeof(c.audio) === 'object') {
        c = JSON.parse(JSON.stringify(c));
        remap(c.audio, 'autoGainControl', 'mozAutoGainControl');
        remap(c.audio, 'noiseSuppression', 'mozNoiseSuppression');
      }
      return nativeGetUserMedia(c);
    };

    if (MediaStreamTrack && MediaStreamTrack.prototype.getSettings) {
      var nativeGetSettings = MediaStreamTrack.prototype.getSettings;
      MediaStreamTrack.prototype.getSettings = function () {
        var obj = nativeGetSettings.apply(this, arguments);
        remap(obj, 'mozAutoGainControl', 'autoGainControl');
        remap(obj, 'mozNoiseSuppression', 'noiseSuppression');
        return obj;
      };
    }

    if (MediaStreamTrack && MediaStreamTrack.prototype.applyConstraints) {
      var nativeApplyConstraints = MediaStreamTrack.prototype.applyConstraints;
      MediaStreamTrack.prototype.applyConstraints = function (c) {
        if (this.kind === 'audio' && (typeof c === 'undefined' ? 'undefined' : _typeof(c)) === 'object') {
          c = JSON.parse(JSON.stringify(c));
          remap(c, 'autoGainControl', 'mozAutoGainControl');
          remap(c, 'noiseSuppression', 'mozNoiseSuppression');
        }
        return nativeApplyConstraints.apply(this, [c]);
      };
    }
  }
}

},{"../utils":33}],32:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.shimLocalStreamsAPI = shimLocalStreamsAPI;
exports.shimRemoteStreamsAPI = shimRemoteStreamsAPI;
exports.shimCallbacksAPI = shimCallbacksAPI;
exports.shimGetUserMedia = shimGetUserMedia;
exports.shimConstraints = shimConstraints;
exports.shimRTCIceServerUrls = shimRTCIceServerUrls;
exports.shimTrackEventTransceiver = shimTrackEventTransceiver;
exports.shimCreateOfferLegacy = shimCreateOfferLegacy;
exports.shimAudioContext = shimAudioContext;

var _utils = require('../utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function shimLocalStreamsAPI(window) {
  if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object' || !window.RTCPeerConnection) {
    return;
  }
  if (!('getLocalStreams' in window.RTCPeerConnection.prototype)) {
    window.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
      if (!this._localStreams) {
        this._localStreams = [];
      }
      return this._localStreams;
    };
  }
  if (!('addStream' in window.RTCPeerConnection.prototype)) {
    var _addTrack = window.RTCPeerConnection.prototype.addTrack;
    window.RTCPeerConnection.prototype.addStream = function addStream(stream) {
      var _this = this;

      if (!this._localStreams) {
        this._localStreams = [];
      }
      if (!this._localStreams.includes(stream)) {
        this._localStreams.push(stream);
      }
      // Try to emulate Chrome's behaviour of adding in audio-video order.
      // Safari orders by track id.
      stream.getAudioTracks().forEach(function (track) {
        return _addTrack.call(_this, track, stream);
      });
      stream.getVideoTracks().forEach(function (track) {
        return _addTrack.call(_this, track, stream);
      });
    };

    window.RTCPeerConnection.prototype.addTrack = function addTrack(track) {
      var _this2 = this;

      for (var _len = arguments.length, streams = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        streams[_key - 1] = arguments[_key];
      }

      if (streams) {
        streams.forEach(function (stream) {
          if (!_this2._localStreams) {
            _this2._localStreams = [stream];
          } else if (!_this2._localStreams.includes(stream)) {
            _this2._localStreams.push(stream);
          }
        });
      }
      return _addTrack.apply(this, arguments);
    };
  }
  if (!('removeStream' in window.RTCPeerConnection.prototype)) {
    window.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
      var _this3 = this;

      if (!this._localStreams) {
        this._localStreams = [];
      }
      var index = this._localStreams.indexOf(stream);
      if (index === -1) {
        return;
      }
      this._localStreams.splice(index, 1);
      var tracks = stream.getTracks();
      this.getSenders().forEach(function (sender) {
        if (tracks.includes(sender.track)) {
          _this3.removeTrack(sender);
        }
      });
    };
  }
}

function shimRemoteStreamsAPI(window) {
  if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object' || !window.RTCPeerConnection) {
    return;
  }
  if (!('getRemoteStreams' in window.RTCPeerConnection.prototype)) {
    window.RTCPeerConnection.prototype.getRemoteStreams = function getRemoteStreams() {
      return this._remoteStreams ? this._remoteStreams : [];
    };
  }
  if (!('onaddstream' in window.RTCPeerConnection.prototype)) {
    Object.defineProperty(window.RTCPeerConnection.prototype, 'onaddstream', {
      get: function get() {
        return this._onaddstream;
      },
      set: function set(f) {
        var _this4 = this;

        if (this._onaddstream) {
          this.removeEventListener('addstream', this._onaddstream);
          this.removeEventListener('track', this._onaddstreampoly);
        }
        this.addEventListener('addstream', this._onaddstream = f);
        this.addEventListener('track', this._onaddstreampoly = function (e) {
          e.streams.forEach(function (stream) {
            if (!_this4._remoteStreams) {
              _this4._remoteStreams = [];
            }
            if (_this4._remoteStreams.includes(stream)) {
              return;
            }
            _this4._remoteStreams.push(stream);
            var event = new Event('addstream');
            event.stream = stream;
            _this4.dispatchEvent(event);
          });
        });
      }
    });
    var origSetRemoteDescription = window.RTCPeerConnection.prototype.setRemoteDescription;
    window.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
      var pc = this;
      if (!this._onaddstreampoly) {
        this.addEventListener('track', this._onaddstreampoly = function (e) {
          e.streams.forEach(function (stream) {
            if (!pc._remoteStreams) {
              pc._remoteStreams = [];
            }
            if (pc._remoteStreams.indexOf(stream) >= 0) {
              return;
            }
            pc._remoteStreams.push(stream);
            var event = new Event('addstream');
            event.stream = stream;
            pc.dispatchEvent(event);
          });
        });
      }
      return origSetRemoteDescription.apply(pc, arguments);
    };
  }
}

function shimCallbacksAPI(window) {
  if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object' || !window.RTCPeerConnection) {
    return;
  }
  var prototype = window.RTCPeerConnection.prototype;
  var origCreateOffer = prototype.createOffer;
  var origCreateAnswer = prototype.createAnswer;
  var setLocalDescription = prototype.setLocalDescription;
  var setRemoteDescription = prototype.setRemoteDescription;
  var addIceCandidate = prototype.addIceCandidate;

  prototype.createOffer = function createOffer(successCallback, failureCallback) {
    var options = arguments.length >= 2 ? arguments[2] : arguments[0];
    var promise = origCreateOffer.apply(this, [options]);
    if (!failureCallback) {
      return promise;
    }
    promise.then(successCallback, failureCallback);
    return Promise.resolve();
  };

  prototype.createAnswer = function createAnswer(successCallback, failureCallback) {
    var options = arguments.length >= 2 ? arguments[2] : arguments[0];
    var promise = origCreateAnswer.apply(this, [options]);
    if (!failureCallback) {
      return promise;
    }
    promise.then(successCallback, failureCallback);
    return Promise.resolve();
  };

  var withCallback = function withCallback(description, successCallback, failureCallback) {
    var promise = setLocalDescription.apply(this, [description]);
    if (!failureCallback) {
      return promise;
    }
    promise.then(successCallback, failureCallback);
    return Promise.resolve();
  };
  prototype.setLocalDescription = withCallback;

  withCallback = function withCallback(description, successCallback, failureCallback) {
    var promise = setRemoteDescription.apply(this, [description]);
    if (!failureCallback) {
      return promise;
    }
    promise.then(successCallback, failureCallback);
    return Promise.resolve();
  };
  prototype.setRemoteDescription = withCallback;

  withCallback = function withCallback(candidate, successCallback, failureCallback) {
    var promise = addIceCandidate.apply(this, [candidate]);
    if (!failureCallback) {
      return promise;
    }
    promise.then(successCallback, failureCallback);
    return Promise.resolve();
  };
  prototype.addIceCandidate = withCallback;
}

function shimGetUserMedia(window) {
  var navigator = window && window.navigator;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // shim not needed in Safari 12.1
    var mediaDevices = navigator.mediaDevices;
    var _getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
    navigator.mediaDevices.getUserMedia = function (constraints) {
      return _getUserMedia(shimConstraints(constraints));
    };
  }

  if (!navigator.getUserMedia && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.getUserMedia = function getUserMedia(constraints, cb, errcb) {
      navigator.mediaDevices.getUserMedia(constraints).then(cb, errcb);
    }.bind(navigator);
  }
}

function shimConstraints(constraints) {
  if (constraints && constraints.video !== undefined) {
    return Object.assign({}, constraints, { video: utils.compactObject(constraints.video) });
  }

  return constraints;
}

function shimRTCIceServerUrls(window) {
  if (!window.RTCPeerConnection) {
    return;
  }
  // migrate from non-spec RTCIceServer.url to RTCIceServer.urls
  var OrigPeerConnection = window.RTCPeerConnection;
  window.RTCPeerConnection = function RTCPeerConnection(pcConfig, pcConstraints) {
    if (pcConfig && pcConfig.iceServers) {
      var newIceServers = [];
      for (var i = 0; i < pcConfig.iceServers.length; i++) {
        var server = pcConfig.iceServers[i];
        if (!server.hasOwnProperty('urls') && server.hasOwnProperty('url')) {
          utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
          server = JSON.parse(JSON.stringify(server));
          server.urls = server.url;
          delete server.url;
          newIceServers.push(server);
        } else {
          newIceServers.push(pcConfig.iceServers[i]);
        }
      }
      pcConfig.iceServers = newIceServers;
    }
    return new OrigPeerConnection(pcConfig, pcConstraints);
  };
  window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
  // wrap static methods. Currently just generateCertificate.
  if ('generateCertificate' in OrigPeerConnection) {
    Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
      get: function get() {
        return OrigPeerConnection.generateCertificate;
      }
    });
  }
}

function shimTrackEventTransceiver(window) {
  // Add event.transceiver member over deprecated event.receiver
  if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.RTCTrackEvent && 'receiver' in window.RTCTrackEvent.prototype && !('transceiver' in window.RTCTrackEvent.prototype)) {
    Object.defineProperty(window.RTCTrackEvent.prototype, 'transceiver', {
      get: function get() {
        return { receiver: this.receiver };
      }
    });
  }
}

function shimCreateOfferLegacy(window) {
  var origCreateOffer = window.RTCPeerConnection.prototype.createOffer;
  window.RTCPeerConnection.prototype.createOffer = function createOffer(offerOptions) {
    if (offerOptions) {
      if (typeof offerOptions.offerToReceiveAudio !== 'undefined') {
        // support bit values
        offerOptions.offerToReceiveAudio = !!offerOptions.offerToReceiveAudio;
      }
      var audioTransceiver = this.getTransceivers().find(function (transceiver) {
        return transceiver.receiver.track.kind === 'audio';
      });
      if (offerOptions.offerToReceiveAudio === false && audioTransceiver) {
        if (audioTransceiver.direction === 'sendrecv') {
          if (audioTransceiver.setDirection) {
            audioTransceiver.setDirection('sendonly');
          } else {
            audioTransceiver.direction = 'sendonly';
          }
        } else if (audioTransceiver.direction === 'recvonly') {
          if (audioTransceiver.setDirection) {
            audioTransceiver.setDirection('inactive');
          } else {
            audioTransceiver.direction = 'inactive';
          }
        }
      } else if (offerOptions.offerToReceiveAudio === true && !audioTransceiver) {
        this.addTransceiver('audio');
      }

      if (typeof offerOptions.offerToReceiveVideo !== 'undefined') {
        // support bit values
        offerOptions.offerToReceiveVideo = !!offerOptions.offerToReceiveVideo;
      }
      var videoTransceiver = this.getTransceivers().find(function (transceiver) {
        return transceiver.receiver.track.kind === 'video';
      });
      if (offerOptions.offerToReceiveVideo === false && videoTransceiver) {
        if (videoTransceiver.direction === 'sendrecv') {
          if (videoTransceiver.setDirection) {
            videoTransceiver.setDirection('sendonly');
          } else {
            videoTransceiver.direction = 'sendonly';
          }
        } else if (videoTransceiver.direction === 'recvonly') {
          if (videoTransceiver.setDirection) {
            videoTransceiver.setDirection('inactive');
          } else {
            videoTransceiver.direction = 'inactive';
          }
        }
      } else if (offerOptions.offerToReceiveVideo === true && !videoTransceiver) {
        this.addTransceiver('video');
      }
    }
    return origCreateOffer.apply(this, arguments);
  };
}

function shimAudioContext(window) {
  if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object' || window.AudioContext) {
    return;
  }
  window.AudioContext = window.webkitAudioContext;
}

},{"../utils":33}],33:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.extractVersion = extractVersion;
exports.wrapPeerConnectionEvent = wrapPeerConnectionEvent;
exports.disableLog = disableLog;
exports.disableWarnings = disableWarnings;
exports.log = log;
exports.deprecated = deprecated;
exports.detectBrowser = detectBrowser;
exports.compactObject = compactObject;
exports.walkStats = walkStats;
exports.filterStats = filterStats;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var logDisabled_ = true;
var deprecationWarnings_ = true;

/**
 * Extract browser version out of the provided user agent string.
 *
 * @param {!string} uastring userAgent string.
 * @param {!string} expr Regular expression used as match criteria.
 * @param {!number} pos position in the version string to be returned.
 * @return {!number} browser version.
 */
function extractVersion(uastring, expr, pos) {
  var match = uastring.match(expr);
  return match && match.length >= pos && parseInt(match[pos], 10);
}

// Wraps the peerconnection event eventNameToWrap in a function
// which returns the modified event object (or false to prevent
// the event).
function wrapPeerConnectionEvent(window, eventNameToWrap, wrapper) {
  if (!window.RTCPeerConnection) {
    return;
  }
  var proto = window.RTCPeerConnection.prototype;
  var nativeAddEventListener = proto.addEventListener;
  proto.addEventListener = function (nativeEventName, cb) {
    if (nativeEventName !== eventNameToWrap) {
      return nativeAddEventListener.apply(this, arguments);
    }
    var wrappedCallback = function wrappedCallback(e) {
      var modifiedEvent = wrapper(e);
      if (modifiedEvent) {
        if (cb.handleEvent) {
          cb.handleEvent(modifiedEvent);
        } else {
          cb(modifiedEvent);
        }
      }
    };
    this._eventMap = this._eventMap || {};
    if (!this._eventMap[eventNameToWrap]) {
      this._eventMap[eventNameToWrap] = new Map();
    }
    this._eventMap[eventNameToWrap].set(cb, wrappedCallback);
    return nativeAddEventListener.apply(this, [nativeEventName, wrappedCallback]);
  };

  var nativeRemoveEventListener = proto.removeEventListener;
  proto.removeEventListener = function (nativeEventName, cb) {
    if (nativeEventName !== eventNameToWrap || !this._eventMap || !this._eventMap[eventNameToWrap]) {
      return nativeRemoveEventListener.apply(this, arguments);
    }
    if (!this._eventMap[eventNameToWrap].has(cb)) {
      return nativeRemoveEventListener.apply(this, arguments);
    }
    var unwrappedCb = this._eventMap[eventNameToWrap].get(cb);
    this._eventMap[eventNameToWrap].delete(cb);
    if (this._eventMap[eventNameToWrap].size === 0) {
      delete this._eventMap[eventNameToWrap];
    }
    if (Object.keys(this._eventMap).length === 0) {
      delete this._eventMap;
    }
    return nativeRemoveEventListener.apply(this, [nativeEventName, unwrappedCb]);
  };

  Object.defineProperty(proto, 'on' + eventNameToWrap, {
    get: function get() {
      return this['_on' + eventNameToWrap];
    },
    set: function set(cb) {
      if (this['_on' + eventNameToWrap]) {
        this.removeEventListener(eventNameToWrap, this['_on' + eventNameToWrap]);
        delete this['_on' + eventNameToWrap];
      }
      if (cb) {
        this.addEventListener(eventNameToWrap, this['_on' + eventNameToWrap] = cb);
      }
    },

    enumerable: true,
    configurable: true
  });
}

function disableLog(bool) {
  if (typeof bool !== 'boolean') {
    return new Error('Argument type: ' + (typeof bool === 'undefined' ? 'undefined' : _typeof(bool)) + '. Please use a boolean.');
  }
  logDisabled_ = bool;
  return bool ? 'adapter.js logging disabled' : 'adapter.js logging enabled';
}

/**
 * Disable or enable deprecation warnings
 * @param {!boolean} bool set to true to disable warnings.
 */
function disableWarnings(bool) {
  if (typeof bool !== 'boolean') {
    return new Error('Argument type: ' + (typeof bool === 'undefined' ? 'undefined' : _typeof(bool)) + '. Please use a boolean.');
  }
  deprecationWarnings_ = !bool;
  return 'adapter.js deprecation warnings ' + (bool ? 'disabled' : 'enabled');
}

function log() {
  if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object') {
    if (logDisabled_) {
      return;
    }
    if (typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log.apply(console, arguments);
    }
  }
}

/**
 * Shows a deprecation warning suggesting the modern and spec-compatible API.
 */
function deprecated(oldMethod, newMethod) {
  if (!deprecationWarnings_) {
    return;
  }
  console.warn(oldMethod + ' is deprecated, please use ' + newMethod + ' instead.');
}

/**
 * Browser detector.
 *
 * @return {object} result containing browser and version
 *     properties.
 */
function detectBrowser(window) {
  // Returned result object.
  var result = { browser: null, version: null };

  // Fail early if it's not a browser
  if (typeof window === 'undefined' || !window.navigator) {
    result.browser = 'Not a browser.';
    return result;
  }

  var navigator = window.navigator;


  if (navigator.mozGetUserMedia) {
    // Firefox.
    result.browser = 'firefox';
    result.version = extractVersion(navigator.userAgent, /Firefox\/(\d+)\./, 1);
  } else if (navigator.webkitGetUserMedia || window.isSecureContext === false && window.webkitRTCPeerConnection && !window.RTCIceGatherer) {
    // Chrome, Chromium, Webview, Opera.
    // Version matches Chrome/WebRTC version.
    // Chrome 74 removed webkitGetUserMedia on http as well so we need the
    // more complicated fallback to webkitRTCPeerConnection.
    result.browser = 'chrome';
    result.version = extractVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2);
  } else if (navigator.mediaDevices && navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
    // Edge.
    result.browser = 'edge';
    result.version = extractVersion(navigator.userAgent, /Edge\/(\d+).(\d+)$/, 2);
  } else if (window.RTCPeerConnection && navigator.userAgent.match(/AppleWebKit\/(\d+)\./)) {
    // Safari.
    result.browser = 'safari';
    result.version = extractVersion(navigator.userAgent, /AppleWebKit\/(\d+)\./, 1);
    result.supportsUnifiedPlan = window.RTCRtpTransceiver && 'currentDirection' in window.RTCRtpTransceiver.prototype;
  } else {
    // Default fallthrough: not supported.
    result.browser = 'Not a supported browser.';
    return result;
  }

  return result;
}

/**
 * Checks if something is an object.
 *
 * @param {*} val The something you want to check.
 * @return true if val is an object, false otherwise.
 */
function isObject(val) {
  return Object.prototype.toString.call(val) === '[object Object]';
}

/**
 * Remove all empty objects and undefined values
 * from a nested object -- an enhanced and vanilla version
 * of Lodash's `compact`.
 */
function compactObject(data) {
  if (!isObject(data)) {
    return data;
  }

  return Object.keys(data).reduce(function (accumulator, key) {
    var isObj = isObject(data[key]);
    var value = isObj ? compactObject(data[key]) : data[key];
    var isEmptyObject = isObj && !Object.keys(value).length;
    if (value === undefined || isEmptyObject) {
      return accumulator;
    }
    return Object.assign(accumulator, _defineProperty({}, key, value));
  }, {});
}

/* iterates the stats graph recursively. */
function walkStats(stats, base, resultSet) {
  if (!base || resultSet.has(base.id)) {
    return;
  }
  resultSet.set(base.id, base);
  Object.keys(base).forEach(function (name) {
    if (name.endsWith('Id')) {
      walkStats(stats, stats.get(base[name]), resultSet);
    } else if (name.endsWith('Ids')) {
      base[name].forEach(function (id) {
        walkStats(stats, stats.get(id), resultSet);
      });
    }
  });
}

/* filter getStats for a sender/receiver track. */
function filterStats(result, track, outbound) {
  var streamStatsType = outbound ? 'outbound-rtp' : 'inbound-rtp';
  var filteredResult = new Map();
  if (track === null) {
    return filteredResult;
  }
  var trackStats = [];
  result.forEach(function (value) {
    if (value.type === 'track' && value.trackIdentifier === track.id) {
      trackStats.push(value);
    }
  });
  trackStats.forEach(function (trackStat) {
    result.forEach(function (stats) {
      if (stats.type === streamStatsType && stats.trackId === trackStat.id) {
        walkStats(result, stats, filteredResult);
      }
    });
  });
  return filteredResult;
}

},{}],34:[function(require,module,exports){
const api = require('janus-videoroom-api');

const JANUS_CONFIG = {
  url: '%JANUS_URL%',
  keepAliveIntervalMs: 30000,
  options: {
    rejectUnauthorized: false
  },

  codec: 'vp8,vp9,h264',
  videoOrientExt: false,

  bitrate: 774144,  //max video bitrate for senders (e.g.128000)
  firSeconds: 10,
  publishers: 20,   //max number of concurrent senders (e.g., 6 for a video conference or 1 for a webinar)
  recordDirectory: '%RECORDS_DIRECTORY%',

  filterDirectCandidates: true,
};

module.exports = {
  janus: new api.JanusConfig(JANUS_CONFIG),
  room: new api.JanusRoomConfig(JANUS_CONFIG),

  ice: {
    iceServers: [
      { urls: 'stun:%COTURN_URL%' },
      {
         urls: 'turn:%COTURN_URL%',
         username: '%COTURN_USERNAME%',
         credential: '%COTURN_PASSWORD%'
      },
    ]
  },

  gatherer: {
    url: '%GATHERER_URL%',
    reportingInterval: '%SEND_METRICS_INTERVAL%',      //unit = 0.1s
    connectionInterval: '%CONNECT_GATHERER_INTERVAL%', //unit = 1.0s
  },

  moderator: {
    url: '%MODERATOR_URL%',
    connectionInterval: '%CONNECT_MODERATOR_INTERVAL%', //unit = 1.0s
  }
};
},{"janus-videoroom-api":3}],35:[function(require,module,exports){
const api = require('janus-videoroom-api');
const moderator = require('../service/moderator');
const config = require('../config');
const links = require('../links');

const adapter = require('webrtc-adapter');

let roomAdminApi = undefined;

window.onload = () => {
    const viewCreateRoomDescription = document.getElementById("createRoomDescription");
    const viewCreateRoomRecording = document.getElementById("createRoomRecording");
    const viewCreateRoomHidden = document.getElementById("createRoomHidden");
    const viewCreateRoomHidePin = document.getElementById("createRoomHidePin");
    const viewCreateRoomSecret = document.getElementById("createRoomSecret");
    const viewCreateRoomPin = document.getElementById("createRoomPin");
    const viewCreateButton = document.getElementById("create");
    const viewCreatedMessage = document.getElementById("createdMessage");

    const viewDeleteRoomId = document.getElementById("deleteRoomId");
    const viewDeleteRoomSecret = document.getElementById("deleteRoomSecret");
    const viewDeletedMessage = document.getElementById("deletedMessage");
    const viewDeleteButton = document.getElementById("delete");

    viewCreateButton.onclick = create;
    viewDeleteButton.onclick = destroy;

    (new api.Janus(config.janus, console)).connect()
        .then((janus) => {
            console.log("Janus connected:", janus);
            return janus.addPlugin(new api.VideoRoomAdmin(config.room, console))
                .then((attachedApi) => {
                    roomAdminApi = attachedApi;
                    console.log("VideoRoomAdmin plugin attached:", roomAdminApi);
                });
        });

    async function create() {
        const description = viewCreateRoomDescription.value;
        const recording = viewCreateRoomRecording.checked;
        const hidden = viewCreateRoomHidden.checked;
        const secret = viewCreateRoomSecret.value;
        const pin = viewCreateRoomPin.value;

        const roomId = await roomAdminApi.createRoom(description, hidden, recording, pin, secret);
        const link = document.createElement("a");
        link.innerText = `Room ${roomId}`;

        if (viewCreateRoomHidePin.checked) {
            link.href = links.roomUrl(roomId);
        } else {
            link.href = links.roomUrl(roomId, pin);
        }

        viewCreatedMessage.innerHTML = "";
        viewCreatedMessage.appendChild(link);
        viewCreatedMessage.hidden = false;
        console.log("Room created", roomId);

        moderator.oneshot((socket) => {
            const command = {
                "roomId": roomId,
                "operation": {
                    "registerSecret": {
                        "secret": secret
                    }
                }
            };

            socket.send(JSON.stringify(command));
        });
    }

    async function destroy() {
        const id = Number(viewDeleteRoomId.value);
        const secret = viewDeleteRoomSecret.value;
        const deleted = await roomAdminApi.destroyRoom(id, secret);
        viewDeletedMessage.innerText = `Deleted room ${id}`;
        viewDeletedMessage.hidden = false;
        console.log("Room deleted", deleted);

        //todo: destroy sub-rooms
    }
};

},{"../config":34,"../links":36,"../service/moderator":49,"janus-videoroom-api":3,"webrtc-adapter":19}],36:[function(require,module,exports){
const roomIdParam = "id";
const roomPinParam = "pin";
const roomSecretParam = "secret";

module.exports = {
    roomUrl,
    roomIdParam,
    roomPinParam,
    roomSecretParam,
};

function baseUrl() {
    return window.location.toString()
        .replace(/admin.*/, "");
}

function roomUrl(id, pin) {
    let link = baseUrl() + "?";

    if (!id || id === "") {
        console.error("Can't construct link for a room without id");
        return;
    }
    link = link + `id=${id}`;

    if (!pin || pin === "") {
        return link;
    }
    link = link + `&pin=${pin}`;

    return link;
}

},{}],37:[function(require,module,exports){
module.exports = {
    initialize,
    appendMessage,
};

function initialize(publisher) {
    console.log("Initializing the chat");

    let messageInput = document.getElementById("textMessageInput");
    let sendButton = document.getElementById("sendTextMessage");

    let inputFinished = () => {
        sendTextMessage(publisher, messageInput.value);
        messageInput.value = '';
    };

    sendButton.onclick = inputFinished;
    messageInput.onkeypress = (event) => {
        if (event.key === "Enter") {
            inputFinished();
        }
    };
}

function appendMessage(message) {
    let messagesHistory = document.getElementById("messagesHistory");
    let text = document.createTextNode(message);
    let listItem = document.createElement('li');
    listItem.appendChild(text);
    messagesHistory.appendChild(listItem);
    messagesHistory.scrollTop = messagesHistory.scrollHeight;
}

function sendTextMessage(publisher, text) {
    if (text === "") {
        return;
    }

    let message = wrapWithDate(publisher.displayName, text);
    publisher.sendData(message);
    appendMessage(message);
}

function wrapWithDate(displayName, text) {
    let date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes().toString().padStart(2,'0');
    let seconds = date.getSeconds().toString().padStart(2,'0');

    return `${hours}:${minutes}:${seconds} <${displayName}>: ${text}`;
}
},{}],38:[function(require,module,exports){
const media = require('./media');
const inbound = require('./inbound');
const host = require('./host/host');

module.exports = {
    initialize,
    updateOutbound,
    updateInbound,
    removeInbound,
    clearInbound,
    memberDisplayed
};

const inboundDisplayByMember = new Map();

let inboundDisplaysGrid;
let outboundDisplay;
let publisher;

function initialize(outboundPublisher) {
    publisher = outboundPublisher;
    outboundDisplay = document.getElementById("outboundDisplay");
    inboundDisplaysGrid = document.getElementById("inboundDisplaysGrid");

    setGridWidth(2);
    document.getElementById("gridWider").onclick = makeGridWider;
    document.getElementById("gridNarrower").onclick = makeGridNarrower;
}

function updateOutbound(stream) {
    console.log(`Displaying local participant`);
    const label = publisher.displayName + " (me)";

    outboundDisplay.innerHTML = "";
    return display(outboundDisplay, stream, label, true, true);
}

function updateInbound(stream, memberId, displayName, container = null) {
    console.log(`Displaying remote participant ${memberId} also known as ${displayName}`);
    const cell = provideCellInGrid(memberId, container);
    cell.innerHTML = "";

    inboundDisplayByMember.set(memberId, cell);

    let isSubroom = !!container;
    const video = display(cell, stream, displayName, isSubroom, isSubroom);

    if (!isSubroom) {
        inbound.appendControls(cell, video, memberId);

        const hostControls = host.createControls(memberId);
        if (hostControls) {
            cell.appendChild(hostControls);
        }
    }
}

function removeInbound(memberId) {
    const inboundDisplay = inboundDisplayByMember.get(memberId);
    if (inboundDisplay) {
        console.log("Removing display for", memberId);
        inboundDisplayByMember.delete(memberId);
        inboundDisplay.remove();
    }
}

function clearInbound() {
    inboundDisplayByMember.forEach((cell) => {
        cell.remove();
    });
    inboundDisplayByMember.clear();
}

function memberDisplayed(memberId) {
    return !!inboundDisplayByMember[memberId];
}

async function display(container, stream, label, minimized, isLocal) {
    const caption = document.createElement("p");
    caption.setAttribute("align", "center");
    caption.innerText = label;

    const videoTracks = media.streamTracks(stream, "video");
    const audioTracks = media.streamTracks(stream, "audio");

    const video = document.createElement("video");
    video.srcObject = stream;
    if (isLocal) {
        video.muted = true;
    }

    const size = SIZES[minimized];

    if (videoTracks.length > 0) {
        video.width = size.width;
        video.height = size.height;
    } else {
        video.width = 0;
        video.height = 0;

        const speaker = document.createElement("img");
        if (audioTracks.length > 0) {
            speaker.src = "speaker.jpg";
        } else {
            speaker.src = "muted.jpg";
        }
        speaker.width = size.width;
        speaker.height = size.height;
        container.appendChild(speaker);
    }
    container.appendChild(video);
    container.appendChild(document.createElement("p"));
    container.appendChild(caption);

    await video.play();
    return video;
}

let gridWidth;

function makeGridWider() {
    setGridWidth(gridWidth + 1);
}
function makeGridNarrower() {
    if (gridWidth > 1) {
        setGridWidth(gridWidth - 1);
    }
}
function setGridWidth(width) {
    gridWidth = width;
    inboundDisplaysGrid.style.gridTemplateColumns = "auto ".repeat(width);
}

function provideCellInGrid(memberId, container = null) {
    let cell = inboundDisplayByMember[memberId];
    if (!cell) {
        cell = document.createElement("div");
        let grid = container ? container : inboundDisplaysGrid;
        grid.appendChild(cell);
    }
    return cell;
}

const SIZES = {
    true: { width: 320, height: 240 }, //minimized
    false: { width: 640, height: 480 }, //full-size
};

},{"./host/host":40,"./inbound":42,"./media":43}],39:[function(require,module,exports){
const api = require('janus-videoroom-api');
const subroom = require('../subroom');
const config = require('../../config');

module.exports = {
    initialize,
    appendControls
};

let roomAdminApi = undefined;

let monitorFn;

let createSubRoomButton;
const checkboxes = Array();

function initialize(moderator, _monitorFn, janus, roomId, roomSecret) {
    if (roomAdminApi) {
        console.log("Break-out capability is already initialized");
        return false;
    }
    monitorFn = _monitorFn;

    janus.addPlugin(new api.VideoRoomAdmin(config.room, console))
        .then((attachedApi) => {
            roomAdminApi = attachedApi;
            console.log("VideoRoomAdmin plugin attached:", roomAdminApi);
        });

    createSubRoomButton = document.getElementById("createSubRoom");
    createSubRoomButton.onclick = forkRoom(moderator, roomId, roomSecret);
    createSubRoomButton.hidden = false;

    return true;
}

function forkRoom(moderator, roomId, roomSecret) {
    return async () => {
        console.log("Creating new break-out room");

        const selected = checkboxes
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.memberId);
        console.log("Selected members", selected);

        const recording = false; //todo
        const subroomPin = Math.random().toString(36).substring(7);
        const subroomId = await roomAdminApi.createRoom("[Break-out room]", true, recording, subroomPin, roomSecret);

        const command = {
            "roomId": roomId,
            "operation": {
                "forkRoom": {
                    "target_id": subroomId,
                    "target_pin": subroomPin,
                    "member_ids": selected
                }
            }
        };

        console.log("Break-out request constructed", command);
        moderator.sendRequest(command);

        const display = subroom.createMonitor(subroomId, subroomPin, [
            mergeRoom(moderator, roomId, subroomId),
            presentRoom(moderator, roomId, subroomId)
        ]);
        monitorFn(subroomId, subroomPin, display, true);
    };
}

function mergeRoom(moderator, roomId, subroomId) {
    return async () => {
        console.log("Merging subroom back", subroomId);

        const command = {
            "roomId": roomId,
            "operation": {
                "mergeRoom": {
                    "target_id": subroomId,
                }
            }
        };

        console.log("Merge-back request constructed", command);
        moderator.sendRequest(command);

        subroom.removeMonitor(subroomId);
    };
}

function presentRoom(moderator, roomId, subroomId) {
    return async () => {
        console.log("Presenting subroom to the classroom", subroomId);

        const command = {
            "roomId": roomId,
            "operation": {
                "presentRoom": {
                    "target_id": subroomId,
                }
            }
        };

        console.log("Presenting request constructed ", command);
        moderator.sendRequest(command);
    };
}

function appendControls(container, memberId) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.memberId = memberId;

    container.appendChild(checkbox);
    checkboxes.push(checkbox);
}

},{"../../config":34,"../subroom":46,"janus-videoroom-api":3}],40:[function(require,module,exports){
const restrictions = require('./restrictions');
const breakout = require('./breakout');

module.exports = {
    initialize,
    createControls,
};

let initialized = false;

function initialize(moderator, janus, roomId, roomSecret, monitorFn) {
    initialized = initialized || restrictions.initialize(moderator, roomId) &&
                  breakout.initialize(moderator, monitorFn, janus, roomId, roomSecret);
    console.log("Host capabilities initialized?", initialized);
}

function createControls(memberId) {
    if (!initialized) {
        return;
    }

    const container = document.createElement("div");
    restrictions.appendControls(container, memberId);
    breakout.appendControls(container, memberId);

    return container;
}

},{"./breakout":39,"./restrictions":41}],41:[function(require,module,exports){
module.exports = {
    initialize,
    appendControls
};

let restrictionsApi;

function initialize(moderator, roomId) {
    if (restrictionsApi) {
        console.log("Restricting capability is already initialized");
        return false;
    }

    function constructRequest(memberId, kind, restricted) {
        const command = {
            "roomId": roomId,
            "operation": {
                "setRestriction": {
                    "member_id": memberId,
                    "kind": kind,
                    "restricted": restricted
                }
            }
        };

        console.log("Restriction request constructed ", command);
        return command;
    }

    restrictionsApi = {
        restrictParticipant: (memberId, kind) => {
            console.log(`Restricting ${kind} track of ${memberId}`);
            const command = constructRequest(memberId, kind, true);
            moderator.sendRequest(command);
        },
        unrestrictParticipant: (memberId, kind) => {
            console.log(`Unrestricting ${kind} track of ${memberId}`);
            const command = constructRequest(memberId, kind, false);
            moderator.sendRequest(command);
        }
    };

    return true;
}

function appendControls(container, memberId) {
    const muteForAll = document.createElement("button");
    muteForAll.innerText = MUTE_AUDIO_FOR_ALL;
    muteForAll.onclick = muteAudioForAll(memberId, muteForAll);

    const hideForAll = document.createElement("button");
    hideForAll.innerText = MUTE_VIDEO_FOR_ALL;
    hideForAll.onclick = muteVideoForAll(memberId, hideForAll);

    container.appendChild(muteForAll);
    container.appendChild(hideForAll);
}

function muteAudioForAll(memberId, button) {
    return () => {
        restrictionsApi.restrictParticipant(memberId, "audio");

        button.innerText = UNMUTE_AUDIO_FOR_ALL;
        button.onclick = unmuteAudioForAll(memberId, button);
    };
}

function muteVideoForAll(memberId, button) {
    return () => {
        restrictionsApi.restrictParticipant(memberId, "video");

        button.innerText = UNMUTE_VIDEO_FOR_ALL;
        button.onclick = unmuteVideoForAll(memberId, button);
    };
}

function unmuteAudioForAll(memberId, button) {
    return () => {
        restrictionsApi.unrestrictParticipant(memberId, "audio");

        button.innerText = MUTE_AUDIO_FOR_ALL;
        button.onclick = muteAudioForAll(memberId, button);
    };
}

function unmuteVideoForAll(memberId, button) {
    return () => {
        restrictionsApi.unrestrictParticipant(memberId, "video");

        button.innerText = MUTE_VIDEO_FOR_ALL;
        button.onclick = muteVideoForAll(memberId, button);
    };
}

const MUTE_AUDIO_FOR_ALL = "Mute for all";
const UNMUTE_AUDIO_FOR_ALL = "Unmute for all";
const MUTE_VIDEO_FOR_ALL = "Unwatch for all";
const UNMUTE_VIDEO_FOR_ALL = "Watch for all";

},{}],42:[function(require,module,exports){
module.exports = {
    initialize,
    appendControls,
};

let subscriptions;
// Map[MemberId, Subscriber]

let subroomSubscriptions;
// Map[RoomId, Map[MemberId, Subscriber]]

let removeFocusButton;

function initialize(_subscriptions, _subroomSubscriptions) {
    subscriptions = _subscriptions;
    subroomSubscriptions = _subroomSubscriptions;
    removeFocusButton = document.getElementById("removeFocus");
    removeFocusButton.onclick = removeFocus;
}

function appendControls(container, video, memberId) {
    const mute = document.createElement("button");
    mute.innerText = MUTE_INBOUND_AUDIO;
    mute.onclick = muteAudio(memberId, mute);

    const hide = document.createElement("button");
    hide.innerText = MUTE_INBOUND_VIDEO;
    hide.onclick = muteVideo(memberId, hide);

    const focus = document.createElement("button");
    focus.innerText = FOCUS_ON_MEMBER;
    focus.onclick = focusOnMember(memberId);

    const fullscreen = document.createElement("button");
    fullscreen.innerText = SWITCH_FULL_SCREEN;
    fullscreen.onclick = switchFullScreen(memberId, video);

    const leftHalf = document.createElement("div");
    leftHalf.appendChild(mute);
    leftHalf.appendChild(hide);
    leftHalf.style.float = "left";

    const rightHalf = document.createElement("div");
    rightHalf.appendChild(focus);
    rightHalf.appendChild(fullscreen);
    rightHalf.style.float = "right";

    container.appendChild(leftHalf);
    container.appendChild(rightHalf);
}

function focusOnMember(memberId) {
    return () => {
        console.log("Focusing on member", memberId);
        subscriptions.forEach((subscription) => {
            if (memberId === subscription.publisherId) {
                subscription.startVideo();
            } else {
                subscription.stopVideo();
            }
        });
        removeFocusButton.hidden = false;
    };
}

function removeFocus() {
    console.log("Removing focus on a particular member");
    subscriptions.forEach((subscription) => {
        subscription.startVideo();
    });
    removeFocusButton.hidden = true;
}

function switchFullScreen(memberId, video) {
    return () => {
        if (video.requestFullscreen) {
            console.log("Generic fullscreen method works");
            video.requestFullscreen();
        } else if (video.mozRequestFullScreen) {
            console.log("Firefox is being used");
            video.mozRequestFullScreen();
        } else if (video.webkitRequestFullscreen) {
            console.log("Chrome/Safari/Opera is being used");
            video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
            console.log("Are you using IE/Edge? Seriously?");
            video.msRequestFullscreen();
        }

        video.onfullscreenchange = (event) => {
            if (document.fullscreenElement) {
                console.log("Entering full-screen", event);
                focusOnMember(memberId)();
            } else {
                console.log("Leaving full-screen", event);
                removeFocus();
            }
        };
    };
}

function muteAudio(memberId, button) {
    return () => {
        subscriptions.get(memberId).stopAudio();
        button.innerText = UNMUTE_INBOUND_AUDIO;
        button.onclick = unmuteAudio(memberId, button);
    };
}
function muteVideo(memberId, button) {
    return () => {
        subscriptions.get(memberId).stopVideo();
        button.innerText = UNMUTE_INBOUND_VIDEO;
        button.onclick = unmuteVideo(memberId, button);
    };
}

function unmuteAudio(memberId, button) {
    return () => {
        subscriptions.get(memberId).startAudio();
        button.innerText = MUTE_INBOUND_AUDIO;
        button.onclick = muteAudio(memberId, button);
    };
}
function unmuteVideo(memberId, button) {
    return () => {
        subscriptions.get(memberId).startVideo();
        button.innerText = MUTE_INBOUND_VIDEO;
        button.onclick = muteVideo(memberId, button);
    };
}

const MUTE_INBOUND_AUDIO = "Mute";
const UNMUTE_INBOUND_AUDIO = "Unmute";
const MUTE_INBOUND_VIDEO = "Unwatch";
const UNMUTE_INBOUND_VIDEO = "Watch";

const FOCUS_ON_MEMBER = "Focus";
const SWITCH_FULL_SCREEN = "Full screen";

},{}],43:[function(require,module,exports){
module.exports = {
    initialize,
    deinitialize,
    bindDevices,
    bindScreen,
    muteDevices,
    muteScreen,
    unmuteScreen,
    outboundTracks,
    streamTracks,

    lowFPS: { ideal: 4 },
    highFPS: { ideal: 30 },
    lowResWidth: { max: 640 },
    lowResHeight: { max: 480 },
    highResWidth: { min: 1280, ideal: 1960 },
    highResHeight: { min: 720, ideal: 1080 },
};

let audioActive = false;
let videoActive = false;
let screenActive = false;

let audioSenders = [];
let videoSenders = [];

let screenVideoTracks = [];

let mockAudio = null;
let mockVideo = null;

let stream = new MediaStream();
stream.addTrack(mockMediaStreamTrack("audio"));
stream.addTrack(mockMediaStreamTrack("video"));
// For unknown reason, just adding new tracks to existing stream
// doesn't fire "stream.onaddtrack" on remote side; this is why
// we create fake tracks if user doesn't want to share audio/video
// from the very beginning, and replace them later
// if he decides to share them

function initialize(peerConnection) {
    stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track);
    });
    peerConnection.getSenders()
        .forEach((sender) => {
            if (sender.track.kind === "audio") {
                audioSenders.push(sender);
            }
            if (sender.track.kind === "video") {
                videoSenders.push(sender);
            }
        });
    return stream;
}

function deinitialize() {
    audioSenders = [];
    videoSenders = [];
}

async function bindDevices(audio, video) {
    console.log("Microphone requested?", audio);
    console.log("Camera requested?", video);
    console.log("Microphone bound?", audioActive);
    console.log("Camera bound?", videoActive);
    const constraints = {
        audio: audio || audioActive,
        video: video || videoActive,
    };
    if (!constraints.audio && !constraints.video) {
        return stream;
    }

    console.log("Binding devices", constraints);
    stream = await navigator.mediaDevices
        .getUserMedia(constraints)
        .catch((e) => {
            console.error(e);
        });

    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach((track) => {
        printDebugInfo(track);

        const audioSettings = track.getSettings();
        console.log("[[ is echo cancellation on? ]]", audioSettings.echoCancellation);
        console.log("[[ is noise suppression on? ]]", audioSettings.noiseSuppression);
        console.log("[[ is auto gain control on? ]]", audioSettings.autoGainControl);
    });

    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => {
        printDebugInfo(track);
    });

    async function replaceTracks(kind, newTracks) {
        console.assert(newTracks.length < 2);

        if (kind === "audio") {
            await audioSenders[0].replaceTrack(newTracks[0]);
        }
        if (kind === "video") {
            await videoSenders[0].replaceTrack(newTracks[0]);
        }
    }

    if (audioTracks.length > 0) {
        await replaceTracks("audio", audioTracks);
        audioActive = true;
    }
    if (videoTracks.length > 0) {
        await replaceTracks("video", videoTracks);
        videoActive = true;
    }

    return stream;
}

function muteDevices(kind) {
    console.log("Muting bound device", kind);
    outboundTracks(kind)
        .forEach((track) => {
            printDebugInfo(track);
            track.enabled = false;
        });
    if (kind === "audio") {
        audioActive = false;
    }
    if (kind === "video") {
        videoActive = false;
    }
    return stream;
}

async function bindScreen() {
    console.assert(!screenActive);

    console.log("Binding screen media");
    await navigator.mediaDevices.getDisplayMedia()
        .then((stream) => {
            screenActive = true;
            screenVideoTracks = stream.getVideoTracks();
            if (stream.getAudioTracks().length > 0) {
                console.warn("There are also audio tracks");
            }
        })
        .catch((e) => {
            screenActive = false;
            screenVideoTracks = undefined;
            console.error(e);
        });

    console.assert(screenVideoTracks.length === 1);
    return screenVideoTracks[0];
}

function muteScreen() {
    screenVideoTracks.forEach((track) => {
        track.enabled = false;
    });
    screenActive = false;
}

function unmuteScreen() {
    console.assert(!screenActive);
    console.assert(screenVideoTracks);
    screenVideoTracks.forEach((track) => {
        track.enabled = true;
    });
    screenActive = true;
}

function streamTracks(stream, kind) {
    if (kind === "audio") {
        return stream
            .getAudioTracks()
            .filter((track) => {
                printDebugInfo(track);
                return track.enabled && track.id !== mockAudio.id;
            });
    }
    if (kind === "video") {
        return stream
            .getVideoTracks()
            .filter((track) => {
                printDebugInfo(track);
                return track.enabled && track.id !== mockVideo.id;
            });
    }
}

function outboundTracks(kind) {
    let senders;
    if (kind === "audio") {
        senders = audioSenders;
    }
    if (kind === "video") {
        senders = videoSenders;
    }
    return senders.map((sender) => sender.track);
}

function mockMediaStreamTrack(kind) {
    console.log(`Initializing mock ${kind} stream`);
    if (kind === "audio") {
        if (mockAudio) {
            return mockAudio;
        } else {
            const ctx = new AudioContext();
            const oscillator = ctx.createOscillator();
            const dst = oscillator.connect(ctx.createMediaStreamDestination());
            oscillator.start();
            const track = Object.assign(dst.stream.getAudioTracks()[0], {enabled: false});
            console.log("mockMediaStreamTrack('audio').id", track.id);

            mockAudio = track;
            return track;
        }
    }
    if (kind === "video") {
        if (mockVideo) {
            return mockVideo;
        } else {
            const width = 640;
            const height = 480;

            const canvas = Object.assign(document.createElement("canvas"), {width, height});
            canvas.getContext('2d').fillRect(0, 0, width, height);
            const stream = canvas.captureStream(1);
            const track = Object.assign(stream.getVideoTracks()[0], {enabled: false});
            console.log("mockMediaStreamTrack('video').id", track.id);

            mockVideo = track;
            return track;
        }
    }
    console.error(`unknown kind ${kind}`);
    return undefined;
}

function printDebugInfo(track) {
    let label = "";
    if (!track.enabled) {
        label += " [ disabled ]";
    }
    if (track.id === mockAudio.id || track.id === mockVideo.id) {
        label += " [ mock ]";
    }
    console.log(`[ ${track.kind} track ].id = ${track.id}${label}`);
}

},{}],44:[function(require,module,exports){
const display = require('./display');
const media = require('./media');
const room = require('./room');

module.exports = {
    initialize,
    initializeSubroom,
    deinitialize,

    muteAudio,
    stopVideo,
    unmuteAudio,
    startVideo,

    restrictAudio,
    restrictVideo,
    unrestrictAudio,
    unrestrictVideo,
};

let member;
let roomApi;
let publisher;

let screenPublisher;

let subroomToPublisher = new Map();

let switchAudioButton;
let switchVideoButton;
let switchResolutionButton;
let switchFpsButton;
let shareScreenButton;

const videoConstraints = {
    width: media.lowResWidth,
    height: media.lowResHeight,
    frameRate: media.highFPS
};

let audioRestricted = false;
let videoRestricted = false;

function initialize(_roomApi, outboundPublisher, audioOn, videoOn, screenOn, _member) {
    roomApi = _roomApi;
    publisher = outboundPublisher;
    member = _member;

    audioRestricted = false;
    videoRestricted = false;

    switchAudioButton = document.getElementById("switchAudio");
    switchVideoButton = document.getElementById("switchVideo");
    switchResolutionButton = document.getElementById("switchResolution");
    switchFpsButton        = document.getElementById("switchFps");
    shareScreenButton      = document.getElementById("shareScreen");

    switchAudioButton.innerText = audioOn ? MUTE_OUTBOUND_AUDIO : UNMUTE_OUTBOUND_AUDIO;
    switchAudioButton.onclick   = audioOn ? muteAudio : unmuteAudio;

    switchVideoButton.innerText = videoOn ? MUTE_OUTBOUND_VIDEO : UNMUTE_OUTBOUND_VIDEO;
    switchVideoButton.onclick   = videoOn ? stopVideo : startVideo;

    shareScreenButton.innerText = screenOn ? UNSHARE_SCREEN : SHARE_SCREEN;
    shareScreenButton.onclick = screenOn ? unshareScreen : shareScreen;

    switchResolutionButton.innerText = INCREASE_RESOLUTION;
    switchResolutionButton.onclick = increaseResolution;

    switchFpsButton.innerText = REDUCE_FPS;
    switchFpsButton.onclick = reduceFps;
}

function initializeSubroom(subroomId, outboundPublisher) {
    subroomToPublisher.set(subroomId, outboundPublisher);

    const speakButton = document.getElementById(`speak-${subroomId}`);
    if (speakButton) {
        speakButton.onclick = speakToSubroom(speakButton, outboundPublisher);
        speakButton.innerText = SPEAK_TO_SUBROOM;
    }
}

function deinitialize() {
    if (screenPublisher) {
        unshareScreen();
    }

    muteAudio();
    stopVideo();
}

async function shareScreen() {
    console.log("Sharing screen");

    if (screenPublisher) {
        media.unmuteScreen();
    } else {
        screenPublisher = await roomApi.createPublisher();
        console.log("Additional publisher created:", screenPublisher);

        const screen = await media.bindScreen({ audio: true });
        screenPublisher.peerConnection.addTrack(screen);

        await screenPublisher.joinRoomAndPublish(member.roomId,
                member.displayName + " (screen)",
                member.roomPin, false, true, false)
            .then(() => {
                console.log("Screen shared");
            });
    }

    shareScreenButton.innerText = UNSHARE_SCREEN;
    shareScreenButton.onclick = unshareScreen;
}
function unshareScreen() {
    media.muteScreen();

    screenPublisher.destroy();
    screenPublisher = undefined;

    shareScreenButton.innerText = SHARE_SCREEN;
    shareScreenButton.onclick = shareScreen;
}

function muteAudio() {
    display.updateOutbound(media.muteDevices("audio"));
    publisher.stopAudio();

    switchAudioButton.innerText = UNMUTE_OUTBOUND_AUDIO;
    switchAudioButton.onclick = unmuteAudio;
}
function stopVideo() {
    display.updateOutbound(media.muteDevices("video"));
    publisher.stopVideo();

    switchVideoButton.innerText = UNMUTE_OUTBOUND_VIDEO;
    switchVideoButton.onclick = startVideo;
}

async function unmuteAudio() {
    if (audioRestricted) {
        return;
    }

    const stream = await media.bindDevices(true, false);
    if (stream) {
        await display.updateOutbound(stream, publisher.memberId, publisher.displayName, true);
    }

    const outboundAudio = media.outboundTracks("audio");
    outboundAudio.forEach((track) => {
        track.enabled = true;
    });
    publisher.startAudio();

    switchAudioButton.innerText = MUTE_OUTBOUND_AUDIO;
    switchAudioButton.onclick = muteAudio;
}
async function startVideo() {
    if (videoRestricted) {
        return;
    }

    const stream = await media.bindDevices(false, true);
    if (stream) {
        await display.updateOutbound(stream);
    }

    const outboundVideo = media.outboundTracks("video");
    outboundVideo.forEach((track) => {
        track.enabled = true;
    });
    publisher.startVideo();

    switchVideoButton.innerText = MUTE_OUTBOUND_VIDEO;
    switchVideoButton.onclick = stopVideo;
}

function speakToSubroom(button, publisher) {
    return () => {
        console.log("Publishing host stream into a subroom");
        publisher.startAudio();
        publisher.startVideo();

        button.innerText = UNSPEAK_TO_SUBROOM;
        button.onclick = unspeakToSubroom(button, publisher);
    };
}
function unspeakToSubroom(button, publisher) {
    return () => {
        console.log("Unpublishing host stream into a subroom");
        publisher.stopAudio();
        publisher.stopVideo();

        button.innerText = SPEAK_TO_SUBROOM;
        button.onclick = speakToSubroom(button, publisher);
    };
}

async function restrictAudio() {
    audioRestricted = true;
    muteAudio();
}
async function restrictVideo() {
    videoRestricted = true;
    stopVideo();
}
async function unrestrictAudio() {
    audioRestricted = false;
    unmuteAudio();
}
async function unrestrictVideo() {
    videoRestricted = false;
    startVideo();
}

function reduceResolution() {
    videoConstraints.width = media.lowResWidth;
    videoConstraints.height = media.lowResHeight;

    media.outboundTracks("video")
        .forEach((track) => {
            track.applyConstraints(videoConstraints);
            console.log("Outbound video resolution reduced", track.getSettings());
        });

    switchResolutionButton.innerText = INCREASE_RESOLUTION;
    switchResolutionButton.onclick = increaseResolution;
}
function increaseResolution() {
    videoConstraints.width = media.highResWidth;
    videoConstraints.height = media.highResHeight;

    media.outboundTracks("video")
        .forEach((track) => {
            track.applyConstraints(videoConstraints);
            console.log("Outbound video resolution increased", track.getSettings());
        });

    switchResolutionButton.innerText = REDUCE_RESOLUTION;
    switchResolutionButton.onclick = reduceResolution;
}
function reduceFps() {
    videoConstraints.frameRate = media.lowFPS;

    media.outboundTracks("video")
        .forEach((track) => {
            track.applyConstraints(videoConstraints);
            console.log("Outbound video FPS reduced", track.getSettings());
        });

    switchFpsButton.innerText = INCREASE_FPS;
    switchFpsButton.onclick = increaseFps;
}
function increaseFps() {
    videoConstraints.frameRate = media.highFPS;

    media.outboundTracks("video")
        .forEach((track) => {
            track.applyConstraints(videoConstraints);
            console.log("Outbound video FPS increased", track.getSettings());
        });

    switchFpsButton.innerText = REDUCE_FPS;
    switchFpsButton.onclick = reduceFps;
}

const MUTE_OUTBOUND_AUDIO = "Mute";
const UNMUTE_OUTBOUND_AUDIO = "Unmute";
const MUTE_OUTBOUND_VIDEO = "Unshare video";
const UNMUTE_OUTBOUND_VIDEO = "Share video";
const SHARE_SCREEN = "Share screen";
const UNSHARE_SCREEN = "Unshare screen";

const SPEAK_TO_SUBROOM = "Speak to the room";
const UNSPEAK_TO_SUBROOM = "Stop speaking";

const INCREASE_RESOLUTION = "HD";
const REDUCE_RESOLUTION = "LQ";
const INCREASE_FPS = "FPS+";
const REDUCE_FPS = "FPS-";

},{"./display":38,"./media":43,"./room":45}],45:[function(require,module,exports){
const adapter = require('webrtc-adapter');

const metrics = require('../service/metrics');
const moderator = require('../service/moderator');
const executor = require('../service/executor');
const outbound = require('./outbound');
const inbound = require('./inbound');
const chat = require('./chat');
const host = require('./host/host');
const display = require('./display');
const media = require('./media');
const subroom = require('./subroom');

module.exports = {
    initialize,
    join,
};

let janusApi = undefined;
let roomApi = undefined;

let publisher = undefined;

let subscriptions = new Map();
// Map[MemberId, Subscriber]

let subroomSubscriptions = new Map();
// Map[RoomId, Map[MemberId, Subscriber]]

let member = {};

let viewJoinForm;
let viewInCallContainer;
let viewJoinAudioInput;
let viewJoinVideoInput;
let viewJoinTextInput;
let viewJoinScreenInput;

let metricsEnabled;
let moderationEnabled;

function initialize(_janusApi, _roomApi) {
    console.assert(!roomApi, "RoomAPI is already initialized");
    roomApi = _roomApi;
    janusApi = _janusApi;

    viewJoinForm = document.getElementById("joinForm");
    viewInCallContainer = document.getElementById("in-call");
    viewJoinAudioInput = document.getElementById("joinAudio");
    viewJoinVideoInput = document.getElementById("joinVideo");
    viewJoinTextInput = document.getElementById("joinText");
    viewJoinScreenInput = document.getElementById("joinScreen");

    executor.initialize(change, monitor, unmonitor);
    subroom.initialize();
}

async function join(roomId, roomPin, roomSecret, displayName,
                    metricsOn = false, moderationOn = false) {
    if (!roomApi) {
        window.alert("RoomAPI hasn't been attached, wait until the plugin connects");
        return;
    }

    console.assert(roomId);
    console.assert(displayName && displayName !== "");
    console.log(`Joining the room ${roomId} with pin ${roomPin}`);

    metricsEnabled = metricsOn;
    moderationEnabled = moderationOn;

    member.roomId = roomId;
    member.roomPin = roomPin;
    member.displayName = displayName;

    publisher = await roomApi.createPublisher();
    console.log("Publisher created:", publisher);
    display.initialize(publisher);

    publisher.on("remoteMemberJoined", async (joined) => {
        console.log("New remote member joined:", joined);
        //waiting for joined member to start publishing
    });
    publisher.on("remoteMemberLeaving", async (leaving) => {
        console.log("Remote member is leaving:", leaving);
        display.removeInbound(leaving);
        subscriptions.delete(leaving);
    });
    publisher.on("publishersUpdated", subscribe);

    const audioOn = viewJoinAudioInput.checked;
    const videoOn = viewJoinVideoInput.checked;
    const screenOn = viewJoinScreenInput.checked;

    chat.initialize(publisher);
    inbound.initialize(subscriptions, subroomSubscriptions);
    outbound.initialize(roomApi, publisher, audioOn, videoOn, screenOn, member);
    media.initialize(publisher.peerConnection);

    if (metricsEnabled) {
        metrics.schedule(publisher, subscriptions);
    }

    await publisher.joinRoomAndPublish(roomId, displayName, roomPin)
        .then(async (remotePublishers) => {
            console.log("Joined the room:", roomId);
            console.log("Local member ID:", publisher.memberId);
            if (moderationEnabled) {
                const memberId = publisher.memberId; //saving the id outside of lambda

                let introduction = () => {
                    console.log("Notifying moderation service about us", roomId, memberId);
                    moderator.sendRequest({
                        "roomId": roomId,
                        "operation": {
                            "registerParticipant": {
                                "member_id": memberId
                            }
                        }
                    });

                    if (roomSecret !== null && roomSecret !== "") {
                        console.log("Registering ourselves as a moderator");
                        moderator.sendRequest({
                            "roomId": roomId,
                            "operation": {
                                "setModerator": {
                                    "member_id": memberId,
                                    "secret": roomSecret,
                                    "pin": roomPin
                                }
                            }
                        });
                    }
                };

                let was_not_connected = await moderator.connect(
                    () => {
                        console.log("Connection to moderation service established");
                        introduction();
                    },
                    () => {
                        console.log("With the great power comes the great responsibility!");
                        host.initialize(moderator, janusApi, roomId, roomSecret, monitor);
                    });
                if (!was_not_connected) {
                    introduction();
                }
            }

            viewJoinForm.style.display = "none";
            viewInCallContainer.style.display = "block";

            console.log("Remote publishers:", remotePublishers);
            subscribe(remotePublishers);

            await display.updateOutbound(await media.bindDevices(audioOn, videoOn));
        })
        .catch((e) => {
            console.error(e);
            window.alert("Couldn't connect. Is PIN correct?");
            publisher.peerConnection.close();
            publisher.destroy();
        });

    function subscribe(_publishers) {
        const publishers = filterPublishers(_publishers, false);
        console.log("Subscribing to", publishers);
        publishers.forEach((remotePublisher) => {
            if (!display.memberDisplayed(remotePublisher.id)) {
                console.log("Subscribing to", remotePublisher.id);
                roomApi.createSubscriber()
                    .then((subscriber) => {
                        subscriptions.set(remotePublisher.id, subscriber);
                        subscriber.peerConnection.onaddstream = (event) => {
                            display.updateInbound(event.stream, remotePublisher.id, remotePublisher.display);
                        };
                        subscriber.on('dataMessage',(message) => {
                            console.log("Message received", message);
                            chat.appendMessage(message);
                        });
                        return subscriber.joinRoomAndSubscribe(roomId, remotePublisher.id, roomPin);
                    });
            } else {
                console.warn("Already subscribed", remotePublisher);
            }
        });
    }
}

//todo: refactor `join` method to call `monitor`, so there will be no copy-paste
async function monitor(roomId, roomPin, container, host = false) {
    if (!roomApi) {
        window.alert("RoomAPI hasn't been attached, wait until the plugin connects");
        return;
    }

    console.assert(roomId);

    if (subroomSubscriptions.get(roomId)) {
        console.log("Already monitoring", roomId);
        return;
    }

    let subscriptions = new Map();
    subroomSubscriptions.set(roomId, subscriptions);

    console.log("Starting monitoring the room", roomId);

    publisher = await roomApi.createPublisher();
    console.log("Publisher for a sub-room monitor created:", publisher);

    publisher.on("remoteMemberJoined", async (joined) => {
        console.log("New remote member joined to the sub-room:", joined);
        //waiting for joined member to start publishing
    });
    publisher.on("remoteMemberLeaving", async (leaving) => {
        console.log("Remote member is leaving the sub-room:", leaving);
        display.removeInbound(leaving);
        subscriptions.delete(leaving);
    });
    publisher.on("publishersUpdated", subscribe);

    outbound.initializeSubroom(roomId, publisher);
    media.initialize(publisher.peerConnection);

    if (metricsEnabled) {
        metrics.schedule(publisher, subscriptions);
    }

    let suffix = host ? HOST_SUFFIX : WATCHER_SUFFIX;
    await publisher.joinRoomAndPublish(roomId, `${member.displayName} ${suffix}`, roomPin)
        .then(async (remotePublishers) => {
            console.log("Joined the sub-room for monitoring:", roomId);
            console.log("Remote publishers in the sub-room:", remotePublishers);
            subscribe(remotePublishers);
            publisher.stopAudio();
            publisher.stopVideo();
        })
        .catch((e) => {
            console.error(e);
            publisher.peerConnection.close();
            publisher.destroy();
        });

    function subscribe(_publishers) {
        const publishers = filterPublishers(_publishers, true);
        console.log("Subscribing to", publishers);
        publishers.forEach((remotePublisher) => {
            if (!display.memberDisplayed(remotePublisher.id)) {
                console.log("Subscribing to", remotePublisher.id);
                roomApi.createSubscriber()
                    .then((subscriber) => {
                        subscriptions.set(remotePublisher.id, subscriber);
                        subscriber.peerConnection.onaddstream = (event) => {
                            console.log("Monitoring a stream from subroom", roomId);
                            display.updateInbound(event.stream, remotePublisher.id, remotePublisher.display, container);
                        };

                        return subscriber.joinRoomAndSubscribe(roomId, remotePublisher.id, roomPin);
                    });
            } else {
                console.warn("Already subscribed", remotePublisher);
            }
        });
    }
}

function unmonitor(roomId) {
    const subscriptions = subroomSubscriptions.get(roomId);
    if (!subscriptions) {
        console.error("We are not monitoring the room", roomId);
        return;
    }

    subscriptions.forEach((subscriber) => {
        console.log("Unsubscribing from ", subscriber.displayName);
        subscriber.destroy();
    });

    subroomSubscriptions.delete(roomId);
}

async function change(roomId, roomPin) {
    const promises = Array.from(subscriptions.values())
        .map((subscriber) => subscriber.leaveRoom());
    promises.push(publisher.leaveRoom());
    await Promise.allSettled(promises);
    console.log("Left the room", member.roomId);

    let roomSecret = null; //we don't change room automatically for moderators (yet)
    await join(roomId, roomPin, roomSecret, member.displayName, metricsEnabled, moderationEnabled);
}

function filterPublishers(publishers, weAreMonitoring) {
    return publishers.filter((publisher) => {
        const name = publisher.display;
        if (name.includes(WATCHER_SUFFIX)
           || (weAreMonitoring && name.includes(HOST_SUFFIX))) {
            console.log("Filtering out publisher", publisher);
            return false;
        }
        return true;
    });
}

const HOST_SUFFIX = "(host)";
const WATCHER_SUFFIX = "(watching)";
},{"../service/executor":47,"../service/metrics":48,"../service/moderator":49,"./chat":37,"./display":38,"./host/host":40,"./inbound":42,"./media":43,"./outbound":44,"./subroom":46,"webrtc-adapter":19}],46:[function(require,module,exports){
module.exports = {
    initialize,
    createMonitor,
    removeMonitor
};

let viewSubroomMonitors;
const monitorBySubroom = new Map();

function initialize() {
    viewSubroomMonitors = document.getElementById("subroomMonitors");
}

function createMonitor(subroomId, subroomPin, hostCallbacks = null) {
    if (monitorBySubroom.get(subroomId)) {
        console.log("Monitor for the room is already created", subroomId);
        return;
    }

    const container = document.createElement("div");
    container.style.border = "thick solid #0000FF";

    const label = document.createElement("p");
    label.innerText = `Subroom ${subroomId}`;
    container.appendChild(label);

    if (hostCallbacks) {
        const [mergeRoomFn, presentRoomFn] = hostCallbacks;
        console.log("Appending host controls to the subroom monitor", mergeRoomFn);
        const mergeButton = document.createElement("button");
        mergeButton.innerText = "Merge them back";
        mergeButton.onclick = mergeRoomFn;

        const speakButton = document.createElement("button");
        speakButton.id = `speak-${subroomId}`;

        const presentButton = document.createElement("button");
        presentButton.innerText = "Present to the class";
        presentButton.onclick = presentRoomFn;

        container.appendChild(mergeButton);
        container.appendChild(presentButton);
        container.appendChild(speakButton);
    }

    const monitor = document.createElement("div");
    monitorBySubroom.set(subroomId, container);
    monitor.className = "grid-container";

    container.appendChild(monitor);
    viewSubroomMonitors.appendChild(container);

    console.log("Monitor created", subroomId);
    return monitor;
}

function removeMonitor(subroomId) {
    const monitor = monitorBySubroom.get(subroomId);
    console.assert(monitor, `Monitor for room ${subroomId} doesn't exist`);
    monitorBySubroom.delete(subroomId);
    monitor.remove();

    console.log("Monitor removed", subroomId);
}
},{}],47:[function(require,module,exports){
const subroom = require('../room/subroom');
const outbound = require('../room/outbound');
const display = require('../room/display');
const media = require('../room/media');

module.exports = {
    initialize,
    execute
};

let changeRoomFn = undefined;
let monitorFn = undefined;
let unmonitorFn = undefined;

function initialize(_changeRoomFn, _monitorFn, _unmonitorFn) {
    console.assert(!changeRoomFn, "Already initialized");
    console.assert(!monitorFn, "Already initialized");
    changeRoomFn = _changeRoomFn;
    monitorFn = _monitorFn;
    unmonitorFn = _unmonitorFn;
}

async function execute(command) {
    if (command === "RestrictAudio") {
        outbound.restrictAudio();
    }
    if (command === "RestrictVideo") {
        outbound.restrictVideo();
    }
    if (command === "UnrestrictAudio") {
        outbound.unrestrictAudio();
    }
    if (command === "UnrestrictVideo") {
        outbound.unrestrictVideo();
    }

    if (command["ChangeRoom"]) {
        let [targetId, targetPin] = command["ChangeRoom"];
        console.log("Changing room to", targetId);

        display.clearInbound();
        outbound.deinitialize();
        media.deinitialize();
        await changeRoomFn(targetId, targetPin);
    }

    if (command["WatchRoom"]) {
        let [subroomId, subroomPin] = command["WatchRoom"];
        console.log("Watching room", subroomId);

        const display = subroom.createMonitor(subroomId, subroomPin);
        monitorFn(subroomId, subroomPin, display);
    }
    if (command["UnwatchRoom"]) {
        let subroomId = command["UnwatchRoom"];
        console.log("Unwatching room", subroomId);

        subroom.removeMonitor(subroomId);
        unmonitorFn(subroomId);
    }
}

},{"../room/display":38,"../room/media":43,"../room/outbound":44,"../room/subroom":46}],48:[function(require,module,exports){
module.exports = {
    schedule,
};

const config = require('../config');
const websocket = require('./websocket');

const adapter = require('webrtc-adapter');

let gatherer = undefined;

function connect() {
    if (!gatherer) {
        gatherer = websocket.connect(
            config.gatherer.url,
            "metrics gatherer",
            () => {},
            () => {},
            () => { gatherer = undefined; },
        );
    }
}

function schedule(publisher, subscriptions) {
    connect();
    window.setInterval(() => connect(),
        config.gatherer.connectionInterval * 1000);

    window.setInterval(async () => {
        if (!gatherer) {
            return;
        }

        let metrics = {
            "roomId": publisher.roomId,
            "memberId": publisher.memberId,
            "outbound": await gatherOutbound(publisher),
            "inbound": await gatherInbound(subscriptions)
        };

        gatherer.send(JSON.stringify(metrics));
    }, config.gatherer.reportingInterval * 100);
}

function gatherOutbound(publisher) {
    return publisher.peerConnection.getStats().then((report) => {
        const metrics = { audio: {}, video: {} };

        report.forEach((entry) => {
            if (entry.type === "outbound-rtp") {
                metrics[entry.kind].bytesSent = entry.bytesSent;
                metrics[entry.kind].headerBytesSent = entry.headerBytesSent;
                metrics[entry.kind].retransmittedBytesSent = entry.retransmittedBytesSent;
                metrics[entry.kind].timestamp = entry.timestamp;
            }
            if (entry.type === "remote-inbound-rtp") {
                //looks like only Chrome provides these metrics type
                metrics[entry.kind].roundTripTime = entry.roundTripTime;

                metrics[entry.kind].jitter = entry.jitter;
                metrics[entry.kind].packetsLost = entry.packetsLost;
                metrics[entry.kind].packetsReceived = entry.packetsReceived;
                metrics[entry.kind].bytesReceived = entry.bytesReceived;
            }
            if (entry.kind === "video" && entry.type === "media-source") {
                metrics[entry.kind].framesPerSecond = entry.framesPerSecond;
                metrics[entry.kind].frameResolution = { "height": entry.height, "width": entry.width };
            }
        });
        return metrics;
    });
}

function gatherInbound(subscriptions) {
    return Promise.allSettled(Array.from(subscriptions, async ([memberId, subscriber]) => {
        return subscriber.peerConnection.getStats().then((report) => {
            const metrics = { audio: {}, video: {} };

            report.forEach((entry) => {
                if (entry.type === "remote-outbound-rtp") {
                    //looks like only Chrome provides these metrics type
                    metrics[entry.kind].bytesSent = entry.bytesSent;
                    metrics[entry.kind].packetsSent = entry.packetsSent;
                }
                if (entry.type === "inbound-rtp") {
                    //for video streams, it is possible to grab "framerateMean"
                    //but adequate representation of this data would require more effort,
                    //including grouping by publisher and averaging on the server side
                    //in order to see how much FPS we lose per every publisher

                    metrics[entry.kind].timestamp = entry.timestamp;
                    metrics[entry.kind].jitter = entry.jitter;
                    metrics[entry.kind].bytesReceived = entry.bytesReceived;
                    metrics[entry.kind].headerBytesReceived = entry.headerBytesReceived;
                    metrics[entry.kind].packetsReceived = entry.packetsReceived;
                    metrics[entry.kind].packetsLost = entry.packetsLost;
                    //these metrics are possible to aggregate by publisher as well,
                    //but in contrast to "framerateMean" they are also useful
                    //if we aggregate them by subscriber; in this case,
                    //they are display fitness of network conditions
                    //to the current load
                }
            });
            return metrics;
        });
    })).then((results) => {
        const zeros = {
            "count": 0,
            "timestamp": 0,
            "jitter": 0,
            "bytesSent": 0,
            "bytesReceived": 0,
            "packetsReceived": 0,
            "packetsLost": 0,
        };
        const total = {
            "audio": Object.assign({}, zeros),
            "video": zeros
        };

        results
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value)
            .forEach((result) => {
                for (let kind of ["audio", "video"]) {
                    total[kind].count += 1;
                    total[kind].timestamp += result[kind].timestamp;
                    total[kind].jitter += result[kind].jitter;
                    total[kind].bytesSent += result[kind].bytesSent;
                    total[kind].bytesReceived += result[kind].bytesReceived;
                    total[kind].packetsReceived += result[kind].packetsReceived;
                    total[kind].packetsLost += result[kind].packetsLost;
                }
            });

        const metrics = { audio: {}, video: {} };

        for (let kind of ["audio", "video"]) {
            metrics[kind].timestamp = total[kind].timestamp / total[kind].count;
            metrics[kind].jitter = total[kind].jitter / total[kind].count;
            metrics[kind].bytesSent = total[kind].bytesSent;
            metrics[kind].bytesReceived = total[kind].bytesReceived;
            metrics[kind].packetsReceived = total[kind].packetsReceived;
            metrics[kind].packetsLost = total[kind].packetsLost;
        }

        return metrics;
    });
}

},{"../config":34,"./websocket":50,"webrtc-adapter":19}],49:[function(require,module,exports){
const config = require('../config');
const websocket = require('./websocket');
const executor = require('./executor');

module.exports = {
    connect,
    sendRequest,

    oneshot,
};

let instance = undefined;

function connect(onOpen, whenModerationAllowed) {
    return new Promise((resolve, _) => {
        if (instance) {
            resolve(false);
        } else {
            let timerId = null;

            let establishing = () => {
                if (!instance) {
                    instance = websocket.connect(
                        config.moderator.url,
                        "moderator service",
                        () => {
                            onOpen();
                            resolve(true);
                        },
                        async (message) => {
                            if (message.error) {
                                console.error(message.error);
                                return;
                            }
                            if (message.command) {
                                console.log("Command received", message.command);

                                if (message.command === "AllowModeration") {
                                    whenModerationAllowed();
                                }
                                if (message.command["ChangeRoom"]) {
                                    console.log("Closing existing moderator connection due to the change of room");
                                    //allowing to update this lambda with new data
                                    console.assert(timerId);
                                    window.clearInterval(timerId);
                                    instance.close();
                                    instance = undefined;
                                }

                                await executor.execute(message.command);
                            } else {
                                console.warn("Unexpected response");
                            }
                        },
                        () => {
                            instance = undefined;
                        }
                    );
                }
            };

            establishing();
            timerId = window.setInterval(() => establishing(),
                config.moderator.connectionInterval * 1000);
        }
    });
}

function oneshot(action) {
    console.assert(!instance);

    websocket.connect(
        config.moderator.url,
        "moderator service",
        (socket) => {
            console.log("Made a one-shot connection to moderating service");
            action(socket);
            window.setTimeout(socket.close.bind(socket), 3000);
        },
        () => {},
        () => {}
    );
}

function sendRequest(request) {
    console.assert(instance, "Moderator service is not connected");
    instance.send(JSON.stringify(request));
}

},{"../config":34,"./executor":47,"./websocket":50}],50:[function(require,module,exports){
module.exports = {
    connect,
};

const WebSocket = require('isomorphic-ws');

function connect(url, label, onopen, onmessage, onclose) {
    let socket;

    try {
        socket = new WebSocket(url);

        socket.onerror = (e) => {
            console.warn(e);
            onclose();
        };
        socket.onopen = () => {
            console.log(`Connected to ${label}`);
            onopen(socket);
        };
        socket.onmessage = (message) => {
            console.log("Message received", message.data);
            onmessage(JSON.parse(message.data));
        };
        socket.onclose = () => {
            console.log(`Disconnected from ${label}`);
            onclose();
        }
    } catch (e) {
        console.error(e);
        socket = undefined;
    }

    return socket;
}

},{"isomorphic-ws":2}]},{},[35])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9pc29tb3JwaGljLXdzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvamFudXMtdmlkZW9yb29tLWFwaS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9qYW51cy12aWRlb3Jvb20tYXBpL3NyYy9Db25maWcuanMiLCJub2RlX21vZHVsZXMvamFudXMtdmlkZW9yb29tLWFwaS9zcmMvSmFudXMuanMiLCJub2RlX21vZHVsZXMvamFudXMtdmlkZW9yb29tLWFwaS9zcmMvSmFudXNBZG1pbi5qcyIsIm5vZGVfbW9kdWxlcy9qYW51cy12aWRlb3Jvb20tYXBpL3NyYy9KYW51c1BsdWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9qYW51cy12aWRlb3Jvb20tYXBpL3NyYy9TZHBIZWxwZXIuanMiLCJub2RlX21vZHVsZXMvamFudXMtdmlkZW9yb29tLWFwaS9zcmMvcGx1Z2luL0xlYXZlQ2FwYWJpbGl0eS5qcyIsIm5vZGVfbW9kdWxlcy9qYW51cy12aWRlb3Jvb20tYXBpL3NyYy9wbHVnaW4vVmlkZW9Sb29tLmpzIiwibm9kZV9tb2R1bGVzL2phbnVzLXZpZGVvcm9vbS1hcGkvc3JjL3BsdWdpbi9WaWRlb1Jvb21BZG1pbi5qcyIsIm5vZGVfbW9kdWxlcy9qYW51cy12aWRlb3Jvb20tYXBpL3NyYy9wbHVnaW4vVmlkZW9Sb29tUHVibGlzaGVyLmpzIiwibm9kZV9tb2R1bGVzL2phbnVzLXZpZGVvcm9vbS1hcGkvc3JjL3BsdWdpbi9WaWRlb1Jvb21TdWJzY3JpYmVyLmpzIiwibm9kZV9tb2R1bGVzL3J0Y3BlZXJjb25uZWN0aW9uLXNoaW0vcnRjcGVlcmNvbm5lY3Rpb24uanMiLCJub2RlX21vZHVsZXMvc2RwL3NkcC5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL2xpYi9ieXRlc1RvVXVpZC5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL2xpYi9ybmctYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL3Y0LmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvYWRhcHRlcl9jb3JlLmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvYWRhcHRlcl9mYWN0b3J5LmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvY2hyb21lL2Nocm9tZV9zaGltLmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvY2hyb21lL2dldGRpc3BsYXltZWRpYS5qcyIsIm5vZGVfbW9kdWxlcy93ZWJydGMtYWRhcHRlci9kaXN0L2Nocm9tZS9nZXR1c2VybWVkaWEuanMiLCJub2RlX21vZHVsZXMvd2VicnRjLWFkYXB0ZXIvZGlzdC9jb21tb25fc2hpbS5qcyIsIm5vZGVfbW9kdWxlcy93ZWJydGMtYWRhcHRlci9kaXN0L2VkZ2UvZWRnZV9zaGltLmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvZWRnZS9maWx0ZXJpY2VzZXJ2ZXJzLmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvZWRnZS9nZXRkaXNwbGF5bWVkaWEuanMiLCJub2RlX21vZHVsZXMvd2VicnRjLWFkYXB0ZXIvZGlzdC9lZGdlL2dldHVzZXJtZWRpYS5qcyIsIm5vZGVfbW9kdWxlcy93ZWJydGMtYWRhcHRlci9kaXN0L2ZpcmVmb3gvZmlyZWZveF9zaGltLmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvZmlyZWZveC9nZXRkaXNwbGF5bWVkaWEuanMiLCJub2RlX21vZHVsZXMvd2VicnRjLWFkYXB0ZXIvZGlzdC9maXJlZm94L2dldHVzZXJtZWRpYS5qcyIsIm5vZGVfbW9kdWxlcy93ZWJydGMtYWRhcHRlci9kaXN0L3NhZmFyaS9zYWZhcmlfc2hpbS5qcyIsIm5vZGVfbW9kdWxlcy93ZWJydGMtYWRhcHRlci9kaXN0L3V0aWxzLmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9lbnRyeS9hZG1pbi5qcyIsInNyYy9saW5rcy5qcyIsInNyYy9yb29tL2NoYXQuanMiLCJzcmMvcm9vbS9kaXNwbGF5LmpzIiwic3JjL3Jvb20vaG9zdC9icmVha291dC5qcyIsInNyYy9yb29tL2hvc3QvaG9zdC5qcyIsInNyYy9yb29tL2hvc3QvcmVzdHJpY3Rpb25zLmpzIiwic3JjL3Jvb20vaW5ib3VuZC5qcyIsInNyYy9yb29tL21lZGlhLmpzIiwic3JjL3Jvb20vb3V0Ym91bmQuanMiLCJzcmMvcm9vbS9yb29tLmpzIiwic3JjL3Jvb20vc3Vicm9vbS5qcyIsInNyYy9zZXJ2aWNlL2V4ZWN1dG9yLmpzIiwic3JjL3NlcnZpY2UvbWV0cmljcy5qcyIsInNyYy9zZXJ2aWNlL21vZGVyYXRvci5qcyIsInNyYy9zZXJ2aWNlL3dlYnNvY2tldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzNnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2owREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDenpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2x3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25UQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIG9iamVjdENyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgb2JqZWN0Q3JlYXRlUG9seWZpbGxcbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgb2JqZWN0S2V5c1BvbHlmaWxsXG52YXIgYmluZCA9IEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kIHx8IGZ1bmN0aW9uQmluZFBvbHlmaWxsXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCAnX2V2ZW50cycpKSB7XG4gICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgfVxuXG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbnZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbnZhciBoYXNEZWZpbmVQcm9wZXJ0eTtcbnRyeSB7XG4gIHZhciBvID0ge307XG4gIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCAneCcsIHsgdmFsdWU6IDAgfSk7XG4gIGhhc0RlZmluZVByb3BlcnR5ID0gby54ID09PSAwO1xufSBjYXRjaCAoZXJyKSB7IGhhc0RlZmluZVByb3BlcnR5ID0gZmFsc2UgfVxuaWYgKGhhc0RlZmluZVByb3BlcnR5KSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShFdmVudEVtaXR0ZXIsICdkZWZhdWx0TWF4TGlzdGVuZXJzJywge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihhcmcpIHtcbiAgICAgIC8vIGNoZWNrIHdoZXRoZXIgdGhlIGlucHV0IGlzIGEgcG9zaXRpdmUgbnVtYmVyICh3aG9zZSB2YWx1ZSBpcyB6ZXJvIG9yXG4gICAgICAvLyBncmVhdGVyIGFuZCBub3QgYSBOYU4pLlxuICAgICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInIHx8IGFyZyA8IDAgfHwgYXJnICE9PSBhcmcpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiZGVmYXVsdE1heExpc3RlbmVyc1wiIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgICAgIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSBhcmc7XG4gICAgfVxuICB9KTtcbn0gZWxzZSB7XG4gIEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gZGVmYXVsdE1heExpc3RlbmVycztcbn1cblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKG4pIHtcbiAgaWYgKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcIm5cIiBhcmd1bWVudCBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuZnVuY3Rpb24gJGdldE1heExpc3RlbmVycyh0aGF0KSB7XG4gIGlmICh0aGF0Ll9tYXhMaXN0ZW5lcnMgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gIHJldHVybiB0aGF0Ll9tYXhMaXN0ZW5lcnM7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZ2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gZ2V0TWF4TGlzdGVuZXJzKCkge1xuICByZXR1cm4gJGdldE1heExpc3RlbmVycyh0aGlzKTtcbn07XG5cbi8vIFRoZXNlIHN0YW5kYWxvbmUgZW1pdCogZnVuY3Rpb25zIGFyZSB1c2VkIHRvIG9wdGltaXplIGNhbGxpbmcgb2YgZXZlbnRcbi8vIGhhbmRsZXJzIGZvciBmYXN0IGNhc2VzIGJlY2F1c2UgZW1pdCgpIGl0c2VsZiBvZnRlbiBoYXMgYSB2YXJpYWJsZSBudW1iZXIgb2Zcbi8vIGFyZ3VtZW50cyBhbmQgY2FuIGJlIGRlb3B0aW1pemVkIGJlY2F1c2Ugb2YgdGhhdC4gVGhlc2UgZnVuY3Rpb25zIGFsd2F5cyBoYXZlXG4vLyB0aGUgc2FtZSBudW1iZXIgb2YgYXJndW1lbnRzIGFuZCB0aHVzIGRvIG5vdCBnZXQgZGVvcHRpbWl6ZWQsIHNvIHRoZSBjb2RlXG4vLyBpbnNpZGUgdGhlbSBjYW4gZXhlY3V0ZSBmYXN0ZXIuXG5mdW5jdGlvbiBlbWl0Tm9uZShoYW5kbGVyLCBpc0ZuLCBzZWxmKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuY2FsbChzZWxmKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKHNlbGYpO1xuICB9XG59XG5mdW5jdGlvbiBlbWl0T25lKGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZzEpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5jYWxsKHNlbGYsIGFyZzEpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmNhbGwoc2VsZiwgYXJnMSk7XG4gIH1cbn1cbmZ1bmN0aW9uIGVtaXRUd28oaGFuZGxlciwgaXNGbiwgc2VsZiwgYXJnMSwgYXJnMikge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmNhbGwoc2VsZiwgYXJnMSwgYXJnMik7XG4gIGVsc2Uge1xuICAgIHZhciBsZW4gPSBoYW5kbGVyLmxlbmd0aDtcbiAgICB2YXIgbGlzdGVuZXJzID0gYXJyYXlDbG9uZShoYW5kbGVyLCBsZW4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICBsaXN0ZW5lcnNbaV0uY2FsbChzZWxmLCBhcmcxLCBhcmcyKTtcbiAgfVxufVxuZnVuY3Rpb24gZW1pdFRocmVlKGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZzEsIGFyZzIsIGFyZzMpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5jYWxsKHNlbGYsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmNhbGwoc2VsZiwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW1pdE1hbnkoaGFuZGxlciwgaXNGbiwgc2VsZiwgYXJncykge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICB9XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQodHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgZXZlbnRzO1xuICB2YXIgZG9FcnJvciA9ICh0eXBlID09PSAnZXJyb3InKTtcblxuICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gIGlmIChldmVudHMpXG4gICAgZG9FcnJvciA9IChkb0Vycm9yICYmIGV2ZW50cy5lcnJvciA9PSBudWxsKTtcbiAgZWxzZSBpZiAoIWRvRXJyb3IpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKGRvRXJyb3IpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpXG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEF0IGxlYXN0IGdpdmUgc29tZSBraW5kIG9mIGNvbnRleHQgdG8gdGhlIHVzZXJcbiAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1VuaGFuZGxlZCBcImVycm9yXCIgZXZlbnQuICgnICsgZXIgKyAnKScpO1xuICAgICAgZXJyLmNvbnRleHQgPSBlcjtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaGFuZGxlciA9IGV2ZW50c1t0eXBlXTtcblxuICBpZiAoIWhhbmRsZXIpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBpc0ZuID0gdHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbic7XG4gIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gIHN3aXRjaCAobGVuKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgY2FzZSAxOlxuICAgICAgZW1pdE5vbmUoaGFuZGxlciwgaXNGbiwgdGhpcyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDI6XG4gICAgICBlbWl0T25lKGhhbmRsZXIsIGlzRm4sIHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDM6XG4gICAgICBlbWl0VHdvKGhhbmRsZXIsIGlzRm4sIHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgNDpcbiAgICAgIGVtaXRUaHJlZShoYW5kbGVyLCBpc0ZuLCB0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSwgYXJndW1lbnRzWzNdKTtcbiAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgZGVmYXVsdDpcbiAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgZW1pdE1hbnkoaGFuZGxlciwgaXNGbiwgdGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmZ1bmN0aW9uIF9hZGRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGxpc3RlbmVyLCBwcmVwZW5kKSB7XG4gIHZhciBtO1xuICB2YXIgZXZlbnRzO1xuICB2YXIgZXhpc3Rpbmc7XG5cbiAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJylcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG4gIGlmICghZXZlbnRzKSB7XG4gICAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgdGFyZ2V0Ll9ldmVudHNDb3VudCA9IDA7XG4gIH0gZWxzZSB7XG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gICAgaWYgKGV2ZW50cy5uZXdMaXN0ZW5lcikge1xuICAgICAgdGFyZ2V0LmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA/IGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gICAgICAvLyBSZS1hc3NpZ24gYGV2ZW50c2AgYmVjYXVzZSBhIG5ld0xpc3RlbmVyIGhhbmRsZXIgY291bGQgaGF2ZSBjYXVzZWQgdGhlXG4gICAgICAvLyB0aGlzLl9ldmVudHMgdG8gYmUgYXNzaWduZWQgdG8gYSBuZXcgb2JqZWN0XG4gICAgICBldmVudHMgPSB0YXJnZXQuX2V2ZW50cztcbiAgICB9XG4gICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV07XG4gIH1cblxuICBpZiAoIWV4aXN0aW5nKSB7XG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgICArK3RhcmdldC5fZXZlbnRzQ291bnQ7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHR5cGVvZiBleGlzdGluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgICBleGlzdGluZyA9IGV2ZW50c1t0eXBlXSA9XG4gICAgICAgICAgcHJlcGVuZCA/IFtsaXN0ZW5lciwgZXhpc3RpbmddIDogW2V4aXN0aW5nLCBsaXN0ZW5lcl07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICAgIGlmIChwcmVwZW5kKSB7XG4gICAgICAgIGV4aXN0aW5nLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXhpc3RpbmcucHVzaChsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICBpZiAoIWV4aXN0aW5nLndhcm5lZCkge1xuICAgICAgbSA9ICRnZXRNYXhMaXN0ZW5lcnModGFyZ2V0KTtcbiAgICAgIGlmIChtICYmIG0gPiAwICYmIGV4aXN0aW5nLmxlbmd0aCA+IG0pIHtcbiAgICAgICAgZXhpc3Rpbmcud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgdmFyIHcgPSBuZXcgRXJyb3IoJ1Bvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgbGVhayBkZXRlY3RlZC4gJyArXG4gICAgICAgICAgICBleGlzdGluZy5sZW5ndGggKyAnIFwiJyArIFN0cmluZyh0eXBlKSArICdcIiBsaXN0ZW5lcnMgJyArXG4gICAgICAgICAgICAnYWRkZWQuIFVzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvICcgK1xuICAgICAgICAgICAgJ2luY3JlYXNlIGxpbWl0LicpO1xuICAgICAgICB3Lm5hbWUgPSAnTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nJztcbiAgICAgICAgdy5lbWl0dGVyID0gdGFyZ2V0O1xuICAgICAgICB3LnR5cGUgPSB0eXBlO1xuICAgICAgICB3LmNvdW50ID0gZXhpc3RpbmcubGVuZ3RoO1xuICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09ICdvYmplY3QnICYmIGNvbnNvbGUud2Fybikge1xuICAgICAgICAgIGNvbnNvbGUud2FybignJXM6ICVzJywgdy5uYW1lLCB3Lm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIGFkZExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHJldHVybiBfYWRkTGlzdGVuZXIodGhpcywgdHlwZSwgbGlzdGVuZXIsIGZhbHNlKTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcHJlcGVuZExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgICByZXR1cm4gX2FkZExpc3RlbmVyKHRoaXMsIHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICB9O1xuXG5mdW5jdGlvbiBvbmNlV3JhcHBlcigpIHtcbiAgaWYgKCF0aGlzLmZpcmVkKSB7XG4gICAgdGhpcy50YXJnZXQucmVtb3ZlTGlzdGVuZXIodGhpcy50eXBlLCB0aGlzLndyYXBGbik7XG4gICAgdGhpcy5maXJlZCA9IHRydWU7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQpO1xuICAgICAgY2FzZSAxOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LCBhcmd1bWVudHNbMF0pO1xuICAgICAgY2FzZSAyOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LCBhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSk7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQsIGFyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdLFxuICAgICAgICAgICAgYXJndW1lbnRzWzJdKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyArK2kpXG4gICAgICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgdGhpcy5saXN0ZW5lci5hcHBseSh0aGlzLnRhcmdldCwgYXJncyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIF9vbmNlV3JhcCh0YXJnZXQsIHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBzdGF0ZSA9IHsgZmlyZWQ6IGZhbHNlLCB3cmFwRm46IHVuZGVmaW5lZCwgdGFyZ2V0OiB0YXJnZXQsIHR5cGU6IHR5cGUsIGxpc3RlbmVyOiBsaXN0ZW5lciB9O1xuICB2YXIgd3JhcHBlZCA9IGJpbmQuY2FsbChvbmNlV3JhcHBlciwgc3RhdGUpO1xuICB3cmFwcGVkLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHN0YXRlLndyYXBGbiA9IHdyYXBwZWQ7XG4gIHJldHVybiB3cmFwcGVkO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiBvbmNlKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB0aGlzLm9uKHR5cGUsIF9vbmNlV3JhcCh0aGlzLCB0eXBlLCBsaXN0ZW5lcikpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE9uY2VMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcHJlcGVuZE9uY2VMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgdGhpcy5wcmVwZW5kTGlzdGVuZXIodHlwZSwgX29uY2VXcmFwKHRoaXMsIHR5cGUsIGxpc3RlbmVyKSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4vLyBFbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWYgYW5kIG9ubHkgaWYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICAgIHZhciBsaXN0LCBldmVudHMsIHBvc2l0aW9uLCBpLCBvcmlnaW5hbExpc3RlbmVyO1xuXG4gICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgICAgIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcbiAgICAgIGlmICghZXZlbnRzKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgbGlzdCA9IGV2ZW50c1t0eXBlXTtcbiAgICAgIGlmICghbGlzdClcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fCBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikge1xuICAgICAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMClcbiAgICAgICAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBldmVudHNbdHlwZV07XG4gICAgICAgICAgaWYgKGV2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0Lmxpc3RlbmVyIHx8IGxpc3RlbmVyKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbGlzdCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBwb3NpdGlvbiA9IC0xO1xuXG4gICAgICAgIGZvciAoaSA9IGxpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHwgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsTGlzdGVuZXIgPSBsaXN0W2ldLmxpc3RlbmVyO1xuICAgICAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgICBpZiAocG9zaXRpb24gPT09IDApXG4gICAgICAgICAgbGlzdC5zaGlmdCgpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgc3BsaWNlT25lKGxpc3QsIHBvc2l0aW9uKTtcblxuICAgICAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpXG4gICAgICAgICAgZXZlbnRzW3R5cGVdID0gbGlzdFswXTtcblxuICAgICAgICBpZiAoZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBvcmlnaW5hbExpc3RlbmVyIHx8IGxpc3RlbmVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxuICAgIGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycyh0eXBlKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzLCBldmVudHMsIGk7XG5cbiAgICAgIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcbiAgICAgIGlmICghZXZlbnRzKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICAgICAgaWYgKCFldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzQ291bnQgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKGV2ZW50c1t0eXBlXSkge1xuICAgICAgICAgIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKVxuICAgICAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGRlbGV0ZSBldmVudHNbdHlwZV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIGtleXMgPSBvYmplY3RLZXlzKGV2ZW50cyk7XG4gICAgICAgIHZhciBrZXk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgICAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGV2ZW50c1t0eXBlXTtcblxuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICAgICAgfSBlbHNlIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gTElGTyBvcmRlclxuICAgICAgICBmb3IgKGkgPSBsaXN0ZW5lcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuZnVuY3Rpb24gX2xpc3RlbmVycyh0YXJnZXQsIHR5cGUsIHVud3JhcCkge1xuICB2YXIgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG5cbiAgaWYgKCFldmVudHMpXG4gICAgcmV0dXJuIFtdO1xuXG4gIHZhciBldmxpc3RlbmVyID0gZXZlbnRzW3R5cGVdO1xuICBpZiAoIWV2bGlzdGVuZXIpXG4gICAgcmV0dXJuIFtdO1xuXG4gIGlmICh0eXBlb2YgZXZsaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJylcbiAgICByZXR1cm4gdW53cmFwID8gW2V2bGlzdGVuZXIubGlzdGVuZXIgfHwgZXZsaXN0ZW5lcl0gOiBbZXZsaXN0ZW5lcl07XG5cbiAgcmV0dXJuIHVud3JhcCA/IHVud3JhcExpc3RlbmVycyhldmxpc3RlbmVyKSA6IGFycmF5Q2xvbmUoZXZsaXN0ZW5lciwgZXZsaXN0ZW5lci5sZW5ndGgpO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIGxpc3RlbmVycyh0eXBlKSB7XG4gIHJldHVybiBfbGlzdGVuZXJzKHRoaXMsIHR5cGUsIHRydWUpO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yYXdMaXN0ZW5lcnMgPSBmdW5jdGlvbiByYXdMaXN0ZW5lcnModHlwZSkge1xuICByZXR1cm4gX2xpc3RlbmVycyh0aGlzLCB0eXBlLCBmYWxzZSk7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgaWYgKHR5cGVvZiBlbWl0dGVyLmxpc3RlbmVyQ291bnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZW1pdHRlci5saXN0ZW5lckNvdW50KHR5cGUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBsaXN0ZW5lckNvdW50LmNhbGwoZW1pdHRlciwgdHlwZSk7XG4gIH1cbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGxpc3RlbmVyQ291bnQ7XG5mdW5jdGlvbiBsaXN0ZW5lckNvdW50KHR5cGUpIHtcbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcblxuICBpZiAoZXZlbnRzKSB7XG4gICAgdmFyIGV2bGlzdGVuZXIgPSBldmVudHNbdHlwZV07XG5cbiAgICBpZiAodHlwZW9mIGV2bGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAoZXZsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuIGV2bGlzdGVuZXIubGVuZ3RoO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiAwO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbiBldmVudE5hbWVzKCkge1xuICByZXR1cm4gdGhpcy5fZXZlbnRzQ291bnQgPiAwID8gUmVmbGVjdC5vd25LZXlzKHRoaXMuX2V2ZW50cykgOiBbXTtcbn07XG5cbi8vIEFib3V0IDEuNXggZmFzdGVyIHRoYW4gdGhlIHR3by1hcmcgdmVyc2lvbiBvZiBBcnJheSNzcGxpY2UoKS5cbmZ1bmN0aW9uIHNwbGljZU9uZShsaXN0LCBpbmRleCkge1xuICBmb3IgKHZhciBpID0gaW5kZXgsIGsgPSBpICsgMSwgbiA9IGxpc3QubGVuZ3RoOyBrIDwgbjsgaSArPSAxLCBrICs9IDEpXG4gICAgbGlzdFtpXSA9IGxpc3Rba107XG4gIGxpc3QucG9wKCk7XG59XG5cbmZ1bmN0aW9uIGFycmF5Q2xvbmUoYXJyLCBuKSB7XG4gIHZhciBjb3B5ID0gbmV3IEFycmF5KG4pO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG47ICsraSlcbiAgICBjb3B5W2ldID0gYXJyW2ldO1xuICByZXR1cm4gY29weTtcbn1cblxuZnVuY3Rpb24gdW53cmFwTGlzdGVuZXJzKGFycikge1xuICB2YXIgcmV0ID0gbmV3IEFycmF5KGFyci5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHJldC5sZW5ndGg7ICsraSkge1xuICAgIHJldFtpXSA9IGFycltpXS5saXN0ZW5lciB8fCBhcnJbaV07XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gb2JqZWN0Q3JlYXRlUG9seWZpbGwocHJvdG8pIHtcbiAgdmFyIEYgPSBmdW5jdGlvbigpIHt9O1xuICBGLnByb3RvdHlwZSA9IHByb3RvO1xuICByZXR1cm4gbmV3IEY7XG59XG5mdW5jdGlvbiBvYmplY3RLZXlzUG9seWZpbGwob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGsgaW4gb2JqKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgaykpIHtcbiAgICBrZXlzLnB1c2goayk7XG4gIH1cbiAgcmV0dXJuIGs7XG59XG5mdW5jdGlvbiBmdW5jdGlvbkJpbmRQb2x5ZmlsbChjb250ZXh0KSB7XG4gIHZhciBmbiA9IHRoaXM7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZuLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gIH07XG59XG4iLCIvLyBodHRwczovL2dpdGh1Yi5jb20vbWF4b2dkZW4vd2Vic29ja2V0LXN0cmVhbS9ibG9iLzQ4ZGMzZGRmOTQzZTVhZGE2NjhjMzFjY2Q5NGU5MTg2ZjAyZmFmYmQvd3MtZmFsbGJhY2suanNcblxudmFyIHdzID0gbnVsbFxuXG5pZiAodHlwZW9mIFdlYlNvY2tldCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgd3MgPSBXZWJTb2NrZXRcbn0gZWxzZSBpZiAodHlwZW9mIE1veldlYlNvY2tldCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgd3MgPSBNb3pXZWJTb2NrZXRcbn0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgd3MgPSBnbG9iYWwuV2ViU29ja2V0IHx8IGdsb2JhbC5Nb3pXZWJTb2NrZXRcbn0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgd3MgPSB3aW5kb3cuV2ViU29ja2V0IHx8IHdpbmRvdy5Nb3pXZWJTb2NrZXRcbn0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdzID0gc2VsZi5XZWJTb2NrZXQgfHwgc2VsZi5Nb3pXZWJTb2NrZXRcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3c1xuIiwiY29uc3QgSmFudXMgPSByZXF1aXJlKCcuL3NyYy9KYW51cycpXHJcbmNvbnN0IEphbnVzQWRtaW4gPSByZXF1aXJlKCcuL3NyYy9KYW51c0FkbWluJylcclxuY29uc3QgSmFudXNQbHVnaW4gPSByZXF1aXJlKCcuL3NyYy9KYW51c1BsdWdpbicpXHJcbmNvbnN0IFZpZGVvUm9vbSA9IHJlcXVpcmUoJy4vc3JjL3BsdWdpbi9WaWRlb1Jvb20nKVxyXG5jb25zdCBWaWRlb1Jvb21QdWJsaXNoZXIgPSByZXF1aXJlKCcuL3NyYy9wbHVnaW4vVmlkZW9Sb29tUHVibGlzaGVyJylcclxuY29uc3QgVmlkZW9Sb29tU3Vic2NyaWJlciA9IHJlcXVpcmUoJy4vc3JjL3BsdWdpbi9WaWRlb1Jvb21TdWJzY3JpYmVyJylcclxuY29uc3QgVmlkZW9Sb29tQWRtaW4gPSByZXF1aXJlKCcuL3NyYy9wbHVnaW4vVmlkZW9Sb29tQWRtaW4nKVxyXG5jb25zdCB7IEphbnVzQ29uZmlnLCBKYW51c0FkbWluQ29uZmlnLCBKYW51c1Jvb21Db25maWcgfSA9IHJlcXVpcmUoJy4vc3JjL0NvbmZpZycpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBKYW51cyxcclxuICBKYW51c0FkbWluLFxyXG4gIEphbnVzUGx1Z2luLFxyXG4gIFZpZGVvUm9vbSxcclxuICBWaWRlb1Jvb21QdWJsaXNoZXIsXHJcbiAgVmlkZW9Sb29tU3Vic2NyaWJlcixcclxuICBWaWRlb1Jvb21BZG1pbixcclxuICBKYW51c0NvbmZpZyxcclxuICBKYW51c0FkbWluQ29uZmlnLFxyXG4gIEphbnVzUm9vbUNvbmZpZ1xyXG59XHJcbiIsImNsYXNzIEphbnVzQ29uZmlnIHtcclxuICBjb25zdHJ1Y3RvciAoY29uZmlnKSB7XHJcbiAgICBjb25zdCB7XHJcbiAgICAgIHVybCxcclxuICAgICAga2VlcEFsaXZlSW50ZXJ2YWxNcyxcclxuICAgICAgb3B0aW9uc1xyXG4gICAgfSA9IGNvbmZpZ1xyXG5cclxuICAgIHRoaXMudXJsID0gdXJsXHJcbiAgICB0aGlzLmtlZXBBbGl2ZUludGVydmFsTXMgPSBrZWVwQWxpdmVJbnRlcnZhbE1zXHJcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zXHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBKYW51c0FkbWluQ29uZmlnIGV4dGVuZHMgSmFudXNDb25maWcge1xyXG4gIGNvbnN0cnVjdG9yIChjb25maWcpIHtcclxuICAgIHN1cGVyKGNvbmZpZylcclxuICAgIGNvbnN0IHtcclxuICAgICAgc2VjcmV0LFxyXG4gICAgICBzZXNzaW9uTGlzdEludGVydmFsTXNcclxuICAgIH0gPSBjb25maWdcclxuXHJcbiAgICB0aGlzLnNlY3JldCA9IHNlY3JldFxyXG4gICAgdGhpcy5zZXNzaW9uTGlzdEludGVydmFsTXMgPSBzZXNzaW9uTGlzdEludGVydmFsTXNcclxuICB9XHJcbn1cclxuXHJcbmNsYXNzIEphbnVzUm9vbUNvbmZpZyB7XHJcbiAgY29uc3RydWN0b3IgKGNvbmZpZykge1xyXG4gICAgY29uc3Qge1xyXG4gICAgICBpZCxcclxuICAgICAgY29kZWMsXHJcbiAgICAgIHJlY29yZCxcclxuICAgICAgdmlkZW9PcmllbnRFeHQsXHJcbiAgICAgIGJpdHJhdGUsXHJcbiAgICAgIGZpclNlY29uZHMsXHJcbiAgICAgIHB1Ymxpc2hlcnMsXHJcbiAgICAgIHJlY29yZERpcmVjdG9yeVxyXG4gICAgfSA9IGNvbmZpZ1xyXG5cclxuICAgIHRoaXMuaWQgPSBpZFxyXG4gICAgdGhpcy5jb2RlYyA9IGNvZGVjXHJcbiAgICB0aGlzLnJlY29yZCA9IHJlY29yZFxyXG4gICAgdGhpcy52aWRlb09yaWVudEV4dCA9IHZpZGVvT3JpZW50RXh0XHJcbiAgICB0aGlzLmJpdHJhdGUgPSBiaXRyYXRlXHJcbiAgICB0aGlzLmZpclNlY29uZHMgPSBmaXJTZWNvbmRzXHJcbiAgICB0aGlzLnB1Ymxpc2hlcnMgPSBwdWJsaXNoZXJzXHJcbiAgICB0aGlzLnJlY29yZERpcmVjdG9yeSA9IHJlY29yZERpcmVjdG9yeVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMuSmFudXNDb25maWcgPSBKYW51c0NvbmZpZ1xyXG5tb2R1bGUuZXhwb3J0cy5KYW51c0FkbWluQ29uZmlnID0gSmFudXNBZG1pbkNvbmZpZ1xyXG5tb2R1bGUuZXhwb3J0cy5KYW51c1Jvb21Db25maWcgPSBKYW51c1Jvb21Db25maWdcclxuIiwiY29uc3QgV2ViU29ja2V0ID0gcmVxdWlyZSgnaXNvbW9ycGhpYy13cycpXHJcbmNvbnN0IEphbnVzUGx1Z2luID0gcmVxdWlyZSgnLi9KYW51c1BsdWdpbicpXHJcbmNvbnN0IHV1aWQgPSByZXF1aXJlKCd1dWlkL3Y0JylcclxuXHJcbmNvbnN0IGlnbm9yZWRFcnJvckNvZGVzID0gW1xyXG4gIDQ1OCwgLy8gSkFOVVNfRVJST1JfU0VTU0lPTl9OT1RfRk9VTkRcclxuICA0NTkgLy8gSkFOVVNfRVJST1JfSEFORExFX05PVF9GT1VORFxyXG5dXHJcblxyXG5jbGFzcyBKYW51cyB7XHJcbiAgY29uc3RydWN0b3IgKGNvbmZpZywgbG9nZ2VyKSB7XHJcbiAgICB0aGlzLndzID0gdW5kZWZpbmVkXHJcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2VcclxuICAgIHRoaXMuc2Vzc2lvbklkID0gdW5kZWZpbmVkXHJcbiAgICB0aGlzLmxvZ2dlciA9IGxvZ2dlclxyXG5cclxuICAgIHRoaXMudHJhbnNhY3Rpb25zID0ge31cclxuICAgIHRoaXMucGx1Z2luSGFuZGxlcyA9IHt9XHJcblxyXG4gICAgdGhpcy5jb25maWcgPSBjb25maWdcclxuICAgIHRoaXMucHJvdG9jb2wgPSAnamFudXMtcHJvdG9jb2wnXHJcbiAgICB0aGlzLnNlbmRDcmVhdGUgPSB0cnVlXHJcbiAgfVxyXG5cclxuICBjb25uZWN0ICgpIHtcclxuICAgIGlmICh0aGlzLmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcylcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICB0aGlzLndzID0gbmV3IFdlYlNvY2tldCh0aGlzLmNvbmZpZy51cmwsIHRoaXMucHJvdG9jb2wsIHRoaXMuY29uZmlnLm9wdGlvbnMpXHJcblxyXG4gICAgICB0aGlzLndzLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgKGVycikgPT4ge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdFcnJvciBjb25uZWN0aW5nIHRvIHRoZSBKYW51cyBXZWJTb2NrZXRzIHNlcnZlci4uLicsIGVycilcclxuICAgICAgICB0aGlzLmlzQ29ubmVjdGVkID0gZmFsc2VcclxuICAgICAgICByZWplY3QoZXJyKVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgdGhpcy53cy5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsICgpID0+IHsgdGhpcy5jbGVhbnVwKCkgfSlcclxuXHJcbiAgICAgIHRoaXMud3MuYWRkRXZlbnRMaXN0ZW5lcignb3BlbicsICgpID0+IHtcclxuICAgICAgICBpZiAoIXRoaXMuc2VuZENyZWF0ZSkge1xyXG4gICAgICAgICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHRydWVcclxuICAgICAgICAgIHRoaXMua2VlcEFsaXZlKHRydWUpXHJcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZSh0aGlzKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSB1dWlkKClcclxuICAgICAgICBjb25zdCByZXF1ZXN0ID0geyBqYW51czogJ2NyZWF0ZScsIHRyYW5zYWN0aW9uIH1cclxuXHJcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbnNbdHJhbnNhY3Rpb25dID0ge1xyXG4gICAgICAgICAgcmVzb2x2ZTogKGpzb24pID0+IHtcclxuICAgICAgICAgICAgaWYgKGpzb24uamFudXMgIT09ICdzdWNjZXNzJykge1xyXG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdDYW5ub3QgY29ubmVjdCB0byBKYW51cycsIGpzb24pXHJcbiAgICAgICAgICAgICAgcmVqZWN0KGpzb24pXHJcbiAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2Vzc2lvbklkID0ganNvbi5kYXRhLmlkXHJcbiAgICAgICAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlXHJcbiAgICAgICAgICAgIHRoaXMua2VlcEFsaXZlKHRydWUpXHJcblxyXG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnSmFudXMgY29ubmVjdGVkLCBzZXNzaW9uSWQ6ICcsIHRoaXMuc2Vzc2lvbklkKVxyXG5cclxuICAgICAgICAgICAgcmVzb2x2ZSh0aGlzKVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHJlamVjdCxcclxuICAgICAgICAgIHJlcGx5VHlwZTogJ3N1Y2Nlc3MnXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLndzLnNlbmQoSlNPTi5zdHJpbmdpZnkocmVxdWVzdCkpXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICB0aGlzLndzLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXZlbnQpID0+IHsgdGhpcy5vbk1lc3NhZ2UoZXZlbnQpIH0pXHJcbiAgICAgIHRoaXMud3MuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCAoKSA9PiB7IHRoaXMub25DbG9zZSgpIH0pXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICpcclxuICAgKiBAcGFyYW0ge0phbnVzUGx1Z2lufSBwbHVnaW5cclxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxyXG4gICAqICovXHJcbiAgYWRkUGx1Z2luIChwbHVnaW4pIHtcclxuICAgIGlmICghKHBsdWdpbiBpbnN0YW5jZW9mIEphbnVzUGx1Z2luKSkge1xyXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdwbHVnaW4gaXMgbm90IGEgSmFudXNQbHVnaW4nKSlcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0ID0gcGx1Z2luLmdldEF0dGFjaFBheWxvYWQoKVxyXG5cclxuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uKCdhdHRhY2gnLCByZXF1ZXN0LCAnc3VjY2VzcycpLnRoZW4oKGpzb24pID0+IHtcclxuICAgICAgaWYgKGpzb24uamFudXMgIT09ICdzdWNjZXNzJykge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdDYW5ub3QgYWRkIHBsdWdpbicsIGpzb24pXHJcbiAgICAgICAgcGx1Z2luLmVycm9yKGpzb24pXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGpzb24pXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMucGx1Z2luSGFuZGxlc1tqc29uLmRhdGEuaWRdID0gcGx1Z2luXHJcblxyXG4gICAgICByZXR1cm4gcGx1Z2luLnN1Y2Nlc3ModGhpcywganNvbi5kYXRhLmlkKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHRyYW5zYWN0aW9uICh0eXBlLCBwYXlsb2FkLCByZXBseVR5cGUsIHRpbWVvdXRNcykge1xyXG4gICAgaWYgKCFyZXBseVR5cGUpIHtcclxuICAgICAgcmVwbHlUeXBlID0gJ2FjaydcclxuICAgIH1cclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uSWQgPSB1dWlkKClcclxuXHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICBpZiAodGltZW91dE1zKSB7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdUcmFuc2FjdGlvbiB0aW1lZCBvdXQgYWZ0ZXIgJyArIHRpbWVvdXRNcyArICcgbXMnKSlcclxuICAgICAgICB9LCB0aW1lb3V0TXMpXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0phbnVzIGlzIG5vdCBjb25uZWN0ZWQnKSlcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcmVxdWVzdCA9IE9iamVjdC5hc3NpZ24oe30sIHBheWxvYWQsIHtcclxuICAgICAgICBqYW51czogdHlwZSxcclxuICAgICAgICBzZXNzaW9uX2lkOiAocGF5bG9hZCAmJiBwYXJzZUludChwYXlsb2FkLnNlc3Npb25faWQsIDEwKSkgfHwgdGhpcy5zZXNzaW9uSWQsXHJcbiAgICAgICAgdHJhbnNhY3Rpb246IHRyYW5zYWN0aW9uSWRcclxuICAgICAgfSlcclxuXHJcbiAgICAgIHRoaXMudHJhbnNhY3Rpb25zW3JlcXVlc3QudHJhbnNhY3Rpb25dID0geyByZXNvbHZlLCByZWplY3QsIHJlcGx5VHlwZSwgcmVxdWVzdCB9XHJcbiAgICAgIHRoaXMud3Muc2VuZChKU09OLnN0cmluZ2lmeShyZXF1ZXN0KSlcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBzZW5kICh0eXBlLCBwYXlsb2FkKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICByZWplY3QobmV3IEVycm9yKCdKYW51cyBpcyBub3QgY29ubmVjdGVkJykpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBPYmplY3QuYXNzaWduKHt9LCBwYXlsb2FkLCB7XHJcbiAgICAgICAgamFudXM6IHR5cGUsXHJcbiAgICAgICAgc2Vzc2lvbl9pZDogdGhpcy5zZXNzaW9uSWQsXHJcbiAgICAgICAgdHJhbnNhY3Rpb246IHV1aWQoKVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0phbnVzIHNlbmRpbmcnLCByZXF1ZXN0KVxyXG4gICAgICB0aGlzLndzLnNlbmQoSlNPTi5zdHJpbmdpZnkocmVxdWVzdCksIHt9LCAoZXJyKSA9PiB7XHJcbiAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgcmVqZWN0KGVycilcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmVzb2x2ZSgpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGRlc3Ryb3kgKCkge1xyXG4gICAgaWYgKCF0aGlzLmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uKCdkZXN0cm95Jywge30sICdzdWNjZXNzJywgNTAwMCkudGhlbigoKSA9PiB7XHJcbiAgICAgIHRoaXMuY2xlYW51cCgpXHJcbiAgICB9KS5jYXRjaCgoKSA9PiB7XHJcbiAgICAgIHRoaXMuY2xlYW51cCgpXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgZGVzdHJveVBsdWdpbiAocGx1Z2luKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICBpZiAoIShwbHVnaW4gaW5zdGFuY2VvZiBKYW51c1BsdWdpbikpIHtcclxuICAgICAgICByZWplY3QobmV3IEVycm9yKCdwbHVnaW4gaXMgbm90IGEgSmFudXNQbHVnaW4nKSlcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCF0aGlzLnBsdWdpbkhhbmRsZXNbcGx1Z2luLmphbnVzSGFuZGxlSWRdKSB7XHJcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcigndW5rbm93biBwbHVnaW4nKSlcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy50cmFuc2FjdGlvbignZGV0YWNoJywgeyBwbHVnaW46IHBsdWdpbi5wbHVnaW5OYW1lLCBoYW5kbGVfaWQ6IHBsdWdpbi5qYW51c0hhbmRsZUlkIH0sICdzdWNjZXNzJywgNTAwMCkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMucGx1Z2luSGFuZGxlc1twbHVnaW4ucGx1Z2luTmFtZV1cclxuICAgICAgICBwbHVnaW4uZGV0YWNoKClcclxuXHJcbiAgICAgICAgcmVzb2x2ZSgpXHJcbiAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcclxuICAgICAgICBkZWxldGUgdGhpcy5wbHVnaW5IYW5kbGVzW3BsdWdpbi5wbHVnaW5OYW1lXVxyXG4gICAgICAgIHBsdWdpbi5kZXRhY2goKVxyXG5cclxuICAgICAgICByZWplY3QoZXJyKVxyXG4gICAgICB9KVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIG9uTWVzc2FnZSAobWVzc2FnZUV2ZW50KSB7XHJcbiAgICBsZXQganNvblxyXG4gICAgdHJ5IHtcclxuICAgICAganNvbiA9IEpTT04ucGFyc2UobWVzc2FnZUV2ZW50LmRhdGEpXHJcbiAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2Nhbm5vdCBwYXJzZSBtZXNzYWdlJywgbWVzc2FnZUV2ZW50LmRhdGEpXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIC8vIHRoaXMubG9nZ2VyLmRlYnVnKCdKQU5VUyBHT1QnLCBqc29uKVxyXG4gICAgaWYgKGpzb24uamFudXMgPT09ICd0aW1lb3V0JyAmJiBqc29uLnNlc3Npb25faWQgIT09IHRoaXMuc2Vzc2lvbklkKSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdHT1QgdGltZW91dCBmcm9tIGFub3RoZXIgd2Vic29ja2V0JykgLy8gc2VlbXMgbGlrZSBhIGJ1ZyBpbiBqYW51cyB0aW1lb3V0IGhhbmRsZXIgOilcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGpzb24uamFudXMgPT09ICdrZWVwYWxpdmUnKSB7IC8vIERvIG5vdGhpbmdcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGpzb24uamFudXMgPT09ICdhY2snKSB7IC8vIEp1c3QgYW4gYWNrLCB3ZSBjYW4gcHJvYmFibHkgaWdub3JlXHJcbiAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gdGhpcy5nZXRUcmFuc2FjdGlvbihqc29uKVxyXG4gICAgICBpZiAodHJhbnNhY3Rpb24gJiYgdHJhbnNhY3Rpb24ucmVzb2x2ZSkge1xyXG4gICAgICAgIHRyYW5zYWN0aW9uLnJlc29sdmUoanNvbilcclxuICAgICAgfVxyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoanNvbi5qYW51cyA9PT0gJ3N1Y2Nlc3MnKSB7IC8vIFN1Y2Nlc3MhXHJcbiAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gdGhpcy5nZXRUcmFuc2FjdGlvbihqc29uKVxyXG4gICAgICBpZiAoIXRyYW5zYWN0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHBsdWdpbkRhdGEgPSBqc29uLnBsdWdpbmRhdGFcclxuICAgICAgaWYgKHBsdWdpbkRhdGEgPT09IHVuZGVmaW5lZCB8fCBwbHVnaW5EYXRhID09PSBudWxsKSB7XHJcbiAgICAgICAgdHJhbnNhY3Rpb24ucmVzb2x2ZShqc29uKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBzZW5kZXIgPSBqc29uLnNlbmRlclxyXG4gICAgICBpZiAoIXNlbmRlcikge1xyXG4gICAgICAgIHRyYW5zYWN0aW9uLnJlc29sdmUoanNvbilcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignTWlzc2luZyBzZW5kZXIgZm9yIHBsdWdpbmRhdGEnLCBqc29uKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBwbHVnaW5IYW5kbGUgPSB0aGlzLnBsdWdpbkhhbmRsZXNbc2VuZGVyXVxyXG4gICAgICBpZiAoIXBsdWdpbkhhbmRsZSkge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdUaGlzIGhhbmRsZSBpcyBub3QgYXR0YWNoZWQgdG8gdGhpcyBzZXNzaW9uJywganNvbilcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG5cclxuICAgICAgdHJhbnNhY3Rpb24ucmVzb2x2ZSh7IGRhdGE6IHBsdWdpbkRhdGEuZGF0YSwganNvbiB9KVxyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoanNvbi5qYW51cyA9PT0gJ3dlYnJ0Y3VwJykgeyAvLyBUaGUgUGVlckNvbm5lY3Rpb24gd2l0aCB0aGUgZ2F0ZXdheSBpcyB1cCEgTm90aWZ5IHRoaXNcclxuICAgICAgY29uc3Qgc2VuZGVyID0ganNvbi5zZW5kZXJcclxuICAgICAgaWYgKCFzZW5kZXIpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdNaXNzaW5nIHNlbmRlci4uLicpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgcGx1Z2luSGFuZGxlID0gdGhpcy5wbHVnaW5IYW5kbGVzW3NlbmRlcl1cclxuICAgICAgaWYgKCFwbHVnaW5IYW5kbGUpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVGhpcyBoYW5kbGUgaXMgbm90IGF0dGFjaGVkIHRvIHRoaXMgc2Vzc2lvbicsIHNlbmRlcilcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG4gICAgICBwbHVnaW5IYW5kbGUud2VicnRjU3RhdGUodHJ1ZSlcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGpzb24uamFudXMgPT09ICdoYW5ndXAnKSB7IC8vIEEgcGx1Z2luIGFza2VkIHRoZSBjb3JlIHRvIGhhbmd1cCBhIFBlZXJDb25uZWN0aW9uIG9uIG9uZSBvZiBvdXIgaGFuZGxlc1xyXG4gICAgICBjb25zdCBzZW5kZXIgPSBqc29uLnNlbmRlclxyXG4gICAgICBpZiAoIXNlbmRlcikge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ01pc3Npbmcgc2VuZGVyLi4uJylcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG4gICAgICBjb25zdCBwbHVnaW5IYW5kbGUgPSB0aGlzLnBsdWdpbkhhbmRsZXNbc2VuZGVyXVxyXG4gICAgICBpZiAoIXBsdWdpbkhhbmRsZSkge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdUaGlzIGhhbmRsZSBpcyBub3QgYXR0YWNoZWQgdG8gdGhpcyBzZXNzaW9uJywgc2VuZGVyKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcbiAgICAgIHBsdWdpbkhhbmRsZS53ZWJydGNTdGF0ZShmYWxzZSwganNvbi5yZWFzb24pXHJcbiAgICAgIHBsdWdpbkhhbmRsZS5oYW5ndXAoKVxyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoanNvbi5qYW51cyA9PT0gJ2RldGFjaGVkJykgeyAvLyBBIHBsdWdpbiBhc2tlZCB0aGUgY29yZSB0byBkZXRhY2ggb25lIG9mIG91ciBoYW5kbGVzXHJcbiAgICAgIGNvbnN0IHNlbmRlciA9IGpzb24uc2VuZGVyXHJcbiAgICAgIGlmICghc2VuZGVyKSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybignTWlzc2luZyBzZW5kZXIuLi4nKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmIChqc29uLmphbnVzID09PSAnbWVkaWEnKSB7IC8vIE1lZGlhIHN0YXJ0ZWQvc3RvcHBlZCBmbG93aW5nXHJcbiAgICAgIGNvbnN0IHNlbmRlciA9IGpzb24uc2VuZGVyXHJcbiAgICAgIGlmICghc2VuZGVyKSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybignTWlzc2luZyBzZW5kZXIuLi4nKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IHBsdWdpbkhhbmRsZSA9IHRoaXMucGx1Z2luSGFuZGxlc1tzZW5kZXJdXHJcbiAgICAgIGlmICghcGx1Z2luSGFuZGxlKSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1RoaXMgaGFuZGxlIGlzIG5vdCBhdHRhY2hlZCB0byB0aGlzIHNlc3Npb24nLCBzZW5kZXIpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuICAgICAgcGx1Z2luSGFuZGxlLm1lZGlhU3RhdGUoanNvbi50eXBlLCBqc29uLnJlY2VpdmluZylcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGpzb24uamFudXMgPT09ICdzbG93bGluaycpIHsgLy8gVHJvdWJsZSB1cGxpbmsgb3IgZG93bmxpbmtcclxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0dvdCBhIHNsb3dsaW5rIGV2ZW50IG9uIHNlc3Npb24gJyArIHRoaXMuc2Vzc2lvbklkKVxyXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1Zyhqc29uKVxyXG4gICAgICBjb25zdCBzZW5kZXIgPSBqc29uLnNlbmRlclxyXG4gICAgICBpZiAoIXNlbmRlcikge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ01pc3Npbmcgc2VuZGVyLi4uJylcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG4gICAgICBjb25zdCBwbHVnaW5IYW5kbGUgPSB0aGlzLnBsdWdpbkhhbmRsZXNbc2VuZGVyXVxyXG4gICAgICBpZiAoIXBsdWdpbkhhbmRsZSkge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdUaGlzIGhhbmRsZSBpcyBub3QgYXR0YWNoZWQgdG8gdGhpcyBzZXNzaW9uJywgc2VuZGVyKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcbiAgICAgIHBsdWdpbkhhbmRsZS5zbG93TGluayhqc29uLnVwbGluaywganNvbi5uYWNrcylcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGpzb24uamFudXMgPT09ICdlcnJvcicpIHsgLy8gT29wcywgc29tZXRoaW5nIHdyb25nIGhhcHBlbmVkXHJcbiAgICAgIGlmIChqc29uLmVycm9yICYmIGpzb24uZXJyb3IuY29kZSAmJiAhaWdub3JlZEVycm9yQ29kZXMuaW5jbHVkZXMoanNvbi5lcnJvci5jb2RlKSkge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdKYW51cyBlcnJvciByZXNwb25zZScgKyBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAyKSlcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSB0aGlzLmdldFRyYW5zYWN0aW9uKGpzb24sIHRydWUpXHJcbiAgICAgIGlmICh0cmFuc2FjdGlvbiAmJiB0cmFuc2FjdGlvbi5yZWplY3QpIHtcclxuICAgICAgICBpZiAodHJhbnNhY3Rpb24ucmVxdWVzdCkge1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0phbnVzIEVycm9yOiByZWplY3RpbmcgdHJhbnNhY3Rpb24nLCB0cmFuc2FjdGlvbi5yZXF1ZXN0LCBqc29uKVxyXG4gICAgICAgIH1cclxuICAgICAgICB0cmFuc2FjdGlvbi5yZWplY3QoanNvbilcclxuICAgICAgfVxyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoanNvbi5qYW51cyA9PT0gJ2V2ZW50Jykge1xyXG4gICAgICBjb25zdCBzZW5kZXIgPSBqc29uLnNlbmRlclxyXG4gICAgICBpZiAoIXNlbmRlcikge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ01pc3Npbmcgc2VuZGVyLi4uJylcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG4gICAgICBjb25zdCBwbHVnaW5EYXRhID0ganNvbi5wbHVnaW5kYXRhXHJcbiAgICAgIGlmIChwbHVnaW5EYXRhID09PSB1bmRlZmluZWQgfHwgcGx1Z2luRGF0YSA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdNaXNzaW5nIHBsdWdpbmRhdGEuLi4nKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBwbHVnaW5IYW5kbGUgPSB0aGlzLnBsdWdpbkhhbmRsZXNbc2VuZGVyXVxyXG4gICAgICBpZiAoIXBsdWdpbkhhbmRsZSkge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdUaGlzIGhhbmRsZSBpcyBub3QgYXR0YWNoZWQgdG8gdGhpcyBzZXNzaW9uJywgc2VuZGVyKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBkYXRhID0gcGx1Z2luRGF0YS5kYXRhXHJcbiAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gdGhpcy5nZXRUcmFuc2FjdGlvbihqc29uKVxyXG4gICAgICBpZiAodHJhbnNhY3Rpb24pIHtcclxuICAgICAgICBpZiAoZGF0YS5lcnJvcl9jb2RlKSB7XHJcbiAgICAgICAgICB0cmFuc2FjdGlvbi5yZWplY3QoeyBkYXRhLCBqc29uIH0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRyYW5zYWN0aW9uLnJlc29sdmUoeyBkYXRhLCBqc29uIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcblxyXG4gICAgICBwbHVnaW5IYW5kbGUub25tZXNzYWdlKGRhdGEsIGpzb24pXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubG9nZ2VyLndhcm4oJ1Vua25vd24gbWVzc2FnZS9ldmVudCAnICsganNvbi5qYW51cyArICcgb24gc2Vzc2lvbiAnICsgdGhpcy5zZXNzaW9uSWQpXHJcbiAgICB0aGlzLmxvZ2dlci5kZWJ1Zyhqc29uKVxyXG4gIH1cclxuXHJcbiAgb25DbG9zZSAoKSB7XHJcbiAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXHJcbiAgICB0aGlzLmxvZ2dlci5lcnJvcignTG9zdCBjb25uZWN0aW9uIHRvIHRoZSBnYXRld2F5IChpcyBpdCBkb3duPyknKVxyXG4gIH1cclxuXHJcbiAga2VlcEFsaXZlIChpc1NjaGVkdWxlZCkge1xyXG4gICAgaWYgKCF0aGlzLndzIHx8ICF0aGlzLmlzQ29ubmVjdGVkIHx8ICF0aGlzLnNlc3Npb25JZCkge1xyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoaXNTY2hlZHVsZWQpIHtcclxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHRoaXMua2VlcEFsaXZlKCkgfSwgdGhpcy5jb25maWcua2VlcEFsaXZlSW50ZXJ2YWxNcylcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGxvZ2dlci5kZWJ1ZygnU2VuZGluZyBKYW51cyBrZWVwYWxpdmUnKVxyXG4gICAgICB0aGlzLnRyYW5zYWN0aW9uKCdrZWVwYWxpdmUnKS50aGVuKCgpID0+IHtcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgdGhpcy5rZWVwQWxpdmUoKSB9LCB0aGlzLmNvbmZpZy5rZWVwQWxpdmVJbnRlcnZhbE1zKVxyXG4gICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybignSmFudXMga2VlcGFsaXZlIGVycm9yJywgZXJyKVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0VHJhbnNhY3Rpb24gKGpzb24sIGlnbm9yZVJlcGx5VHlwZSA9IGZhbHNlKSB7XHJcbiAgICBjb25zdCB0eXBlID0ganNvbi5qYW51c1xyXG4gICAgY29uc3QgdHJhbnNhY3Rpb25JZCA9IGpzb24udHJhbnNhY3Rpb25cclxuICAgIGlmIChcclxuICAgICAgdHJhbnNhY3Rpb25JZCAmJlxyXG4gICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcy50cmFuc2FjdGlvbnMsIHRyYW5zYWN0aW9uSWQpICYmXHJcbiAgICAgIChpZ25vcmVSZXBseVR5cGUgfHwgdGhpcy50cmFuc2FjdGlvbnNbdHJhbnNhY3Rpb25JZF0ucmVwbHlUeXBlID09PSB0eXBlKVxyXG4gICAgKSB7XHJcbiAgICAgIGNvbnN0IHJldCA9IHRoaXMudHJhbnNhY3Rpb25zW3RyYW5zYWN0aW9uSWRdXHJcbiAgICAgIGRlbGV0ZSB0aGlzLnRyYW5zYWN0aW9uc1t0cmFuc2FjdGlvbklkXVxyXG4gICAgICByZXR1cm4gcmV0XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjbGVhbnVwICgpIHtcclxuICAgIHRoaXMuX2NsZWFudXBQbHVnaW5zKClcclxuICAgIHRoaXMuX2NsZWFudXBXZWJTb2NrZXQoKVxyXG4gICAgdGhpcy5fY2xlYW51cFRyYW5zYWN0aW9ucygpXHJcbiAgfVxyXG5cclxuICBfY2xlYW51cFdlYlNvY2tldCAoKSB7XHJcbiAgICBpZiAodGhpcy53cykge1xyXG4gICAgICBpZiAodGhpcy53cy5yZW1vdmVBbGxMaXN0ZW5lcnMpIHtcclxuICAgICAgICB0aGlzLndzLnJlbW92ZUFsbExpc3RlbmVycygpXHJcbiAgICAgIH1cclxuICAgICAgaWYgKHRoaXMud3MucmVhZHlTdGF0ZSA9PT0gV2ViU29ja2V0Lk9QRU4pIHtcclxuICAgICAgICB0aGlzLndzLmNsb3NlKClcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy53cyA9IHVuZGVmaW5lZFxyXG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXHJcbiAgfVxyXG5cclxuICBfY2xlYW51cFBsdWdpbnMgKCkge1xyXG4gICAgT2JqZWN0LmtleXModGhpcy5wbHVnaW5IYW5kbGVzKS5mb3JFYWNoKChwbHVnaW5JZCkgPT4ge1xyXG4gICAgICBjb25zdCBwbHVnaW4gPSB0aGlzLnBsdWdpbkhhbmRsZXNbcGx1Z2luSWRdXHJcbiAgICAgIGRlbGV0ZSB0aGlzLnBsdWdpbkhhbmRsZXNbcGx1Z2luSWRdXHJcbiAgICAgIHBsdWdpbi5kZXRhY2goKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIF9jbGVhbnVwVHJhbnNhY3Rpb25zICgpIHtcclxuICAgIE9iamVjdC5rZXlzKHRoaXMudHJhbnNhY3Rpb25zKS5mb3JFYWNoKCh0cmFuc2FjdGlvbklkKSA9PiB7XHJcbiAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gdGhpcy50cmFuc2FjdGlvbnNbdHJhbnNhY3Rpb25JZF1cclxuICAgICAgaWYgKHRyYW5zYWN0aW9uLnJlamVjdCkge1xyXG4gICAgICAgIHRyYW5zYWN0aW9uLnJlamVjdCgpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICB0aGlzLnRyYW5zYWN0aW9ucyA9IHt9XHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEphbnVzXHJcbiIsImNvbnN0IEphbnVzID0gcmVxdWlyZSgnLi9KYW51cycpXHJcblxyXG5jbGFzcyBKYW51c0FkbWluIGV4dGVuZHMgSmFudXMge1xyXG4gIC8qKlxyXG4gICAqXHJcbiAgICogQHBhcmFtIGNvbmZpZ1xyXG4gICAqIEBwYXJhbSBsb2dnZXJcclxuICAgKi9cclxuICBjb25zdHJ1Y3RvciAoY29uZmlnLCBsb2dnZXIpIHtcclxuICAgIHN1cGVyKGNvbmZpZywgbG9nZ2VyKVxyXG4gICAgdGhpcy5jb25maWcgPSBjb25maWdcclxuICAgIHRoaXMucHJvdG9jb2wgPSAnamFudXMtYWRtaW4tcHJvdG9jb2wnXHJcbiAgICB0aGlzLnNlbmRDcmVhdGUgPSBmYWxzZVxyXG4gIH1cclxuXHJcbiAgdHJhbnNhY3Rpb24gKHR5cGUsIHBheWxvYWQsIHJlcGx5VHlwZSkge1xyXG4gICAgY29uc3QgbXNnID0gT2JqZWN0LmFzc2lnbih7fSwgcGF5bG9hZCwge1xyXG4gICAgICBhZG1pbl9zZWNyZXQ6IHRoaXMuY29uZmlnLnNlY3JldFxyXG4gICAgfSlcclxuICAgIHJldHVybiBzdXBlci50cmFuc2FjdGlvbih0eXBlLCBtc2csIHJlcGx5VHlwZSB8fCAnc3VjY2VzcycpXHJcbiAgfVxyXG5cclxuICBsaXN0U2Vzc2lvbnMgKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudHJhbnNhY3Rpb24oJ2xpc3Rfc2Vzc2lvbnMnKS50aGVuKHIgPT4gci5zZXNzaW9ucylcclxuICB9XHJcblxyXG4gIGxpc3RIYW5kbGVzIChzZXNzaW9uSWQpIHtcclxuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uKCdsaXN0X2hhbmRsZXMnLCB7XHJcbiAgICAgIHNlc3Npb25faWQ6IHNlc3Npb25JZFxyXG4gICAgfSkudGhlbihyID0+IHIuaGFuZGxlcylcclxuICB9XHJcblxyXG4gIGhhbmRsZUluZm8gKHNlc3Npb25JZCwgaGFuZGxlSWQpIHtcclxuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uKCdoYW5kbGVfaW5mbycsIHtcclxuICAgICAgc2Vzc2lvbl9pZDogc2Vzc2lvbklkLFxyXG4gICAgICBoYW5kbGVfaWQ6IGhhbmRsZUlkXHJcbiAgICB9KS50aGVuKHIgPT4gci5pbmZvKVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBKYW51c0FkbWluXHJcbiIsImNvbnN0IHV1aWQgPSByZXF1aXJlKCd1dWlkL3Y0JylcclxuY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJylcclxuXHJcbmNsYXNzIEphbnVzUGx1Z2luIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcclxuICBjb25zdHJ1Y3RvciAobG9nZ2VyKSB7XHJcbiAgICBzdXBlcigpXHJcbiAgICB0aGlzLmlkID0gdXVpZCgpXHJcbiAgICAvKiogQHZhciBKYW51cyAqL1xyXG4gICAgdGhpcy5qYW51cyA9IHVuZGVmaW5lZFxyXG4gICAgdGhpcy5qYW51c0hhbmRsZUlkID0gdW5kZWZpbmVkXHJcbiAgICB0aGlzLnBsdWdpbk5hbWUgPSB1bmRlZmluZWRcclxuICAgIHRoaXMubG9nZ2VyID0gbG9nZ2VyXHJcbiAgfVxyXG5cclxuICBnZXRBdHRhY2hQYXlsb2FkICgpIHtcclxuICAgIHJldHVybiB7IHBsdWdpbjogdGhpcy5wbHVnaW5OYW1lLCBvcGFxdWVfaWQ6IHRoaXMuaWQgfVxyXG4gIH1cclxuXHJcbiAgdHJhbnNhY3Rpb24gKG1lc3NhZ2UsIGFkZGl0aW9uYWxGaWVsZHMsIHJlcGx5VHlwZSkge1xyXG4gICAgY29uc3QgcGF5bG9hZCA9IE9iamVjdC5hc3NpZ24oe30sIGFkZGl0aW9uYWxGaWVsZHMsIHsgaGFuZGxlX2lkOiB0aGlzLmphbnVzSGFuZGxlSWQgfSlcclxuXHJcbiAgICBpZiAoIXRoaXMuamFudXMpIHtcclxuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignSmFudXNQbHVnaW4gaXMgbm90IGNvbm5lY3RlZCcpKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLmphbnVzLnRyYW5zYWN0aW9uKG1lc3NhZ2UsIHBheWxvYWQsIHJlcGx5VHlwZSlcclxuICB9XHJcblxyXG4gIHN1Y2Nlc3MgKGphbnVzLCBqYW51c0hhbmRsZUlkKSB7XHJcbiAgICB0aGlzLmphbnVzID0gamFudXNcclxuICAgIHRoaXMuamFudXNIYW5kbGVJZCA9IGphbnVzSGFuZGxlSWRcclxuXHJcbiAgICByZXR1cm4gdGhpc1xyXG4gIH1cclxuXHJcbiAgZXJyb3IgKGNhdXNlKSB7XHJcbiAgICAvLyBDb3VsZG4ndCBhdHRhY2ggdG8gdGhlIHBsdWdpblxyXG4gIH1cclxuXHJcbiAgb25tZXNzYWdlIChkYXRhLCBqc29uKSB7XHJcbiAgICB0aGlzLmxvZ2dlci5lcnJvcignVW5oYW5kbGVkIG1lc3NhZ2UgZnJvbSBqYW51cyBpbiBhIHBsdWdpbjogJyArIHRoaXMuY29uc3RydWN0b3IubmFtZSwgZGF0YSwganNvbilcclxuICB9XHJcblxyXG4gIG9uY2xlYW51cCAoKSB7XHJcbiAgICAvLyBQZWVyQ29ubmVjdGlvbiB3aXRoIHRoZSBwbHVnaW4gY2xvc2VkLCBjbGVhbiB0aGUgVUlcclxuICAgIC8vIFRoZSBwbHVnaW4gaGFuZGxlIGlzIHN0aWxsIHZhbGlkIHNvIHdlIGNhbiBjcmVhdGUgYSBuZXcgb25lXHJcbiAgfVxyXG5cclxuICBkZXRhY2hlZCAoKSB7XHJcbiAgICAvLyBDb25uZWN0aW9uIHdpdGggdGhlIHBsdWdpbiBjbG9zZWQsIGdldCByaWQgb2YgaXRzIGZlYXR1cmVzXHJcbiAgICAvLyBUaGUgcGx1Z2luIGhhbmRsZSBpcyBub3QgdmFsaWQgYW55bW9yZVxyXG4gIH1cclxuXHJcbiAgaGFuZ3VwICgpIHtcclxuICAgIHRoaXMuZW1pdCgnaGFuZ3VwJylcclxuICB9XHJcblxyXG4gIHNsb3dMaW5rICgpIHtcclxuICAgIHRoaXMuZW1pdCgnc2xvd2xpbmsnKVxyXG4gIH1cclxuXHJcbiAgbWVkaWFTdGF0ZSAobWVkaXVtLCBvbikge1xyXG4gICAgdGhpcy5lbWl0KCdtZWRpYVN0YXRlJywgbWVkaXVtLCBvbilcclxuICB9XHJcblxyXG4gIHdlYnJ0Y1N0YXRlIChpc1JlYWR5LCBjYXVzZSkge1xyXG4gICAgdGhpcy5lbWl0KCd3ZWJydGNTdGF0ZScsIGlzUmVhZHksIGNhdXNlKVxyXG4gIH1cclxuXHJcbiAgZGVzdHJveSAoKSB7XHJcbiAgICB0aGlzLmhhbmd1cCgpO1xyXG5cclxuICAgIHRoaXMuamFudXMuZGVzdHJveVBsdWdpbih0aGlzKS5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbSwgZGVzdHJveVBsdWdpbiBlcnJvcicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgZGV0YWNoICgpIHtcclxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XHJcbiAgICB0aGlzLmphbnVzID0gbnVsbDtcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSmFudXNQbHVnaW5cclxuIiwiY29uc3QgU0RQVXRpbHMgPSByZXF1aXJlKCdzZHAnKVxyXG5cclxuY2xhc3MgU2RwSGVscGVyIHtcclxuICBjb25zdHJ1Y3RvciAobG9nZ2VyKSB7XHJcbiAgICB0aGlzLmxvZ2dlciA9IGxvZ2dlclxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQHBhcmFtIHNkcCBzdHJpbmdcclxuICAgKiBAcGFyYW0gYWxsb3dlZFByb2ZpbGVzIGFycmF5W118c3RyaW5nfFJlZ2V4cFxyXG4gICAqL1xyXG4gIGZpbHRlckgyNjRQcm9maWxlcyAoc2RwLCBhbGxvd2VkUHJvZmlsZXMpIHtcclxuICAgIGNvbnN0IHNlY3Rpb25zID0gU0RQVXRpbHMuc3BsaXRTZWN0aW9ucyhzZHApXHJcblxyXG4gICAgY29uc3QgcmV0ID0gW11cclxuICAgIGZvciAoY29uc3Qgc2VjdGlvbiBvZiBzZWN0aW9ucykge1xyXG4gICAgICBpZiAoU0RQVXRpbHMuZ2V0TWlkKHNlY3Rpb24pID09PSAndmlkZW8nKSB7XHJcbiAgICAgICAgY29uc3QgbmV3U2VjdGlvbiA9IFtdXHJcbiAgICAgICAgY29uc3QgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKHNlY3Rpb24pXHJcbiAgICAgICAgY29uc3QgcnRwU2VjdGlvbnMgPSBbW11dXHJcbiAgICAgICAgbGV0IGkgPSAwXHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgICAgaWYgKGxpbmUuaW5kZXhPZignYT1ydHBtYXA6JykgPT09IDApIHtcclxuICAgICAgICAgICAgcnRwU2VjdGlvbnMucHVzaChbXSlcclxuICAgICAgICAgICAgaSsrXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBydHBTZWN0aW9uc1tpXS5wdXNoKGxpbmUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBydHBTZWN0aW9uc1swXS5tYXAobCA9PiBuZXdTZWN0aW9uLnB1c2gobCkpXHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDE7IGogPCBydHBTZWN0aW9ucy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgY29uc3QgcnRwU2VjdGlvbiA9IHJ0cFNlY3Rpb25zW2pdXHJcbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBTRFBVdGlscy5wYXJzZVJ0cE1hcChydHBTZWN0aW9uWzBdKVxyXG5cclxuICAgICAgICAgIGlmIChwYXJzZWQgJiYgcGFyc2VkLm5hbWUgPT09ICdIMjY0Jykge1xyXG4gICAgICAgICAgICBjb25zdCBmbXRwID0gcnRwU2VjdGlvbi5maWx0ZXIobCA9PiBsLmluZGV4T2YoJ2E9Zm10cDonKSA9PT0gMCkuc2hpZnQoKVxyXG5cclxuICAgICAgICAgICAgbGV0IGlzQWxsb3dlZCA9IGZhbHNlXHJcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGFsbG93ZWRQcm9maWxlcykpIHtcclxuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGFsbG93ZWRQcm9maWxlIG9mIGFsbG93ZWRQcm9maWxlcykge1xyXG4gICAgICAgICAgICAgICAgaXNBbGxvd2VkID0gaXNBbGxvd2VkIHx8IGZtdHAuaW5kZXhPZigncHJvZmlsZS1sZXZlbC1pZD0nICsgYWxsb3dlZFByb2ZpbGUpICE9PSAtMVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYWxsb3dlZFByb2ZpbGVzID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgIGlzQWxsb3dlZCA9IGZtdHAuaW5kZXhPZigncHJvZmlsZS1sZXZlbC1pZD0nICsgYWxsb3dlZFByb2ZpbGVzKSAhPT0gLTFcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChhbGxvd2VkUHJvZmlsZXMgaW5zdGFuY2VvZiBSZWdFeHApIHtcclxuICAgICAgICAgICAgICBpc0FsbG93ZWQgPSBhbGxvd2VkUHJvZmlsZXMudGVzdChmbXRwKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoaXNBbGxvd2VkKSB7XHJcbiAgICAgICAgICAgICAgcnRwU2VjdGlvbnNbal0ubWFwKGwgPT4gbmV3U2VjdGlvbi5wdXNoKGwpKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBydHBTZWN0aW9uc1tqXS5tYXAobCA9PiBuZXdTZWN0aW9uLnB1c2gobCkpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBuZXdTZWN0aW9uLm1hcChsID0+IHJldC5wdXNoKGwpKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIFNEUFV0aWxzLnNwbGl0TGluZXMoc2VjdGlvbikubWFwKGwgPT4gcmV0LnB1c2gobCkpXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmV0LmpvaW4oJ1xcclxcbicpICsgJ1xcclxcbidcclxuICB9XHJcblxyXG4gIGZpbHRlckRpcmVjdENhbmRpZGF0ZXMgKHNkcCwgZm9yY2UgPSBmYWxzZSkge1xyXG4gICAgY29uc3QgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKHNkcClcclxuXHJcbiAgICBjb25zdCByZXQgPSBbXVxyXG4gICAgbGV0IGhhdmVDYW5kaWRhdGVzID0gZmFsc2VcclxuICAgIGxldCBoYXZlTm9uRGlyZWN0Q2FuZGlkYXRlcyA9IGZhbHNlXHJcbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnYT1jYW5kaWRhdGUnKSkge1xyXG4gICAgICAgIGhhdmVDYW5kaWRhdGVzID0gdHJ1ZVxyXG4gICAgICAgIGlmICghdGhpcy5pc0RpcmVjdENhbmRpZGF0ZShsaW5lKSkge1xyXG4gICAgICAgICAgcmV0LnB1c2gobGluZSlcclxuICAgICAgICAgIGhhdmVOb25EaXJlY3RDYW5kaWRhdGVzID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXQucHVzaChsaW5lKVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gb25seSByZW1vdmUgX2FsbF8gY2FuZGlkYXRlcyBpZiBpdHMgYSBmb3JjZWQgcmVxdWVzdFxyXG4gICAgaWYgKGhhdmVDYW5kaWRhdGVzICYmICFoYXZlTm9uRGlyZWN0Q2FuZGlkYXRlcyAmJiAhZm9yY2UpIHtcclxuICAgICAgdGhpcy5sb2dnZXIud2FybignU0RQIE5PIE9USEVSIENBTkRJREFURVMgVEhBTiBESVJFQ1QgQ0FORElEQVRFUycsIHNkcCwgbmV3IEVycm9yKCkuc3RhY2spXHJcbiAgICAgIHJldHVybiBzZHBcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaGF2ZUNhbmRpZGF0ZXMgJiYgIWhhdmVOb25EaXJlY3RDYW5kaWRhdGVzKSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdTRFAgRElSRUNUIENBTkRJREFURVMgRklMVEVSRUQgT1VUIEJVVCBOTyBPVEhFUiBDQU5ESURBVEVTIElOIFNEUCcsIHNkcCwgbmV3IEVycm9yKCkuc3RhY2spXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJldC5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nXHJcbiAgfVxyXG5cclxuICBpc0RpcmVjdENhbmRpZGF0ZSAoY2FuZGlkYXRlTGluZSkge1xyXG4gICAgY29uc3QgY2FuZGlkYXRlID0gU0RQVXRpbHMucGFyc2VDYW5kaWRhdGUoY2FuZGlkYXRlTGluZSlcclxuICAgIHJldHVybiBjYW5kaWRhdGUudHlwZSA9PT0gJ2hvc3QnIHx8IGNhbmRpZGF0ZS50eXBlID09PSAnc3JmbHgnIHx8IGNhbmRpZGF0ZS50Y3BUeXBlID09PSAnaG9zdCcgfHwgY2FuZGlkYXRlLnRjcFR5cGUgPT09ICdzcmZseCdcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2RwSGVscGVyXHJcbiIsImNvbnN0IEphbnVzUGx1Z2luID0gcmVxdWlyZSgnLi4vSmFudXNQbHVnaW4nKTtcclxuXHJcbmNsYXNzIExlYXZlQ2FwYWJpbGl0eSBleHRlbmRzIEphbnVzUGx1Z2luIHtcclxuICBjb25zdHJ1Y3RvciAobG9nZ2VyKSB7XHJcbiAgICBzdXBlcihsb2dnZXIpO1xyXG4gIH1cclxuXHJcbiAgbGVhdmVSb29tKCkge1xyXG4gICAgY29uc29sZS5sb2coXCJMZWF2aW5nIHRoZSByb29tXCIpO1xyXG5cclxuICAgIGNvbnN0IGJvZHkgPSB7IHJlcXVlc3Q6ICdsZWF2ZScgfTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbignbWVzc2FnZScsIHsgYm9keSB9LCAnZXZlbnQnKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMZWF2ZUNhcGFiaWxpdHk7IiwiY29uc3QgYWRhcHRlciA9IHJlcXVpcmUoJ3dlYnJ0Yy1hZGFwdGVyJyk7XHJcblxyXG5jb25zdCBWaWRlb1Jvb21QdWJsaXNoZXIgPSByZXF1aXJlKCcuL1ZpZGVvUm9vbVB1Ymxpc2hlcicpO1xyXG5jb25zdCBWaWRlb1Jvb21TdWJzY3JpYmVyID0gcmVxdWlyZSgnLi9WaWRlb1Jvb21TdWJzY3JpYmVyJyk7XHJcblxyXG5jb25zdCBKYW51c1BsdWdpbiA9IHJlcXVpcmUoJy4uL0phbnVzUGx1Z2luJyk7XHJcbmNvbnN0IFNkcEhlbHBlciA9IHJlcXVpcmUoJy4uL1NkcEhlbHBlcicpO1xyXG5cclxuY2xhc3MgVmlkZW9Sb29tIGV4dGVuZHMgSmFudXNQbHVnaW4ge1xyXG4gIGNvbnN0cnVjdG9yIChsb2dnZXIsIGljZUNvbmZpZywgZmlsdGVyRGlyZWN0Q2FuZGlkYXRlcykge1xyXG4gICAgc3VwZXIobG9nZ2VyKTtcclxuICAgIHRoaXMucGx1Z2luTmFtZSA9ICdqYW51cy5wbHVnaW4udmlkZW9yb29tJztcclxuXHJcbiAgICB0aGlzLmljZUNvbmZpZyA9IGljZUNvbmZpZztcclxuICAgIHRoaXMuZmlsdGVyRGlyZWN0Q2FuZGlkYXRlcyA9ICEhZmlsdGVyRGlyZWN0Q2FuZGlkYXRlcztcclxuXHJcbiAgICB0aGlzLnNkcEhlbHBlciA9IG5ldyBTZHBIZWxwZXIodGhpcy5sb2dnZXIpO1xyXG4gIH1cclxuXHJcbiAgbGlzdFJvb21zICgpIHtcclxuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uKCdtZXNzYWdlJywgeyBib2R5OiB7IHJlcXVlc3Q6ICdsaXN0JyB9IH0sICdzdWNjZXNzJykudGhlbigocGFyYW0pID0+IHtcclxuICAgICAgY29uc3QgeyBkYXRhIH0gPSBwYXJhbSB8fCB7fTtcclxuICAgICAgaWYgKCFkYXRhIHx8ICFBcnJheS5pc0FycmF5KGRhdGEubGlzdCkpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tLCBjb3VsZCBub3QgZmluZCByb29tcyBsaXN0JywgZGF0YSk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWaWRlb1Jvb20sIGNvdWxkIG5vdCBmaW5kIHJvb21zIGxpc3QnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIGRhdGEubGlzdDtcclxuICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xyXG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tLCBjYW5ub3QgbGlzdCByb29tcycsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgLy90b2RvOiBsaXN0IHBhcnRpY2lwYW50c1xyXG5cclxuICBjcmVhdGVQdWJsaXNoZXIgKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuamFudXMuYWRkUGx1Z2luKG5ldyBWaWRlb1Jvb21QdWJsaXNoZXIodGhpcy5sb2dnZXIpKVxyXG4gICAgICAudGhlbigocHVibGlzaGVyKSA9PiB7XHJcbiAgICAgICAgcHVibGlzaGVyLmluaXRpYWxpemUodGhpcy5jcmVhdGVQZWVyQ29ubmVjdGlvbihwdWJsaXNoZXIpKTtcclxuICAgICAgICByZXR1cm4gcHVibGlzaGVyO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIGNyZWF0ZVN1YnNjcmliZXIgKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuamFudXMuYWRkUGx1Z2luKG5ldyBWaWRlb1Jvb21TdWJzY3JpYmVyKHRoaXMubG9nZ2VyKSlcclxuICAgICAgLnRoZW4oKHN1YnNjcmliZXIpID0+IHtcclxuICAgICAgICBzdWJzY3JpYmVyLmluaXRpYWxpemUodGhpcy5jcmVhdGVQZWVyQ29ubmVjdGlvbihzdWJzY3JpYmVyKSk7XHJcbiAgICAgICAgcmV0dXJuIHN1YnNjcmliZXI7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlUGVlckNvbm5lY3Rpb24gKHBsdWdpbikge1xyXG4gICAgY29uc3QgcGVlckNvbm5lY3Rpb24gPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24odGhpcy5pY2VDb25maWcpO1xyXG4gICAgcGVlckNvbm5lY3Rpb24ub25pY2VjYW5kaWRhdGUgPSB0aGlzLm9uSWNlQ2FuZGlkYXRlKHBsdWdpbik7XHJcbiAgICByZXR1cm4gcGVlckNvbm5lY3Rpb247XHJcbiAgfVxyXG5cclxuICBzdWJtaXRDYW5kaWRhdGUgKHBsdWdpbiwgY2FuZGlkYXRlKSB7XHJcbiAgICBpZiAodGhpcy5maWx0ZXJEaXJlY3RDYW5kaWRhdGVzICYmIGNhbmRpZGF0ZS5jYW5kaWRhdGUgJiZcclxuICAgICAgdGhpcy5zZHBIZWxwZXIuaXNEaXJlY3RDYW5kaWRhdGUoY2FuZGlkYXRlLmNhbmRpZGF0ZSkpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwbHVnaW4udHJhbnNhY3Rpb24oJ3RyaWNrbGUnLCB7IGNhbmRpZGF0ZSB9KTtcclxuICB9XHJcblxyXG4gIG9uSWNlQ2FuZGlkYXRlKHBsdWdpbikge1xyXG4gICAgcmV0dXJuIChldmVudCkgPT4ge1xyXG4gICAgICBpZiAoIWV2ZW50LmNhbmRpZGF0ZSB8fCAhZXZlbnQuY2FuZGlkYXRlLmNhbmRpZGF0ZSkge1xyXG4gICAgICAgIHRoaXMuc3VibWl0Q2FuZGlkYXRlKHBsdWdpbiwge2NvbXBsZXRlZDogdHJ1ZX0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHtcclxuICAgICAgICAgIGNhbmRpZGF0ZTogZXZlbnQuY2FuZGlkYXRlLmNhbmRpZGF0ZSxcclxuICAgICAgICAgIHNkcE1pZDogZXZlbnQuY2FuZGlkYXRlLnNkcE1pZCxcclxuICAgICAgICAgIHNkcE1MaW5lSW5kZXg6IGV2ZW50LmNhbmRpZGF0ZS5zZHBNTGluZUluZGV4XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc3VibWl0Q2FuZGlkYXRlKHBsdWdpbiwgY2FuZGlkYXRlKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmlkZW9Sb29tO1xyXG4iLCJjb25zdCBKYW51c1BsdWdpbiA9IHJlcXVpcmUoJy4uL0phbnVzUGx1Z2luJyk7XHJcblxyXG5jbGFzcyBWaWRlb1Jvb21BZG1pbiBleHRlbmRzIEphbnVzUGx1Z2luIHtcclxuICBjb25zdHJ1Y3RvciAoY29uZmlnLCBsb2dnZXIpIHtcclxuICAgIGlmICghY29uZmlnKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcigndW5rbm93biBjb25maWcnKTtcclxuICAgIH1cclxuXHJcbiAgICBzdXBlcihsb2dnZXIpO1xyXG4gICAgdGhpcy5wbHVnaW5OYW1lID0gJ2phbnVzLnBsdWdpbi52aWRlb3Jvb20nO1xyXG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVSb29tIChkZXNjcmlwdGlvbiwgaGlkZGVuID0gZmFsc2UsIHJlY29yZGluZyA9IGZhbHNlLCBwaW4gPSBudWxsLCBzZWNyZXQgPSBudWxsKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIG5ldyByb29tOlwiKTtcclxuICAgIGNvbnNvbGUubG9nKGBcXHRkZXNjcmlwdGlvbj0ke2Rlc2NyaXB0aW9ufWApO1xyXG4gICAgY29uc29sZS5sb2coYFxcdGhpZGRlbj0ke2hpZGRlbn0sIHJlY29yZGluZz0ke3JlY29yZGluZ31gKTtcclxuICAgIGNvbnNvbGUubG9nKGBcXHRwaW49JHtwaW59LCBzZWNyZXQ9JHtzZWNyZXR9YCk7XHJcbiAgICBjb25zdCBib2R5ID0ge1xyXG4gICAgICByZXF1ZXN0OiBcImNyZWF0ZVwiLFxyXG4gICAgICBkZXNjcmlwdGlvbjogZGVzY3JpcHRpb24sXHJcbiAgICAgIHJlY29yZDogcmVjb3JkaW5nLFxyXG4gICAgICB2aWRlb2NvZGVjOiB0aGlzLmNvbmZpZy5jb2RlYyxcclxuICAgICAgcHVibGlzaGVyczogdGhpcy5jb25maWcucHVibGlzaGVycyxcclxuICAgICAgdmlkZW9vcmllbnRfZXh0OiB0aGlzLmNvbmZpZy52aWRlb09yaWVudEV4dFxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAocmVjb3JkaW5nKSB7XHJcbiAgICAgIGJvZHkucmVjX2RpciA9IHRoaXMuY29uZmlnLnJlY29yZERpcmVjdG9yeTtcclxuICAgIH1cclxuICAgIGlmIChoaWRkZW4pIHtcclxuICAgICAgYm9keS5pc19wcml2YXRlID0gaGlkZGVuO1xyXG4gICAgfVxyXG4gICAgaWYgKHNlY3JldCkge1xyXG4gICAgICAvL3Bhc3N3b3JkIHVzZWQgZm9yIG1vZGlmeWluZy9kZXN0cm95aW5nIHRoZSByb29tXHJcbiAgICAgIGJvZHkuc2VjcmV0ID0gc2VjcmV0O1xyXG4gICAgfVxyXG4gICAgaWYgKHBpbikge1xyXG4gICAgICAvL3Bhc3N3b3JkIHVzZWQgZm9yIGpvaW5pbmcgdGhlIHJvb21cclxuICAgICAgYm9keS5waW4gPSBwaW47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuY29uZmlnLmJpdHJhdGUpIHtcclxuICAgICAgYm9keS5iaXRyYXRlID0gdGhpcy5jb25maWcuYml0cmF0ZTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmNvbmZpZy5maXJTZWNvbmRzKSB7XHJcbiAgICAgIGJvZHkuZmlyX2ZyZXEgPSB0aGlzLmNvbmZpZy5maXJTZWNvbmRzO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uKCdtZXNzYWdlJywgeyBib2R5IH0sICdzdWNjZXNzJylcclxuICAgICAgLnRoZW4oKHBhcmFtKSA9PiB7XHJcbiAgICAgICAgY29uc3QgeyBkYXRhIH0gPSBwYXJhbSB8fCB7fVxyXG4gICAgICAgIGlmICghZGF0YSB8fCAhZGF0YS5yb29tKSB7XHJcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tSmFudXNQbHVnaW4sIGNvdWxkIG5vdCBjcmVhdGUgcm9vbScsIGRhdGEpO1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWaWRlb1Jvb21KYW51c1BsdWdpbiwgY291bGQgbm90IGNyZWF0ZSByb29tJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZGF0YS5yb29tO1xyXG4gICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tSmFudXNQbHVnaW4sIGNvdWxkIG5vdCBjcmVhdGUgcm9vbScsIGVycm9yKTtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfSlcclxuICB9XHJcblxyXG4gIGRlc3Ryb3lSb29tIChpZCwgc2VjcmV0ID0gbnVsbCkge1xyXG4gICAgY29uc29sZS5sb2coYERlc3Ryb3lpbmcgcm9vbSAke2lkfWApO1xyXG4gICAgY29uc3QgYm9keSA9IHtcclxuICAgICAgcmVxdWVzdDogXCJkZXN0cm95XCIsXHJcbiAgICAgIHJvb206IGlkLFxyXG4gICAgICBzZWNyZXQ6IHNlY3JldFxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbignbWVzc2FnZScsIHsgYm9keSB9LCAnc3VjY2VzcycpXHJcbiAgICAgIC50aGVuKChwYXJhbSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gcGFyYW0gfHwge31cclxuICAgICAgICBpZiAoIWRhdGEgfHwgIWRhdGEucm9vbSkge1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbUphbnVzUGx1Z2luLCBjb3VsZCBub3QgZGVzdHJveSByb29tJywgZGF0YSk7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZGVvUm9vbUphbnVzUGx1Z2luLCBjb3VsZCBub3QgZGVzdHJveSByb29tJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZGF0YS5yb29tO1xyXG4gICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tSmFudXNQbHVnaW4sIGNvdWxkIG5vdCBkZXN0cm95IHJvb20nLCBlcnJvcik7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvUm9vbUFkbWluO1xyXG4iLCJjb25zdCBMZWF2ZUNhcGFiaWxpdHkgPSByZXF1aXJlKCcuL0xlYXZlQ2FwYWJpbGl0eScpO1xyXG5cclxuY2xhc3MgVmlkZW9Sb29tUHVibGlzaGVyIGV4dGVuZHMgTGVhdmVDYXBhYmlsaXR5IHtcclxuICBjb25zdHJ1Y3RvciAobG9nZ2VyKSB7XHJcbiAgICBzdXBlcihsb2dnZXIpO1xyXG4gICAgdGhpcy5wbHVnaW5OYW1lID0gJ2phbnVzLnBsdWdpbi52aWRlb3Jvb20nO1xyXG5cclxuICAgIHRoaXMucm9vbUlkID0gdW5kZWZpbmVkO1xyXG4gICAgdGhpcy5tZW1iZXJJZCA9IHVuZGVmaW5lZDtcclxuICAgIHRoaXMucHJpdmF0ZU1lbWJlcklkID0gdW5kZWZpbmVkO1xyXG5cclxuICAgIHRoaXMub2ZmZXJTZHAgPSB1bmRlZmluZWQ7XHJcbiAgICB0aGlzLmFuc3dlclNkcCA9IHVuZGVmaW5lZDtcclxuICB9XHJcblxyXG4gIGluaXRpYWxpemUgKHBlZXJDb25uZWN0aW9uKSB7XHJcbiAgICB0aGlzLnBlZXJDb25uZWN0aW9uID0gcGVlckNvbm5lY3Rpb247XHJcbiAgfVxyXG4gIFxyXG4gIGpvaW5Sb29tQW5kUHVibGlzaCAocm9vbUlkLCBkaXNwbGF5TmFtZSwgcm9vbVBpbiA9IG51bGwsXHJcbiAgICAgIGF1ZGlvID0gdHJ1ZSwgdmlkZW8gPSB0cnVlLCBkYXRhID0gdHJ1ZSkge1xyXG4gICAgY29uc29sZS5sb2coYENvbm5lY3RpbmcgdG8gdGhlIHJvb20gJHtyb29tSWR9YCk7XHJcbiAgICB0aGlzLnJvb21JZCA9IHJvb21JZDtcclxuXHJcbiAgICBjb25zdCBib2R5ID0ge1xyXG4gICAgICByZXF1ZXN0OiAnam9pbmFuZGNvbmZpZ3VyZScsXHJcbiAgICAgIHJvb206IHRoaXMucm9vbUlkLFxyXG4gICAgICBwdHlwZTogJ3B1Ymxpc2hlcicsXHJcbiAgICAgIGRpc3BsYXk6IGRpc3BsYXlOYW1lLFxyXG4gICAgICBhdWRpbzogYXVkaW8sXHJcbiAgICAgIHZpZGVvOiB2aWRlbyxcclxuICAgICAgZGF0YTogZGF0YSxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKHJvb21QaW4pIHtcclxuICAgICAgYm9keS5waW4gPSByb29tUGluO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiAoZGF0YSkge1xyXG4gICAgICAgIHRoaXMuZGF0YUNoYW5uZWwgPSB0aGlzLnBlZXJDb25uZWN0aW9uLmNyZWF0ZURhdGFDaGFubmVsKFwiSmFudXNEYXRhQ2hhbm5lbFwiLCB7IG9yZGVyZWQ6IGZhbHNlIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmRhdGFDaGFubmVsLm9ubWVzc2FnZSA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS53YXJuKFwiUmVjZWl2ZWQgYW4gdW5leHBlY3RlZCBtZXNzYWdlIG9uIGRhdGEgY2hhbm5lbFwiLCBldmVudCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbGV0IG9uRGF0YUNoYW5uZWxTdGF0ZUNoYW5nZSA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJSZWNlaXZlZCBzdGF0ZSBjaGFuZ2Ugb24gZGF0YSBjaGFubmVsXCIsIGV2ZW50KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuZGF0YUNoYW5uZWwub25vcGVuID0gb25EYXRhQ2hhbm5lbFN0YXRlQ2hhbmdlO1xyXG4gICAgICAgIHRoaXMuZGF0YUNoYW5uZWwub25jbG9zZSA9IG9uRGF0YUNoYW5uZWxTdGF0ZUNoYW5nZTtcclxuXHJcbiAgICAgICAgdGhpcy5kYXRhQ2hhbm5lbC5vbmVycm9yID0gKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiR290IGFuIGVycm9yIG9uIGRhdGEgY2hhbm5lbFwiLCBlcnJvcik7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcy5wZWVyQ29ubmVjdGlvbi5jcmVhdGVPZmZlcih7fSlcclxuICAgICAgLnRoZW4oKG9mZmVyKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJTRFAgb2ZmZXIgaW5pdGlhbGl6ZWRcIik7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLnBlZXJDb25uZWN0aW9uLnNldExvY2FsRGVzY3JpcHRpb24ob2ZmZXIpXHJcbiAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbcHViXSBMb2NhbERlc2NyaXB0aW9uIHNldCcsIG9mZmVyKTtcclxuICAgICAgICAgICAgY29uc3QganNlcCA9IG9mZmVyO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5maWx0ZXJEaXJlY3RDYW5kaWRhdGVzICYmIGpzZXAuc2RwKSB7XHJcbiAgICAgICAgICAgICAganNlcC5zZHAgPSB0aGlzLnNkcEhlbHBlci5maWx0ZXJEaXJlY3RDYW5kaWRhdGVzKGpzZXAuc2RwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLm9mZmVyU2RwID0ganNlcC5zZHA7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbignbWVzc2FnZScsIHsgYm9keSwganNlcCB9LCAnZXZlbnQnKVxyXG4gICAgICAgICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHsgZGF0YSwganNvbiB9ID0gcmVzcG9uc2UgfHwge307XHJcbiAgICAgICAgICAgICAgICBpZiAoIWRhdGEgfHwgIWRhdGEuaWQgfHwgIWRhdGEucHJpdmF0ZV9pZCB8fCAhZGF0YS5wdWJsaXNoZXJzKSB7XHJcbiAgICAgICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWaWRlb1Jvb20sIGNvdWxkIG5vdCBqb2luIHJvb20nLCBkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWaWRlb1Jvb20sIGNvdWxkIG5vdCBqb2luIHJvb20nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICghanNvbi5qc2VwKSB7XHJcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTGFja2luZyBKU0VQIGZpZWxkIGluIHJlc3BvbnNlJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5tZW1iZXJJZCA9IGRhdGEuaWQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXlOYW1lID0gZGlzcGxheU5hbWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnByaXZhdGVNZW1iZXJJZCA9IGRhdGEucHJpdmF0ZV9pZDtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBqc2VwID0ganNvbi5qc2VwO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZmlsdGVyRGlyZWN0Q2FuZGlkYXRlcyAmJiBqc2VwLnNkcCkge1xyXG4gICAgICAgICAgICAgICAgICBqc2VwLnNkcCA9IHRoaXMuc2RwSGVscGVyLmZpbHRlckRpcmVjdENhbmRpZGF0ZXMoanNlcC5zZHApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5hbnN3ZXJTZHAgPSBqc2VwLnNkcDtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wZWVyQ29ubmVjdGlvbi5zZXRSZW1vdGVEZXNjcmlwdGlvbihqc2VwKVxyXG4gICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJbcHViXSBSZW1vdGVEZXNjcmlwdGlvbiBzZXRcIiwganNlcCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9PbiA9IGF1ZGlvO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlkZW9PbiA9IHZpZGVvO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLnB1Ymxpc2hlcnM7XHJcbiAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tLCBlcnJvciBjb25uZWN0aW5nIHRvIHJvb20nLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KVxyXG4gIH1cclxuXHJcbiAgbW9kaWZ5UHVibGlzaGluZyAoYXVkaW8gPSB0cnVlLCB2aWRlbyA9IHRydWUsIGRhdGEgPSB0cnVlKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgTW9kaWZ5aW5nIHB1Ymxpc2hpbmcgZm9yIG1lbWJlciAke3RoaXMubWVtYmVySWR9IGluIHJvb20gJHt0aGlzLnJvb21JZH1gKTtcclxuXHJcbiAgICBsZXQgY29uZmlndXJlID0ge1xyXG4gICAgICByZXF1ZXN0OiAnY29uZmlndXJlJyxcclxuICAgICAgdmlkZW86IHZpZGVvLFxyXG4gICAgICBhdWRpbzogYXVkaW8sXHJcbiAgICAgIGRhdGE6IGRhdGFcclxuICAgIH07XHJcbiAgICBpZiAodGhpcy5yb29tUGluKSB7XHJcbiAgICAgIGNvbmZpZ3VyZS5waW4gPSB0aGlzLnJvb21QaW47XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMudHJhbnNhY3Rpb24oXCJtZXNzYWdlXCIsIHsgYm9keTogY29uZmlndXJlIH0sIFwiZXZlbnRcIilcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgY29uc3QgeyBkYXRhLCBqc29uIH0gPSByZXNwb25zZSB8fCB7fTtcclxuXHJcbiAgICAgICAgaWYgKCFkYXRhIHx8IGRhdGEuY29uZmlndXJlZCAhPT0gXCJva1wiKSB7XHJcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcIlZpZGVvUm9vbSBjb25maWd1cmUgYW5zd2VyIGlzIG5vdCBcXFwib2tcXFwiXCIsIGRhdGEsIGpzb24pO1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmlkZW9Sb29tIGNvbmZpZ3VyZSBhbnN3ZXIgaXMgbm90IFxcXCJva1xcXCJcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhcIlB1Ymxpc2hpbmcgbW9kaWZpZWRcIiwgcmVzcG9uc2UpO1xyXG4gICAgICAgIHRoaXMuYXVkaW9PbiA9IGF1ZGlvO1xyXG4gICAgICAgIHRoaXMudmlkZW9PbiA9IHZpZGVvO1xyXG4gICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcIlZpZGVvUm9vbSwgdW5rbm93biBlcnJvciBtb2RpZnlpbmcgcHVibGlzaGluZ1wiLCBlcnJvciwgY29uZmlndXJlKTtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICBzZW5kRGF0YSAobWVzc2FnZSl7XHJcbiAgICBpZiAodGhpcy5kYXRhQ2hhbm5lbCkge1xyXG4gICAgICBjb25zb2xlLmxvZyhcIlNlbmRpbmcgc29tZSBkYXRhIFwiLCBtZXNzYWdlKTtcclxuICAgICAgdGhpcy5kYXRhQ2hhbm5lbC5zZW5kKG1lc3NhZ2UpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIGRhdGEgb3ZlciB0aGUgRGF0YUNoYW5uZWxcIiwgdGhpcy5kYXRhQ2hhbm5lbCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdG9wQXVkaW8gKCkge1xyXG4gICAgaWYgKHRoaXMuYXVkaW9Pbikge1xyXG4gICAgICBjb25zb2xlLmxvZyhcIlN0b3BwaW5nIHB1Ymxpc2hlZCBhdWRpb1wiKTtcclxuICAgICAgcmV0dXJuIHRoaXMubW9kaWZ5UHVibGlzaGluZyhmYWxzZSwgdGhpcy52aWRlb09uKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBQdWJsaXNoZWQgYXVkaW8gaXMgYWxyZWFkeSB0dXJuZWQgb2ZmYCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGFydEF1ZGlvICgpIHtcclxuICAgIGlmICghdGhpcy5hdWRpb09uKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiU3RhcnRpbmcgcHVibGlzaGVkIGF1ZGlvXCIpO1xyXG4gICAgICByZXR1cm4gdGhpcy5tb2RpZnlQdWJsaXNoaW5nKHRydWUsIHRoaXMudmlkZW9Pbik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmxvZyhgUHVibGlzaGVkIGF1ZGlvIGlzIGFscmVhZHkgdHVybmVkIG9uYCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdG9wVmlkZW8gKCkge1xyXG4gICAgaWYgKHRoaXMudmlkZW9Pbikge1xyXG4gICAgICBjb25zb2xlLmxvZyhcIlN0b3BwaW5nIHB1Ymxpc2hlZCB2aWRlb1wiKTtcclxuICAgICAgcmV0dXJuIHRoaXMubW9kaWZ5UHVibGlzaGluZyh0aGlzLmF1ZGlvT24sIGZhbHNlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBQdWJsaXNoZWQgdmlkZW8gaXMgYWxyZWFkeSB0dXJuZWQgb2ZmYCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGFydFZpZGVvICgpIHtcclxuICAgIGlmICghdGhpcy52aWRlb09uKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiU3RhcnRpbmcgcHVibGlzaGVkIHZpZGVvXCIpO1xyXG4gICAgICByZXR1cm4gdGhpcy5tb2RpZnlQdWJsaXNoaW5nKHRoaXMuYXVkaW9PbiwgdHJ1ZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmxvZyhgVmlkZW8gb2YgcHVibGlzaGVyICR7dGhpcy5wdWJsaXNoZXJJZH0gaXMgYWxyZWFkeSB0dXJuZWQgb25gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIG9ubWVzc2FnZSAoZGF0YSwganNvbikge1xyXG4gICAgLy8gVE9ETyBkYXRhLnZpZGVvcm9vbSA9PT0gJ2Rlc3Ryb3llZCcgaGFuZGxpbmdcclxuICAgIC8vIFRPRE8gdW5wdWJsaXNoZWQgPT09ICdvaycgaGFuZGxpbmcgOiB3ZSBhcmUgdW5wdWJsaXNoZWRcclxuXHJcbiAgICBjb25zdCB7IHZpZGVvcm9vbSB9ID0gZGF0YSB8fCB7fTtcclxuXHJcbiAgICBpZiAoIWRhdGEgfHwgIXZpZGVvcm9vbSkge1xyXG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tIGdvdCB1bmtub3duIG1lc3NhZ2UnLCBqc29uKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh2aWRlb3Jvb20gPT09ICdzbG93X2xpbmsnKSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdWaWRlb1Jvb20gZ290IHNsb3dfbGluaycsIGRhdGEpO1xyXG4gICAgICB0aGlzLnNsb3dMaW5rKCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodmlkZW9yb29tID09PSAnZXZlbnQnKSB7XHJcbiAgICAgIGNvbnN0IHsgcm9vbSwgam9pbmluZywgdW5wdWJsaXNoZWQsIGxlYXZpbmcsIHB1Ymxpc2hlcnMgfSA9IGRhdGE7XHJcbiAgICAgIGlmIChyb29tICE9PSB0aGlzLnJvb21JZCkge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWaWRlb1Jvb20gZ290IHVua25vd24gcm9vbUlkJywgdGhpcy5yb29tSWQsIGpzb24pO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGpvaW5pbmcpIHtcclxuICAgICAgICB0aGlzLmVtaXQoJ3JlbW90ZU1lbWJlckpvaW5lZCcsIGpvaW5pbmcpO1xyXG4gICAgICB9IGVsc2UgaWYgKHVucHVibGlzaGVkKSB7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdyZW1vdGVNZW1iZXJVbnB1Ymxpc2hlZCcsIHVucHVibGlzaGVkKTtcclxuICAgICAgfSBlbHNlIGlmIChsZWF2aW5nKSB7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdyZW1vdGVNZW1iZXJMZWF2aW5nJywgbGVhdmluZyk7XHJcbiAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShwdWJsaXNoZXJzKSkge1xyXG4gICAgICAgIHRoaXMuZW1pdCgncHVibGlzaGVyc1VwZGF0ZWQnLCBwdWJsaXNoZXJzKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tIGdvdCB1bmtub3duIGV2ZW50JywganNvbik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tIHVuaGFuZGxlZCBtZXNzYWdlOicsIHZpZGVvcm9vbSwganNvbik7XHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvUm9vbVB1Ymxpc2hlcjtcclxuIiwiY29uc3QgTGVhdmVDYXBhYmlsaXR5ID0gcmVxdWlyZSgnLi9MZWF2ZUNhcGFiaWxpdHknKTtcclxuXHJcbmNsYXNzIFZpZGVvUm9vbVN1YnNjcmliZXIgZXh0ZW5kcyBMZWF2ZUNhcGFiaWxpdHkge1xyXG4gIGNvbnN0cnVjdG9yIChsb2dnZXIpIHtcclxuICAgIHN1cGVyKGxvZ2dlcik7XHJcbiAgICB0aGlzLnBsdWdpbk5hbWUgPSBcImphbnVzLnBsdWdpbi52aWRlb3Jvb21cIjtcclxuICB9XHJcblxyXG4gIGluaXRpYWxpemUgKHBlZXJDb25uZWN0aW9uKSB7XHJcbiAgICB0aGlzLnBlZXJDb25uZWN0aW9uID0gcGVlckNvbm5lY3Rpb247XHJcbiAgfVxyXG5cclxuICBqb2luUm9vbUFuZFN1YnNjcmliZSAocm9vbUlkLCBwdWJsaXNoZXJJZCwgcm9vbVBpbiA9IG51bGwsIHByaXZhdGVQdWJsaXNoZXJJZCA9IG51bGwsXHJcbiAgICAgIGF1ZGlvID0gdHJ1ZSwgdmlkZW8gPSB0cnVlLCBkYXRhID0gdHJ1ZSkge1xyXG4gICAgY29uc29sZS5sb2coYFN1YnNjcmliaW5nIHRvIG1lbWJlciAke3B1Ymxpc2hlcklkfSBpbiByb29tICR7cm9vbUlkfWApO1xyXG5cclxuICAgIHRoaXMucm9vbUlkID0gcm9vbUlkO1xyXG4gICAgdGhpcy5yb29tUGluID0gcm9vbVBpbjtcclxuICAgIHRoaXMucHVibGlzaGVySWQgPSBwdWJsaXNoZXJJZDtcclxuICAgIHRoaXMucHJpdmF0ZVB1Ymxpc2hlcklkID0gcHJpdmF0ZVB1Ymxpc2hlcklkO1xyXG4gICAgdGhpcy5hdWRpbyA9IGF1ZGlvO1xyXG4gICAgdGhpcy52aWRlbyA9IHZpZGVvO1xyXG5cclxuICAgIGxldCBqb2luID0ge1xyXG4gICAgICByZXF1ZXN0OiBcImpvaW5cIixcclxuICAgICAgcHR5cGU6IFwic3Vic2NyaWJlclwiLFxyXG4gICAgICBmZWVkOiBwdWJsaXNoZXJJZCxcclxuICAgICAgcm9vbTogcm9vbUlkLFxyXG4gICAgICBhdWRpbzogYXVkaW8sXHJcbiAgICAgIHZpZGVvOiB2aWRlbyxcclxuICAgICAgZGF0YTogZGF0YSxcclxuICAgICAgb2ZmZXJfdmlkZW86IHZpZGVvLFxyXG4gICAgICBvZmZlcl9hdWRpbzogYXVkaW8sXHJcbiAgICAgIG9mZmVyX2RhdGE6IGRhdGFcclxuICAgIH07XHJcblxyXG4gICAgaWYgKHJvb21QaW4pIHtcclxuICAgICAgam9pbi5waW4gPSByb29tUGluO1xyXG4gICAgfVxyXG4gICAgaWYgKHByaXZhdGVQdWJsaXNoZXJJZCkge1xyXG4gICAgICBqb2luLnByaXZhdGVfaWQgPSBwcml2YXRlUHVibGlzaGVySWQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGRhdGEpIHtcclxuICAgICAgdGhpcy5kYXRhQ2hhbm5lbCA9IHRoaXMucGVlckNvbm5lY3Rpb24uY3JlYXRlRGF0YUNoYW5uZWwoXCJKYW51c0RhdGFDaGFubmVsXCIsIHtvcmRlcmVkOmZhbHNlfSk7XHJcblxyXG4gICAgICBsZXQgb25EYXRhQ2hhbm5lbE1lc3NhZ2UgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY2VpdmVkIGEgbWVzc2FnZSBvbiBkYXRhIGNoYW5uZWxcIiwgZXZlbnQpO1xyXG4gICAgICAgIHRoaXMuZW1pdCgnZGF0YU1lc3NhZ2UnLGV2ZW50LmRhdGEpO1xyXG4gICAgICB9O1xyXG4gICAgICB0aGlzLmRhdGFDaGFubmVsLm9ubWVzc2FnZSA9IG9uRGF0YUNoYW5uZWxNZXNzYWdlLmJpbmQodGhpcyk7XHJcblxyXG4gICAgICBsZXQgb25EYXRhQ2hhbm5lbFN0YXRlQ2hhbmdlID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNlaXZlZCBzdGF0ZSBjaGFuZ2Ugb24gZGF0YSBjaGFubmVsXCIsIGV2ZW50KTtcclxuICAgICAgfTtcclxuICAgICAgdGhpcy5kYXRhQ2hhbm5lbC5vbm9wZW4gPSBvbkRhdGFDaGFubmVsU3RhdGVDaGFuZ2U7XHJcbiAgICAgIHRoaXMuZGF0YUNoYW5uZWwub25jbG9zZSA9IG9uRGF0YUNoYW5uZWxTdGF0ZUNoYW5nZTtcclxuXHJcbiAgICAgIHRoaXMuZGF0YUNoYW5uZWwub25lcnJvciA9IChlcnJvcikgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJHb3QgYW4gZXJyb3Igb24gZGF0YSBjaGFubmVsXCIsIGVycm9yKTtcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbihcIm1lc3NhZ2VcIiwgeyBib2R5OiBqb2luIH0sIFwiZXZlbnRcIilcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgY29uc3QgeyBkYXRhLCBqc29uIH0gPSByZXNwb25zZSB8fCB7fTtcclxuXHJcbiAgICAgICAgaWYgKCFkYXRhIHx8IGRhdGEudmlkZW9yb29tICE9PSBcImF0dGFjaGVkXCIpIHtcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFwiVmlkZW9Sb29tIGpvaW4gYW5zd2VyIGlzIG5vdCBcXFwiYXR0YWNoZWRcXFwiXCIsIGRhdGEsIGpzb24pO1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmlkZW9Sb29tIGpvaW4gYW5zd2VyIGlzIG5vdCBcXFwiYXR0YWNoZWRcXFwiXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWpzb24uanNlcCkge1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXCJWaWRlb1Jvb20gam9pbiBhbnN3ZXIgZG9lcyBub3QgY29udGFpbnMganNlcFwiLCBkYXRhLCBqc29uKTtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZpZGVvUm9vbSBqb2luIGFuc3dlciBkb2VzIG5vdCBjb250YWlucyBqc2VwXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QganNlcCA9IGpzb24uanNlcDtcclxuICAgICAgICBpZiAodGhpcy5maWx0ZXJEaXJlY3RDYW5kaWRhdGVzICYmIGpzZXAuc2RwKSB7XHJcbiAgICAgICAgICBqc2VwLnNkcCA9IHRoaXMuc2RwSGVscGVyLmZpbHRlckRpcmVjdENhbmRpZGF0ZXMoanNlcC5zZHApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMucGVlckNvbm5lY3Rpb24uc2V0UmVtb3RlRGVzY3JpcHRpb24oanNlcClcclxuICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJbc3ViXSBSZW1vdGVEZXNjcmlwdGlvbiBzZXRcIiwganNlcCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBlZXJDb25uZWN0aW9uLmNyZWF0ZUFuc3dlcih7IG9mZmVyVG9SZWNlaXZlQXVkaW86IHRydWUsIG9mZmVyVG9SZWNlaXZlVmlkZW86IHRydWUgfSlcclxuICAgICAgICAgICAgICAudGhlbigoYW5zd2VyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wZWVyQ29ubmVjdGlvbi5zZXRMb2NhbERlc2NyaXB0aW9uKGFuc3dlcilcclxuICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW3N1Yl0gTG9jYWxEZXNjcmlwdGlvbiBzZXRcIiwgYW5zd2VyKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QganNlcCA9IGFuc3dlcjtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0geyByZXF1ZXN0OiAnc3RhcnQnLCByb29tOiB0aGlzLnJvb21JZCB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uKCdtZXNzYWdlJywgeyBib2R5LCBqc2VwIH0sICdldmVudCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBkYXRhLCBqc29uIH0gPSByZXNwb25zZSB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YSB8fCBkYXRhLnN0YXJ0ZWQgIT09ICdvaycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tLCBjb3VsZCBub3Qgc3RhcnQgYSBzdHJlYW0nLCBkYXRhLCBqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZGVvUm9vbSwgY291bGQgbm90IHN0YXJ0IGEgc3RyZWFtJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9PbiA9IGF1ZGlvO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZGVvT24gPSB2aWRlbztcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbSwgdW5rbm93biBlcnJvciBzZW5kaW5nIGFuc3dlcicsIGVycm9yLCBqc2VwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbSwgdW5rbm93biBlcnJvciBjb25uZWN0aW5nIHRvIHJvb20nLCBlcnJvciwgam9pbik7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgbW9kaWZ5U3Vic2NyaXB0aW9uIChhdWRpbyA9IHRydWUsIHZpZGVvID0gdHJ1ZSwgZGF0YSA9IHRydWUpIHtcclxuICAgIGNvbnNvbGUubG9nKGBNb2RpZnlpbmcgc3Vic2NyaXB0aW9uIHRvIG1lbWJlciAke3RoaXMucHVibGlzaGVySWR9IGluIHJvb20gJHt0aGlzLnJvb21JZH1gKTtcclxuXHJcbiAgICBsZXQgY29uZmlndXJlID0ge1xyXG4gICAgICByZXF1ZXN0OiAnY29uZmlndXJlJyxcclxuICAgICAgcHR5cGU6ICdzdWJzY3JpYmVyJyxcclxuICAgICAgZmVlZDogdGhpcy5wdWJsaXNoZXJJZCxcclxuICAgICAgcm9vbTogdGhpcy5yb29tSWQsXHJcbiAgICAgIHZpZGVvOiB2aWRlbyxcclxuICAgICAgYXVkaW86IGF1ZGlvLFxyXG4gICAgICBkYXRhOiBkYXRhLFxyXG4gICAgICBvZmZlcl92aWRlbzogdmlkZW8sXHJcbiAgICAgIG9mZmVyX2F1ZGlvOiBhdWRpbyxcclxuICAgICAgb2ZmZXJfZGF0YTogZGF0YVxyXG4gICAgfTtcclxuICAgIGlmICh0aGlzLnJvb21QaW4pIHtcclxuICAgICAgY29uZmlndXJlLnBpbiA9IHRoaXMucm9vbVBpbjtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLnByaXZhdGVQdWJsaXNoZXJJZCkge1xyXG4gICAgICBjb25maWd1cmUucHJpdmF0ZV9pZCA9IHRoaXMucHJpdmF0ZVB1Ymxpc2hlcklkO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uKFwibWVzc2FnZVwiLCB7IGJvZHk6IGNvbmZpZ3VyZSB9LCBcImV2ZW50XCIpXHJcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHsgZGF0YSwganNvbiB9ID0gcmVzcG9uc2UgfHwge307XHJcblxyXG4gICAgICAgIGlmICghZGF0YSB8fCBkYXRhLmNvbmZpZ3VyZWQgIT09IFwib2tcIikge1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXCJWaWRlb1Jvb20gY29uZmlndXJlIGFuc3dlciBpcyBub3QgXFxcIm9rXFxcIlwiLCBkYXRhLCBqc29uKTtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZpZGVvUm9vbSBjb25maWd1cmUgYW5zd2VyIGlzIG5vdCBcXFwib2tcXFwiXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zb2xlLmxvZyhcIlN1YnNjcmlwdGlvbiBtb2RpZmllZFwiLCByZXNwb25zZSk7XHJcblxyXG4gICAgICAgIHRoaXMuYXVkaW9PbiA9IGF1ZGlvO1xyXG4gICAgICAgIHRoaXMudmlkZW9PbiA9IHZpZGVvO1xyXG4gICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcIlZpZGVvUm9vbSwgdW5rbm93biBlcnJvciBtb2RpZnlpbmcgc3Vic2NyaXB0aW9uXCIsIGVycm9yLCBjb25maWd1cmUpO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIHN0b3BBdWRpbyAoKSB7XHJcbiAgICBpZiAodGhpcy5hdWRpb09uKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBTdG9wcGluZyBhdWRpbyBvZiBwdWJsaXNoZXIgJHt0aGlzLnB1Ymxpc2hlcklkfWApO1xyXG4gICAgICByZXR1cm4gdGhpcy5tb2RpZnlTdWJzY3JpcHRpb24oZmFsc2UsIHRoaXMudmlkZW9Pbik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmxvZyhgQXVkaW8gb2YgcHVibGlzaGVyICR7dGhpcy5wdWJsaXNoZXJJZH0gaXMgYWxyZWFkeSB0dXJuZWQgb2ZmYCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGFydEF1ZGlvICgpIHtcclxuICAgIGlmICghdGhpcy5hdWRpb09uKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBTdGFydGluZyBhdWRpbyBvZiBwdWJsaXNoZXIgJHt0aGlzLnB1Ymxpc2hlcklkfWApO1xyXG4gICAgICByZXR1cm4gdGhpcy5tb2RpZnlTdWJzY3JpcHRpb24odHJ1ZSwgdGhpcy52aWRlb09uKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBBdWRpbyBvZiBwdWJsaXNoZXIgJHt0aGlzLnB1Ymxpc2hlcklkfSBpcyBhbHJlYWR5IHR1cm5lZCBvbmApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RvcFZpZGVvICgpIHtcclxuICAgIGlmICh0aGlzLnZpZGVvT24pIHtcclxuICAgICAgY29uc29sZS5sb2coYFN0b3BwaW5nIHZpZGVvIG9mIHB1Ymxpc2hlciAke3RoaXMucHVibGlzaGVySWR9YCk7XHJcbiAgICAgIHJldHVybiB0aGlzLm1vZGlmeVN1YnNjcmlwdGlvbih0aGlzLmF1ZGlvT24sIGZhbHNlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBWaWRlbyBvZiBwdWJsaXNoZXIgJHt0aGlzLnB1Ymxpc2hlcklkfSBpcyBhbHJlYWR5IHR1cm5lZCBvZmZgKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXJ0VmlkZW8gKCkge1xyXG4gICAgaWYgKCF0aGlzLnZpZGVvT24pIHtcclxuICAgICAgY29uc29sZS5sb2coYFN0YXJ0aW5nIHZpZGVvIG9mIHB1Ymxpc2hlciAke3RoaXMucHVibGlzaGVySWR9YCk7XHJcbiAgICAgIHJldHVybiB0aGlzLm1vZGlmeVN1YnNjcmlwdGlvbih0aGlzLmF1ZGlvT24sIHRydWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5sb2coYFZpZGVvIG9mIHB1Ymxpc2hlciAke3RoaXMucHVibGlzaGVySWR9IGlzIGFscmVhZHkgdHVybmVkIG9uYCk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvUm9vbVN1YnNjcmliZXI7XHJcbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuIC8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgU0RQVXRpbHMgPSByZXF1aXJlKCdzZHAnKTtcblxuZnVuY3Rpb24gZml4U3RhdHNUeXBlKHN0YXQpIHtcbiAgcmV0dXJuIHtcbiAgICBpbmJvdW5kcnRwOiAnaW5ib3VuZC1ydHAnLFxuICAgIG91dGJvdW5kcnRwOiAnb3V0Ym91bmQtcnRwJyxcbiAgICBjYW5kaWRhdGVwYWlyOiAnY2FuZGlkYXRlLXBhaXInLFxuICAgIGxvY2FsY2FuZGlkYXRlOiAnbG9jYWwtY2FuZGlkYXRlJyxcbiAgICByZW1vdGVjYW5kaWRhdGU6ICdyZW1vdGUtY2FuZGlkYXRlJ1xuICB9W3N0YXQudHlwZV0gfHwgc3RhdC50eXBlO1xufVxuXG5mdW5jdGlvbiB3cml0ZU1lZGlhU2VjdGlvbih0cmFuc2NlaXZlciwgY2FwcywgdHlwZSwgc3RyZWFtLCBkdGxzUm9sZSkge1xuICB2YXIgc2RwID0gU0RQVXRpbHMud3JpdGVSdHBEZXNjcmlwdGlvbih0cmFuc2NlaXZlci5raW5kLCBjYXBzKTtcblxuICAvLyBNYXAgSUNFIHBhcmFtZXRlcnMgKHVmcmFnLCBwd2QpIHRvIFNEUC5cbiAgc2RwICs9IFNEUFV0aWxzLndyaXRlSWNlUGFyYW1ldGVycyhcbiAgICAgIHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyLmdldExvY2FsUGFyYW1ldGVycygpKTtcblxuICAvLyBNYXAgRFRMUyBwYXJhbWV0ZXJzIHRvIFNEUC5cbiAgc2RwICs9IFNEUFV0aWxzLndyaXRlRHRsc1BhcmFtZXRlcnMoXG4gICAgICB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0LmdldExvY2FsUGFyYW1ldGVycygpLFxuICAgICAgdHlwZSA9PT0gJ29mZmVyJyA/ICdhY3RwYXNzJyA6IGR0bHNSb2xlIHx8ICdhY3RpdmUnKTtcblxuICBzZHAgKz0gJ2E9bWlkOicgKyB0cmFuc2NlaXZlci5taWQgKyAnXFxyXFxuJztcblxuICBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyICYmIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyKSB7XG4gICAgc2RwICs9ICdhPXNlbmRyZWN2XFxyXFxuJztcbiAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5ydHBTZW5kZXIpIHtcbiAgICBzZHAgKz0gJ2E9c2VuZG9ubHlcXHJcXG4nO1xuICB9IGVsc2UgaWYgKHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyKSB7XG4gICAgc2RwICs9ICdhPXJlY3Zvbmx5XFxyXFxuJztcbiAgfSBlbHNlIHtcbiAgICBzZHAgKz0gJ2E9aW5hY3RpdmVcXHJcXG4nO1xuICB9XG5cbiAgaWYgKHRyYW5zY2VpdmVyLnJ0cFNlbmRlcikge1xuICAgIHZhciB0cmFja0lkID0gdHJhbnNjZWl2ZXIucnRwU2VuZGVyLl9pbml0aWFsVHJhY2tJZCB8fFxuICAgICAgICB0cmFuc2NlaXZlci5ydHBTZW5kZXIudHJhY2suaWQ7XG4gICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyLl9pbml0aWFsVHJhY2tJZCA9IHRyYWNrSWQ7XG4gICAgLy8gc3BlYy5cbiAgICB2YXIgbXNpZCA9ICdtc2lkOicgKyAoc3RyZWFtID8gc3RyZWFtLmlkIDogJy0nKSArICcgJyArXG4gICAgICAgIHRyYWNrSWQgKyAnXFxyXFxuJztcbiAgICBzZHAgKz0gJ2E9JyArIG1zaWQ7XG4gICAgLy8gZm9yIENocm9tZS4gTGVnYWN5IHNob3VsZCBubyBsb25nZXIgYmUgcmVxdWlyZWQuXG4gICAgc2RwICs9ICdhPXNzcmM6JyArIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYyArXG4gICAgICAgICcgJyArIG1zaWQ7XG5cbiAgICAvLyBSVFhcbiAgICBpZiAodHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHgpIHtcbiAgICAgIHNkcCArPSAnYT1zc3JjOicgKyB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eC5zc3JjICtcbiAgICAgICAgICAnICcgKyBtc2lkO1xuICAgICAgc2RwICs9ICdhPXNzcmMtZ3JvdXA6RklEICcgK1xuICAgICAgICAgIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYyArICcgJyArXG4gICAgICAgICAgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHguc3NyYyArXG4gICAgICAgICAgJ1xcclxcbic7XG4gICAgfVxuICB9XG4gIC8vIEZJWE1FOiB0aGlzIHNob3VsZCBiZSB3cml0dGVuIGJ5IHdyaXRlUnRwRGVzY3JpcHRpb24uXG4gIHNkcCArPSAnYT1zc3JjOicgKyB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnNzcmMgK1xuICAgICAgJyBjbmFtZTonICsgU0RQVXRpbHMubG9jYWxDTmFtZSArICdcXHJcXG4nO1xuICBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyICYmIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4KSB7XG4gICAgc2RwICs9ICdhPXNzcmM6JyArIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4LnNzcmMgK1xuICAgICAgICAnIGNuYW1lOicgKyBTRFBVdGlscy5sb2NhbENOYW1lICsgJ1xcclxcbic7XG4gIH1cbiAgcmV0dXJuIHNkcDtcbn1cblxuLy8gRWRnZSBkb2VzIG5vdCBsaWtlXG4vLyAxKSBzdHVuOiBmaWx0ZXJlZCBhZnRlciAxNDM5MyB1bmxlc3MgP3RyYW5zcG9ydD11ZHAgaXMgcHJlc2VudFxuLy8gMikgdHVybjogdGhhdCBkb2VzIG5vdCBoYXZlIGFsbCBvZiB0dXJuOmhvc3Q6cG9ydD90cmFuc3BvcnQ9dWRwXG4vLyAzKSB0dXJuOiB3aXRoIGlwdjYgYWRkcmVzc2VzXG4vLyA0KSB0dXJuOiBvY2N1cnJpbmcgbXVsaXBsZSB0aW1lc1xuZnVuY3Rpb24gZmlsdGVySWNlU2VydmVycyhpY2VTZXJ2ZXJzLCBlZGdlVmVyc2lvbikge1xuICB2YXIgaGFzVHVybiA9IGZhbHNlO1xuICBpY2VTZXJ2ZXJzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShpY2VTZXJ2ZXJzKSk7XG4gIHJldHVybiBpY2VTZXJ2ZXJzLmZpbHRlcihmdW5jdGlvbihzZXJ2ZXIpIHtcbiAgICBpZiAoc2VydmVyICYmIChzZXJ2ZXIudXJscyB8fCBzZXJ2ZXIudXJsKSkge1xuICAgICAgdmFyIHVybHMgPSBzZXJ2ZXIudXJscyB8fCBzZXJ2ZXIudXJsO1xuICAgICAgaWYgKHNlcnZlci51cmwgJiYgIXNlcnZlci51cmxzKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignUlRDSWNlU2VydmVyLnVybCBpcyBkZXByZWNhdGVkISBVc2UgdXJscyBpbnN0ZWFkLicpO1xuICAgICAgfVxuICAgICAgdmFyIGlzU3RyaW5nID0gdHlwZW9mIHVybHMgPT09ICdzdHJpbmcnO1xuICAgICAgaWYgKGlzU3RyaW5nKSB7XG4gICAgICAgIHVybHMgPSBbdXJsc107XG4gICAgICB9XG4gICAgICB1cmxzID0gdXJscy5maWx0ZXIoZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIHZhciB2YWxpZFR1cm4gPSB1cmwuaW5kZXhPZigndHVybjonKSA9PT0gMCAmJlxuICAgICAgICAgICAgdXJsLmluZGV4T2YoJ3RyYW5zcG9ydD11ZHAnKSAhPT0gLTEgJiZcbiAgICAgICAgICAgIHVybC5pbmRleE9mKCd0dXJuOlsnKSA9PT0gLTEgJiZcbiAgICAgICAgICAgICFoYXNUdXJuO1xuXG4gICAgICAgIGlmICh2YWxpZFR1cm4pIHtcbiAgICAgICAgICBoYXNUdXJuID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXJsLmluZGV4T2YoJ3N0dW46JykgPT09IDAgJiYgZWRnZVZlcnNpb24gPj0gMTQzOTMgJiZcbiAgICAgICAgICAgIHVybC5pbmRleE9mKCc/dHJhbnNwb3J0PXVkcCcpID09PSAtMTtcbiAgICAgIH0pO1xuXG4gICAgICBkZWxldGUgc2VydmVyLnVybDtcbiAgICAgIHNlcnZlci51cmxzID0gaXNTdHJpbmcgPyB1cmxzWzBdIDogdXJscztcbiAgICAgIHJldHVybiAhIXVybHMubGVuZ3RoO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIERldGVybWluZXMgdGhlIGludGVyc2VjdGlvbiBvZiBsb2NhbCBhbmQgcmVtb3RlIGNhcGFiaWxpdGllcy5cbmZ1bmN0aW9uIGdldENvbW1vbkNhcGFiaWxpdGllcyhsb2NhbENhcGFiaWxpdGllcywgcmVtb3RlQ2FwYWJpbGl0aWVzKSB7XG4gIHZhciBjb21tb25DYXBhYmlsaXRpZXMgPSB7XG4gICAgY29kZWNzOiBbXSxcbiAgICBoZWFkZXJFeHRlbnNpb25zOiBbXSxcbiAgICBmZWNNZWNoYW5pc21zOiBbXVxuICB9O1xuXG4gIHZhciBmaW5kQ29kZWNCeVBheWxvYWRUeXBlID0gZnVuY3Rpb24ocHQsIGNvZGVjcykge1xuICAgIHB0ID0gcGFyc2VJbnQocHQsIDEwKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvZGVjcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGNvZGVjc1tpXS5wYXlsb2FkVHlwZSA9PT0gcHQgfHxcbiAgICAgICAgICBjb2RlY3NbaV0ucHJlZmVycmVkUGF5bG9hZFR5cGUgPT09IHB0KSB7XG4gICAgICAgIHJldHVybiBjb2RlY3NbaV07XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHZhciBydHhDYXBhYmlsaXR5TWF0Y2hlcyA9IGZ1bmN0aW9uKGxSdHgsIHJSdHgsIGxDb2RlY3MsIHJDb2RlY3MpIHtcbiAgICB2YXIgbENvZGVjID0gZmluZENvZGVjQnlQYXlsb2FkVHlwZShsUnR4LnBhcmFtZXRlcnMuYXB0LCBsQ29kZWNzKTtcbiAgICB2YXIgckNvZGVjID0gZmluZENvZGVjQnlQYXlsb2FkVHlwZShyUnR4LnBhcmFtZXRlcnMuYXB0LCByQ29kZWNzKTtcbiAgICByZXR1cm4gbENvZGVjICYmIHJDb2RlYyAmJlxuICAgICAgICBsQ29kZWMubmFtZS50b0xvd2VyQ2FzZSgpID09PSByQ29kZWMubmFtZS50b0xvd2VyQ2FzZSgpO1xuICB9O1xuXG4gIGxvY2FsQ2FwYWJpbGl0aWVzLmNvZGVjcy5mb3JFYWNoKGZ1bmN0aW9uKGxDb2RlYykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVtb3RlQ2FwYWJpbGl0aWVzLmNvZGVjcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHJDb2RlYyA9IHJlbW90ZUNhcGFiaWxpdGllcy5jb2RlY3NbaV07XG4gICAgICBpZiAobENvZGVjLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gckNvZGVjLm5hbWUudG9Mb3dlckNhc2UoKSAmJlxuICAgICAgICAgIGxDb2RlYy5jbG9ja1JhdGUgPT09IHJDb2RlYy5jbG9ja1JhdGUpIHtcbiAgICAgICAgaWYgKGxDb2RlYy5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdydHgnICYmXG4gICAgICAgICAgICBsQ29kZWMucGFyYW1ldGVycyAmJiByQ29kZWMucGFyYW1ldGVycy5hcHQpIHtcbiAgICAgICAgICAvLyBmb3IgUlRYIHdlIG5lZWQgdG8gZmluZCB0aGUgbG9jYWwgcnR4IHRoYXQgaGFzIGEgYXB0XG4gICAgICAgICAgLy8gd2hpY2ggcG9pbnRzIHRvIHRoZSBzYW1lIGxvY2FsIGNvZGVjIGFzIHRoZSByZW1vdGUgb25lLlxuICAgICAgICAgIGlmICghcnR4Q2FwYWJpbGl0eU1hdGNoZXMobENvZGVjLCByQ29kZWMsXG4gICAgICAgICAgICAgIGxvY2FsQ2FwYWJpbGl0aWVzLmNvZGVjcywgcmVtb3RlQ2FwYWJpbGl0aWVzLmNvZGVjcykpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByQ29kZWMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJDb2RlYykpOyAvLyBkZWVwY29weVxuICAgICAgICAvLyBudW1iZXIgb2YgY2hhbm5lbHMgaXMgdGhlIGhpZ2hlc3QgY29tbW9uIG51bWJlciBvZiBjaGFubmVsc1xuICAgICAgICByQ29kZWMubnVtQ2hhbm5lbHMgPSBNYXRoLm1pbihsQ29kZWMubnVtQ2hhbm5lbHMsXG4gICAgICAgICAgICByQ29kZWMubnVtQ2hhbm5lbHMpO1xuICAgICAgICAvLyBwdXNoIHJDb2RlYyBzbyB3ZSByZXBseSB3aXRoIG9mZmVyZXIgcGF5bG9hZCB0eXBlXG4gICAgICAgIGNvbW1vbkNhcGFiaWxpdGllcy5jb2RlY3MucHVzaChyQ29kZWMpO1xuXG4gICAgICAgIC8vIGRldGVybWluZSBjb21tb24gZmVlZGJhY2sgbWVjaGFuaXNtc1xuICAgICAgICByQ29kZWMucnRjcEZlZWRiYWNrID0gckNvZGVjLnJ0Y3BGZWVkYmFjay5maWx0ZXIoZnVuY3Rpb24oZmIpIHtcbiAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxDb2RlYy5ydGNwRmVlZGJhY2subGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChsQ29kZWMucnRjcEZlZWRiYWNrW2pdLnR5cGUgPT09IGZiLnR5cGUgJiZcbiAgICAgICAgICAgICAgICBsQ29kZWMucnRjcEZlZWRiYWNrW2pdLnBhcmFtZXRlciA9PT0gZmIucGFyYW1ldGVyKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBGSVhNRTogYWxzbyBuZWVkIHRvIGRldGVybWluZSAucGFyYW1ldGVyc1xuICAgICAgICAvLyAgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9vcGVucGVlci9vcnRjL2lzc3Vlcy81NjlcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBsb2NhbENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zLmZvckVhY2goZnVuY3Rpb24obEhlYWRlckV4dGVuc2lvbikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVtb3RlQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMubGVuZ3RoO1xuICAgICAgICAgaSsrKSB7XG4gICAgICB2YXIgckhlYWRlckV4dGVuc2lvbiA9IHJlbW90ZUNhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zW2ldO1xuICAgICAgaWYgKGxIZWFkZXJFeHRlbnNpb24udXJpID09PSBySGVhZGVyRXh0ZW5zaW9uLnVyaSkge1xuICAgICAgICBjb21tb25DYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucy5wdXNoKHJIZWFkZXJFeHRlbnNpb24pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIC8vIEZJWE1FOiBmZWNNZWNoYW5pc21zXG4gIHJldHVybiBjb21tb25DYXBhYmlsaXRpZXM7XG59XG5cbi8vIGlzIGFjdGlvbj1zZXRMb2NhbERlc2NyaXB0aW9uIHdpdGggdHlwZSBhbGxvd2VkIGluIHNpZ25hbGluZ1N0YXRlXG5mdW5jdGlvbiBpc0FjdGlvbkFsbG93ZWRJblNpZ25hbGluZ1N0YXRlKGFjdGlvbiwgdHlwZSwgc2lnbmFsaW5nU3RhdGUpIHtcbiAgcmV0dXJuIHtcbiAgICBvZmZlcjoge1xuICAgICAgc2V0TG9jYWxEZXNjcmlwdGlvbjogWydzdGFibGUnLCAnaGF2ZS1sb2NhbC1vZmZlciddLFxuICAgICAgc2V0UmVtb3RlRGVzY3JpcHRpb246IFsnc3RhYmxlJywgJ2hhdmUtcmVtb3RlLW9mZmVyJ11cbiAgICB9LFxuICAgIGFuc3dlcjoge1xuICAgICAgc2V0TG9jYWxEZXNjcmlwdGlvbjogWydoYXZlLXJlbW90ZS1vZmZlcicsICdoYXZlLWxvY2FsLXByYW5zd2VyJ10sXG4gICAgICBzZXRSZW1vdGVEZXNjcmlwdGlvbjogWydoYXZlLWxvY2FsLW9mZmVyJywgJ2hhdmUtcmVtb3RlLXByYW5zd2VyJ11cbiAgICB9XG4gIH1bdHlwZV1bYWN0aW9uXS5pbmRleE9mKHNpZ25hbGluZ1N0YXRlKSAhPT0gLTE7XG59XG5cbmZ1bmN0aW9uIG1heWJlQWRkQ2FuZGlkYXRlKGljZVRyYW5zcG9ydCwgY2FuZGlkYXRlKSB7XG4gIC8vIEVkZ2UncyBpbnRlcm5hbCByZXByZXNlbnRhdGlvbiBhZGRzIHNvbWUgZmllbGRzIHRoZXJlZm9yZVxuICAvLyBub3QgYWxsIGZpZWxk0ZUgYXJlIHRha2VuIGludG8gYWNjb3VudC5cbiAgdmFyIGFscmVhZHlBZGRlZCA9IGljZVRyYW5zcG9ydC5nZXRSZW1vdGVDYW5kaWRhdGVzKClcbiAgICAgIC5maW5kKGZ1bmN0aW9uKHJlbW90ZUNhbmRpZGF0ZSkge1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlLmZvdW5kYXRpb24gPT09IHJlbW90ZUNhbmRpZGF0ZS5mb3VuZGF0aW9uICYmXG4gICAgICAgICAgICBjYW5kaWRhdGUuaXAgPT09IHJlbW90ZUNhbmRpZGF0ZS5pcCAmJlxuICAgICAgICAgICAgY2FuZGlkYXRlLnBvcnQgPT09IHJlbW90ZUNhbmRpZGF0ZS5wb3J0ICYmXG4gICAgICAgICAgICBjYW5kaWRhdGUucHJpb3JpdHkgPT09IHJlbW90ZUNhbmRpZGF0ZS5wcmlvcml0eSAmJlxuICAgICAgICAgICAgY2FuZGlkYXRlLnByb3RvY29sID09PSByZW1vdGVDYW5kaWRhdGUucHJvdG9jb2wgJiZcbiAgICAgICAgICAgIGNhbmRpZGF0ZS50eXBlID09PSByZW1vdGVDYW5kaWRhdGUudHlwZTtcbiAgICAgIH0pO1xuICBpZiAoIWFscmVhZHlBZGRlZCkge1xuICAgIGljZVRyYW5zcG9ydC5hZGRSZW1vdGVDYW5kaWRhdGUoY2FuZGlkYXRlKTtcbiAgfVxuICByZXR1cm4gIWFscmVhZHlBZGRlZDtcbn1cblxuXG5mdW5jdGlvbiBtYWtlRXJyb3IobmFtZSwgZGVzY3JpcHRpb24pIHtcbiAgdmFyIGUgPSBuZXcgRXJyb3IoZGVzY3JpcHRpb24pO1xuICBlLm5hbWUgPSBuYW1lO1xuICAvLyBsZWdhY3kgZXJyb3IgY29kZXMgZnJvbSBodHRwczovL2hleWNhbS5naXRodWIuaW8vd2ViaWRsLyNpZGwtRE9NRXhjZXB0aW9uLWVycm9yLW5hbWVzXG4gIGUuY29kZSA9IHtcbiAgICBOb3RTdXBwb3J0ZWRFcnJvcjogOSxcbiAgICBJbnZhbGlkU3RhdGVFcnJvcjogMTEsXG4gICAgSW52YWxpZEFjY2Vzc0Vycm9yOiAxNSxcbiAgICBUeXBlRXJyb3I6IHVuZGVmaW5lZCxcbiAgICBPcGVyYXRpb25FcnJvcjogdW5kZWZpbmVkXG4gIH1bbmFtZV07XG4gIHJldHVybiBlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHdpbmRvdywgZWRnZVZlcnNpb24pIHtcbiAgLy8gaHR0cHM6Ly93M2MuZ2l0aHViLmlvL21lZGlhY2FwdHVyZS1tYWluLyNtZWRpYXN0cmVhbVxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gYWRkIHRoZSB0cmFjayB0byB0aGUgc3RyZWFtIGFuZFxuICAvLyBkaXNwYXRjaCB0aGUgZXZlbnQgb3Vyc2VsdmVzLlxuICBmdW5jdGlvbiBhZGRUcmFja1RvU3RyZWFtQW5kRmlyZUV2ZW50KHRyYWNrLCBzdHJlYW0pIHtcbiAgICBzdHJlYW0uYWRkVHJhY2sodHJhY2spO1xuICAgIHN0cmVhbS5kaXNwYXRjaEV2ZW50KG5ldyB3aW5kb3cuTWVkaWFTdHJlYW1UcmFja0V2ZW50KCdhZGR0cmFjaycsXG4gICAgICAgIHt0cmFjazogdHJhY2t9KSk7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVUcmFja0Zyb21TdHJlYW1BbmRGaXJlRXZlbnQodHJhY2ssIHN0cmVhbSkge1xuICAgIHN0cmVhbS5yZW1vdmVUcmFjayh0cmFjayk7XG4gICAgc3RyZWFtLmRpc3BhdGNoRXZlbnQobmV3IHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrRXZlbnQoJ3JlbW92ZXRyYWNrJyxcbiAgICAgICAge3RyYWNrOiB0cmFja30pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpcmVBZGRUcmFjayhwYywgdHJhY2ssIHJlY2VpdmVyLCBzdHJlYW1zKSB7XG4gICAgdmFyIHRyYWNrRXZlbnQgPSBuZXcgRXZlbnQoJ3RyYWNrJyk7XG4gICAgdHJhY2tFdmVudC50cmFjayA9IHRyYWNrO1xuICAgIHRyYWNrRXZlbnQucmVjZWl2ZXIgPSByZWNlaXZlcjtcbiAgICB0cmFja0V2ZW50LnRyYW5zY2VpdmVyID0ge3JlY2VpdmVyOiByZWNlaXZlcn07XG4gICAgdHJhY2tFdmVudC5zdHJlYW1zID0gc3RyZWFtcztcbiAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHBjLl9kaXNwYXRjaEV2ZW50KCd0cmFjaycsIHRyYWNrRXZlbnQpO1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIFJUQ1BlZXJDb25uZWN0aW9uID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgdmFyIHBjID0gdGhpcztcblxuICAgIHZhciBfZXZlbnRUYXJnZXQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgWydhZGRFdmVudExpc3RlbmVyJywgJ3JlbW92ZUV2ZW50TGlzdGVuZXInLCAnZGlzcGF0Y2hFdmVudCddXG4gICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgICAgICAgIHBjW21ldGhvZF0gPSBfZXZlbnRUYXJnZXRbbWV0aG9kXS5iaW5kKF9ldmVudFRhcmdldCk7XG4gICAgICAgIH0pO1xuXG4gICAgdGhpcy5jYW5Ucmlja2xlSWNlQ2FuZGlkYXRlcyA9IG51bGw7XG5cbiAgICB0aGlzLm5lZWROZWdvdGlhdGlvbiA9IGZhbHNlO1xuXG4gICAgdGhpcy5sb2NhbFN0cmVhbXMgPSBbXTtcbiAgICB0aGlzLnJlbW90ZVN0cmVhbXMgPSBbXTtcblxuICAgIHRoaXMuX2xvY2FsRGVzY3JpcHRpb24gPSBudWxsO1xuICAgIHRoaXMuX3JlbW90ZURlc2NyaXB0aW9uID0gbnVsbDtcblxuICAgIHRoaXMuc2lnbmFsaW5nU3RhdGUgPSAnc3RhYmxlJztcbiAgICB0aGlzLmljZUNvbm5lY3Rpb25TdGF0ZSA9ICduZXcnO1xuICAgIHRoaXMuY29ubmVjdGlvblN0YXRlID0gJ25ldyc7XG4gICAgdGhpcy5pY2VHYXRoZXJpbmdTdGF0ZSA9ICduZXcnO1xuXG4gICAgY29uZmlnID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25maWcgfHwge30pKTtcblxuICAgIHRoaXMudXNpbmdCdW5kbGUgPSBjb25maWcuYnVuZGxlUG9saWN5ID09PSAnbWF4LWJ1bmRsZSc7XG4gICAgaWYgKGNvbmZpZy5ydGNwTXV4UG9saWN5ID09PSAnbmVnb3RpYXRlJykge1xuICAgICAgdGhyb3cobWFrZUVycm9yKCdOb3RTdXBwb3J0ZWRFcnJvcicsXG4gICAgICAgICAgJ3J0Y3BNdXhQb2xpY3kgXFwnbmVnb3RpYXRlXFwnIGlzIG5vdCBzdXBwb3J0ZWQnKSk7XG4gICAgfSBlbHNlIGlmICghY29uZmlnLnJ0Y3BNdXhQb2xpY3kpIHtcbiAgICAgIGNvbmZpZy5ydGNwTXV4UG9saWN5ID0gJ3JlcXVpcmUnO1xuICAgIH1cblxuICAgIHN3aXRjaCAoY29uZmlnLmljZVRyYW5zcG9ydFBvbGljeSkge1xuICAgICAgY2FzZSAnYWxsJzpcbiAgICAgIGNhc2UgJ3JlbGF5JzpcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25maWcuaWNlVHJhbnNwb3J0UG9saWN5ID0gJ2FsbCc7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHN3aXRjaCAoY29uZmlnLmJ1bmRsZVBvbGljeSkge1xuICAgICAgY2FzZSAnYmFsYW5jZWQnOlxuICAgICAgY2FzZSAnbWF4LWNvbXBhdCc6XG4gICAgICBjYXNlICdtYXgtYnVuZGxlJzpcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25maWcuYnVuZGxlUG9saWN5ID0gJ2JhbGFuY2VkJztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uZmlnLmljZVNlcnZlcnMgPSBmaWx0ZXJJY2VTZXJ2ZXJzKGNvbmZpZy5pY2VTZXJ2ZXJzIHx8IFtdLCBlZGdlVmVyc2lvbik7XG5cbiAgICB0aGlzLl9pY2VHYXRoZXJlcnMgPSBbXTtcbiAgICBpZiAoY29uZmlnLmljZUNhbmRpZGF0ZVBvb2xTaXplKSB7XG4gICAgICBmb3IgKHZhciBpID0gY29uZmlnLmljZUNhbmRpZGF0ZVBvb2xTaXplOyBpID4gMDsgaS0tKSB7XG4gICAgICAgIHRoaXMuX2ljZUdhdGhlcmVycy5wdXNoKG5ldyB3aW5kb3cuUlRDSWNlR2F0aGVyZXIoe1xuICAgICAgICAgIGljZVNlcnZlcnM6IGNvbmZpZy5pY2VTZXJ2ZXJzLFxuICAgICAgICAgIGdhdGhlclBvbGljeTogY29uZmlnLmljZVRyYW5zcG9ydFBvbGljeVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbmZpZy5pY2VDYW5kaWRhdGVQb29sU2l6ZSA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy5fY29uZmlnID0gY29uZmlnO1xuXG4gICAgLy8gcGVyLXRyYWNrIGljZUdhdGhlcnMsIGljZVRyYW5zcG9ydHMsIGR0bHNUcmFuc3BvcnRzLCBydHBTZW5kZXJzLCAuLi5cbiAgICAvLyBldmVyeXRoaW5nIHRoYXQgaXMgbmVlZGVkIHRvIGRlc2NyaWJlIGEgU0RQIG0tbGluZS5cbiAgICB0aGlzLnRyYW5zY2VpdmVycyA9IFtdO1xuXG4gICAgdGhpcy5fc2RwU2Vzc2lvbklkID0gU0RQVXRpbHMuZ2VuZXJhdGVTZXNzaW9uSWQoKTtcbiAgICB0aGlzLl9zZHBTZXNzaW9uVmVyc2lvbiA9IDA7XG5cbiAgICB0aGlzLl9kdGxzUm9sZSA9IHVuZGVmaW5lZDsgLy8gcm9sZSBmb3IgYT1zZXR1cCB0byB1c2UgaW4gYW5zd2Vycy5cblxuICAgIHRoaXMuX2lzQ2xvc2VkID0gZmFsc2U7XG4gIH07XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSwgJ2xvY2FsRGVzY3JpcHRpb24nLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fbG9jYWxEZXNjcmlwdGlvbjtcbiAgICB9XG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLCAncmVtb3RlRGVzY3JpcHRpb24nLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVtb3RlRGVzY3JpcHRpb247XG4gICAgfVxuICB9KTtcblxuICAvLyBzZXQgdXAgZXZlbnQgaGFuZGxlcnMgb24gcHJvdG90eXBlXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5vbmljZWNhbmRpZGF0ZSA9IG51bGw7XG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5vbmFkZHN0cmVhbSA9IG51bGw7XG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5vbnRyYWNrID0gbnVsbDtcbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLm9ucmVtb3Zlc3RyZWFtID0gbnVsbDtcbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLm9uc2lnbmFsaW5nc3RhdGVjaGFuZ2UgPSBudWxsO1xuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub25pY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UgPSBudWxsO1xuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub25jb25uZWN0aW9uc3RhdGVjaGFuZ2UgPSBudWxsO1xuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub25pY2VnYXRoZXJpbmdzdGF0ZWNoYW5nZSA9IG51bGw7XG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5vbm5lZ290aWF0aW9ubmVlZGVkID0gbnVsbDtcbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLm9uZGF0YWNoYW5uZWwgPSBudWxsO1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5fZGlzcGF0Y2hFdmVudCA9IGZ1bmN0aW9uKG5hbWUsIGV2ZW50KSB7XG4gICAgaWYgKHRoaXMuX2lzQ2xvc2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgaWYgKHR5cGVvZiB0aGlzWydvbicgKyBuYW1lXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpc1snb24nICsgbmFtZV0oZXZlbnQpO1xuICAgIH1cbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX2VtaXRHYXRoZXJpbmdTdGF0ZUNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBldmVudCA9IG5ldyBFdmVudCgnaWNlZ2F0aGVyaW5nc3RhdGVjaGFuZ2UnKTtcbiAgICB0aGlzLl9kaXNwYXRjaEV2ZW50KCdpY2VnYXRoZXJpbmdzdGF0ZWNoYW5nZScsIGV2ZW50KTtcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0Q29uZmlndXJhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9jb25maWc7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldExvY2FsU3RyZWFtcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmxvY2FsU3RyZWFtcztcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0UmVtb3RlU3RyZWFtcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnJlbW90ZVN0cmVhbXM7XG4gIH07XG5cbiAgLy8gaW50ZXJuYWwgaGVscGVyIHRvIGNyZWF0ZSBhIHRyYW5zY2VpdmVyIG9iamVjdC5cbiAgLy8gKHdoaWNoIGlzIG5vdCB5ZXQgdGhlIHNhbWUgYXMgdGhlIFdlYlJUQyAxLjAgdHJhbnNjZWl2ZXIpXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5fY3JlYXRlVHJhbnNjZWl2ZXIgPSBmdW5jdGlvbihraW5kLCBkb05vdEFkZCkge1xuICAgIHZhciBoYXNCdW5kbGVUcmFuc3BvcnQgPSB0aGlzLnRyYW5zY2VpdmVycy5sZW5ndGggPiAwO1xuICAgIHZhciB0cmFuc2NlaXZlciA9IHtcbiAgICAgIHRyYWNrOiBudWxsLFxuICAgICAgaWNlR2F0aGVyZXI6IG51bGwsXG4gICAgICBpY2VUcmFuc3BvcnQ6IG51bGwsXG4gICAgICBkdGxzVHJhbnNwb3J0OiBudWxsLFxuICAgICAgbG9jYWxDYXBhYmlsaXRpZXM6IG51bGwsXG4gICAgICByZW1vdGVDYXBhYmlsaXRpZXM6IG51bGwsXG4gICAgICBydHBTZW5kZXI6IG51bGwsXG4gICAgICBydHBSZWNlaXZlcjogbnVsbCxcbiAgICAgIGtpbmQ6IGtpbmQsXG4gICAgICBtaWQ6IG51bGwsXG4gICAgICBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzOiBudWxsLFxuICAgICAgcmVjdkVuY29kaW5nUGFyYW1ldGVyczogbnVsbCxcbiAgICAgIHN0cmVhbTogbnVsbCxcbiAgICAgIGFzc29jaWF0ZWRSZW1vdGVNZWRpYVN0cmVhbXM6IFtdLFxuICAgICAgd2FudFJlY2VpdmU6IHRydWVcbiAgICB9O1xuICAgIGlmICh0aGlzLnVzaW5nQnVuZGxlICYmIGhhc0J1bmRsZVRyYW5zcG9ydCkge1xuICAgICAgdHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0ID0gdGhpcy50cmFuc2NlaXZlcnNbMF0uaWNlVHJhbnNwb3J0O1xuICAgICAgdHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydCA9IHRoaXMudHJhbnNjZWl2ZXJzWzBdLmR0bHNUcmFuc3BvcnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB0cmFuc3BvcnRzID0gdGhpcy5fY3JlYXRlSWNlQW5kRHRsc1RyYW5zcG9ydHMoKTtcbiAgICAgIHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCA9IHRyYW5zcG9ydHMuaWNlVHJhbnNwb3J0O1xuICAgICAgdHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydCA9IHRyYW5zcG9ydHMuZHRsc1RyYW5zcG9ydDtcbiAgICB9XG4gICAgaWYgKCFkb05vdEFkZCkge1xuICAgICAgdGhpcy50cmFuc2NlaXZlcnMucHVzaCh0cmFuc2NlaXZlcik7XG4gICAgfVxuICAgIHJldHVybiB0cmFuc2NlaXZlcjtcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2sgPSBmdW5jdGlvbih0cmFjaywgc3RyZWFtKSB7XG4gICAgaWYgKHRoaXMuX2lzQ2xvc2VkKSB7XG4gICAgICB0aHJvdyBtYWtlRXJyb3IoJ0ludmFsaWRTdGF0ZUVycm9yJyxcbiAgICAgICAgICAnQXR0ZW1wdGVkIHRvIGNhbGwgYWRkVHJhY2sgb24gYSBjbG9zZWQgcGVlcmNvbm5lY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgdmFyIGFscmVhZHlFeGlzdHMgPSB0aGlzLnRyYW5zY2VpdmVycy5maW5kKGZ1bmN0aW9uKHMpIHtcbiAgICAgIHJldHVybiBzLnRyYWNrID09PSB0cmFjaztcbiAgICB9KTtcblxuICAgIGlmIChhbHJlYWR5RXhpc3RzKSB7XG4gICAgICB0aHJvdyBtYWtlRXJyb3IoJ0ludmFsaWRBY2Nlc3NFcnJvcicsICdUcmFjayBhbHJlYWR5IGV4aXN0cy4nKTtcbiAgICB9XG5cbiAgICB2YXIgdHJhbnNjZWl2ZXI7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnRyYW5zY2VpdmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCF0aGlzLnRyYW5zY2VpdmVyc1tpXS50cmFjayAmJlxuICAgICAgICAgIHRoaXMudHJhbnNjZWl2ZXJzW2ldLmtpbmQgPT09IHRyYWNrLmtpbmQpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIgPSB0aGlzLnRyYW5zY2VpdmVyc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0cmFuc2NlaXZlcikge1xuICAgICAgdHJhbnNjZWl2ZXIgPSB0aGlzLl9jcmVhdGVUcmFuc2NlaXZlcih0cmFjay5raW5kKTtcbiAgICB9XG5cbiAgICB0aGlzLl9tYXliZUZpcmVOZWdvdGlhdGlvbk5lZWRlZCgpO1xuXG4gICAgaWYgKHRoaXMubG9jYWxTdHJlYW1zLmluZGV4T2Yoc3RyZWFtKSA9PT0gLTEpIHtcbiAgICAgIHRoaXMubG9jYWxTdHJlYW1zLnB1c2goc3RyZWFtKTtcbiAgICB9XG5cbiAgICB0cmFuc2NlaXZlci50cmFjayA9IHRyYWNrO1xuICAgIHRyYW5zY2VpdmVyLnN0cmVhbSA9IHN0cmVhbTtcbiAgICB0cmFuc2NlaXZlci5ydHBTZW5kZXIgPSBuZXcgd2luZG93LlJUQ1J0cFNlbmRlcih0cmFjayxcbiAgICAgICAgdHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydCk7XG4gICAgcmV0dXJuIHRyYW5zY2VpdmVyLnJ0cFNlbmRlcjtcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgdmFyIHBjID0gdGhpcztcbiAgICBpZiAoZWRnZVZlcnNpb24gPj0gMTUwMjUpIHtcbiAgICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrKSB7XG4gICAgICAgIHBjLmFkZFRyYWNrKHRyYWNrLCBzdHJlYW0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIENsb25lIGlzIG5lY2Vzc2FyeSBmb3IgbG9jYWwgZGVtb3MgbW9zdGx5LCBhdHRhY2hpbmcgZGlyZWN0bHlcbiAgICAgIC8vIHRvIHR3byBkaWZmZXJlbnQgc2VuZGVycyBkb2VzIG5vdCB3b3JrIChidWlsZCAxMDU0NykuXG4gICAgICAvLyBGaXhlZCBpbiAxNTAyNSAob3IgZWFybGllcilcbiAgICAgIHZhciBjbG9uZWRTdHJlYW0gPSBzdHJlYW0uY2xvbmUoKTtcbiAgICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrLCBpZHgpIHtcbiAgICAgICAgdmFyIGNsb25lZFRyYWNrID0gY2xvbmVkU3RyZWFtLmdldFRyYWNrcygpW2lkeF07XG4gICAgICAgIHRyYWNrLmFkZEV2ZW50TGlzdGVuZXIoJ2VuYWJsZWQnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIGNsb25lZFRyYWNrLmVuYWJsZWQgPSBldmVudC5lbmFibGVkO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgY2xvbmVkU3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goZnVuY3Rpb24odHJhY2spIHtcbiAgICAgICAgcGMuYWRkVHJhY2sodHJhY2ssIGNsb25lZFN0cmVhbSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVRyYWNrID0gZnVuY3Rpb24oc2VuZGVyKSB7XG4gICAgaWYgKHRoaXMuX2lzQ2xvc2VkKSB7XG4gICAgICB0aHJvdyBtYWtlRXJyb3IoJ0ludmFsaWRTdGF0ZUVycm9yJyxcbiAgICAgICAgICAnQXR0ZW1wdGVkIHRvIGNhbGwgcmVtb3ZlVHJhY2sgb24gYSBjbG9zZWQgcGVlcmNvbm5lY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgaWYgKCEoc2VuZGVyIGluc3RhbmNlb2Ygd2luZG93LlJUQ1J0cFNlbmRlcikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IDEgb2YgUlRDUGVlckNvbm5lY3Rpb24ucmVtb3ZlVHJhY2sgJyArXG4gICAgICAgICAgJ2RvZXMgbm90IGltcGxlbWVudCBpbnRlcmZhY2UgUlRDUnRwU2VuZGVyLicpO1xuICAgIH1cblxuICAgIHZhciB0cmFuc2NlaXZlciA9IHRoaXMudHJhbnNjZWl2ZXJzLmZpbmQoZnVuY3Rpb24odCkge1xuICAgICAgcmV0dXJuIHQucnRwU2VuZGVyID09PSBzZW5kZXI7XG4gICAgfSk7XG5cbiAgICBpZiAoIXRyYW5zY2VpdmVyKSB7XG4gICAgICB0aHJvdyBtYWtlRXJyb3IoJ0ludmFsaWRBY2Nlc3NFcnJvcicsXG4gICAgICAgICAgJ1NlbmRlciB3YXMgbm90IGNyZWF0ZWQgYnkgdGhpcyBjb25uZWN0aW9uLicpO1xuICAgIH1cbiAgICB2YXIgc3RyZWFtID0gdHJhbnNjZWl2ZXIuc3RyZWFtO1xuXG4gICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyLnN0b3AoKTtcbiAgICB0cmFuc2NlaXZlci5ydHBTZW5kZXIgPSBudWxsO1xuICAgIHRyYW5zY2VpdmVyLnRyYWNrID0gbnVsbDtcbiAgICB0cmFuc2NlaXZlci5zdHJlYW0gPSBudWxsO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBzdHJlYW0gZnJvbSB0aGUgc2V0IG9mIGxvY2FsIHN0cmVhbXNcbiAgICB2YXIgbG9jYWxTdHJlYW1zID0gdGhpcy50cmFuc2NlaXZlcnMubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiB0LnN0cmVhbTtcbiAgICB9KTtcbiAgICBpZiAobG9jYWxTdHJlYW1zLmluZGV4T2Yoc3RyZWFtKSA9PT0gLTEgJiZcbiAgICAgICAgdGhpcy5sb2NhbFN0cmVhbXMuaW5kZXhPZihzdHJlYW0pID4gLTEpIHtcbiAgICAgIHRoaXMubG9jYWxTdHJlYW1zLnNwbGljZSh0aGlzLmxvY2FsU3RyZWFtcy5pbmRleE9mKHN0cmVhbSksIDEpO1xuICAgIH1cblxuICAgIHRoaXMuX21heWJlRmlyZU5lZ290aWF0aW9uTmVlZGVkKCk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIHZhciBwYyA9IHRoaXM7XG4gICAgc3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goZnVuY3Rpb24odHJhY2spIHtcbiAgICAgIHZhciBzZW5kZXIgPSBwYy5nZXRTZW5kZXJzKCkuZmluZChmdW5jdGlvbihzKSB7XG4gICAgICAgIHJldHVybiBzLnRyYWNrID09PSB0cmFjaztcbiAgICAgIH0pO1xuICAgICAgaWYgKHNlbmRlcikge1xuICAgICAgICBwYy5yZW1vdmVUcmFjayhzZW5kZXIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTZW5kZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNjZWl2ZXJzLmZpbHRlcihmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgcmV0dXJuICEhdHJhbnNjZWl2ZXIucnRwU2VuZGVyO1xuICAgIH0pXG4gICAgLm1hcChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgcmV0dXJuIHRyYW5zY2VpdmVyLnJ0cFNlbmRlcjtcbiAgICB9KTtcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0UmVjZWl2ZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNjZWl2ZXJzLmZpbHRlcihmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgcmV0dXJuICEhdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXI7XG4gICAgfSlcbiAgICAubWFwKGZ1bmN0aW9uKHRyYW5zY2VpdmVyKSB7XG4gICAgICByZXR1cm4gdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXI7XG4gICAgfSk7XG4gIH07XG5cblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX2NyZWF0ZUljZUdhdGhlcmVyID0gZnVuY3Rpb24oc2RwTUxpbmVJbmRleCxcbiAgICAgIHVzaW5nQnVuZGxlKSB7XG4gICAgdmFyIHBjID0gdGhpcztcbiAgICBpZiAodXNpbmdCdW5kbGUgJiYgc2RwTUxpbmVJbmRleCA+IDApIHtcbiAgICAgIHJldHVybiB0aGlzLnRyYW5zY2VpdmVyc1swXS5pY2VHYXRoZXJlcjtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2ljZUdhdGhlcmVycy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9pY2VHYXRoZXJlcnMuc2hpZnQoKTtcbiAgICB9XG4gICAgdmFyIGljZUdhdGhlcmVyID0gbmV3IHdpbmRvdy5SVENJY2VHYXRoZXJlcih7XG4gICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl9jb25maWcuaWNlU2VydmVycyxcbiAgICAgIGdhdGhlclBvbGljeTogdGhpcy5fY29uZmlnLmljZVRyYW5zcG9ydFBvbGljeVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpY2VHYXRoZXJlciwgJ3N0YXRlJyxcbiAgICAgICAge3ZhbHVlOiAnbmV3Jywgd3JpdGFibGU6IHRydWV9XG4gICAgKTtcblxuICAgIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmJ1ZmZlcmVkQ2FuZGlkYXRlRXZlbnRzID0gW107XG4gICAgdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uYnVmZmVyQ2FuZGlkYXRlcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICB2YXIgZW5kID0gIWV2ZW50LmNhbmRpZGF0ZSB8fCBPYmplY3Qua2V5cyhldmVudC5jYW5kaWRhdGUpLmxlbmd0aCA9PT0gMDtcbiAgICAgIC8vIHBvbHlmaWxsIHNpbmNlIFJUQ0ljZUdhdGhlcmVyLnN0YXRlIGlzIG5vdCBpbXBsZW1lbnRlZCBpblxuICAgICAgLy8gRWRnZSAxMDU0NyB5ZXQuXG4gICAgICBpY2VHYXRoZXJlci5zdGF0ZSA9IGVuZCA/ICdjb21wbGV0ZWQnIDogJ2dhdGhlcmluZyc7XG4gICAgICBpZiAocGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmJ1ZmZlcmVkQ2FuZGlkYXRlRXZlbnRzICE9PSBudWxsKSB7XG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5idWZmZXJlZENhbmRpZGF0ZUV2ZW50cy5wdXNoKGV2ZW50KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGljZUdhdGhlcmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvY2FsY2FuZGlkYXRlJyxcbiAgICAgIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmJ1ZmZlckNhbmRpZGF0ZXMpO1xuICAgIHJldHVybiBpY2VHYXRoZXJlcjtcbiAgfTtcblxuICAvLyBzdGFydCBnYXRoZXJpbmcgZnJvbSBhbiBSVENJY2VHYXRoZXJlci5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9nYXRoZXIgPSBmdW5jdGlvbihtaWQsIHNkcE1MaW5lSW5kZXgpIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuICAgIHZhciBpY2VHYXRoZXJlciA9IHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmljZUdhdGhlcmVyO1xuICAgIGlmIChpY2VHYXRoZXJlci5vbmxvY2FsY2FuZGlkYXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBidWZmZXJlZENhbmRpZGF0ZUV2ZW50cyA9XG4gICAgICB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5idWZmZXJlZENhbmRpZGF0ZUV2ZW50cztcbiAgICB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5idWZmZXJlZENhbmRpZGF0ZUV2ZW50cyA9IG51bGw7XG4gICAgaWNlR2F0aGVyZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcignbG9jYWxjYW5kaWRhdGUnLFxuICAgICAgdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uYnVmZmVyQ2FuZGlkYXRlcyk7XG4gICAgaWNlR2F0aGVyZXIub25sb2NhbGNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgaWYgKHBjLnVzaW5nQnVuZGxlICYmIHNkcE1MaW5lSW5kZXggPiAwKSB7XG4gICAgICAgIC8vIGlmIHdlIGtub3cgdGhhdCB3ZSB1c2UgYnVuZGxlIHdlIGNhbiBkcm9wIGNhbmRpZGF0ZXMgd2l0aFxuICAgICAgICAvLyDRlWRwTUxpbmVJbmRleCA+IDAuIElmIHdlIGRvbid0IGRvIHRoaXMgdGhlbiBvdXIgc3RhdGUgZ2V0c1xuICAgICAgICAvLyBjb25mdXNlZCBzaW5jZSB3ZSBkaXNwb3NlIHRoZSBleHRyYSBpY2UgZ2F0aGVyZXIuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBldmVudCA9IG5ldyBFdmVudCgnaWNlY2FuZGlkYXRlJyk7XG4gICAgICBldmVudC5jYW5kaWRhdGUgPSB7c2RwTWlkOiBtaWQsIHNkcE1MaW5lSW5kZXg6IHNkcE1MaW5lSW5kZXh9O1xuXG4gICAgICB2YXIgY2FuZCA9IGV2dC5jYW5kaWRhdGU7XG4gICAgICAvLyBFZGdlIGVtaXRzIGFuIGVtcHR5IG9iamVjdCBmb3IgUlRDSWNlQ2FuZGlkYXRlQ29tcGxldGXigKVcbiAgICAgIHZhciBlbmQgPSAhY2FuZCB8fCBPYmplY3Qua2V5cyhjYW5kKS5sZW5ndGggPT09IDA7XG4gICAgICBpZiAoZW5kKSB7XG4gICAgICAgIC8vIHBvbHlmaWxsIHNpbmNlIFJUQ0ljZUdhdGhlcmVyLnN0YXRlIGlzIG5vdCBpbXBsZW1lbnRlZCBpblxuICAgICAgICAvLyBFZGdlIDEwNTQ3IHlldC5cbiAgICAgICAgaWYgKGljZUdhdGhlcmVyLnN0YXRlID09PSAnbmV3JyB8fCBpY2VHYXRoZXJlci5zdGF0ZSA9PT0gJ2dhdGhlcmluZycpIHtcbiAgICAgICAgICBpY2VHYXRoZXJlci5zdGF0ZSA9ICdjb21wbGV0ZWQnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaWNlR2F0aGVyZXIuc3RhdGUgPT09ICduZXcnKSB7XG4gICAgICAgICAgaWNlR2F0aGVyZXIuc3RhdGUgPSAnZ2F0aGVyaW5nJztcbiAgICAgICAgfVxuICAgICAgICAvLyBSVENJY2VDYW5kaWRhdGUgZG9lc24ndCBoYXZlIGEgY29tcG9uZW50LCBuZWVkcyB0byBiZSBhZGRlZFxuICAgICAgICBjYW5kLmNvbXBvbmVudCA9IDE7XG4gICAgICAgIC8vIGFsc28gdGhlIHVzZXJuYW1lRnJhZ21lbnQuIFRPRE86IHVwZGF0ZSBTRFAgdG8gdGFrZSBib3RoIHZhcmlhbnRzLlxuICAgICAgICBjYW5kLnVmcmFnID0gaWNlR2F0aGVyZXIuZ2V0TG9jYWxQYXJhbWV0ZXJzKCkudXNlcm5hbWVGcmFnbWVudDtcblxuICAgICAgICB2YXIgc2VyaWFsaXplZENhbmRpZGF0ZSA9IFNEUFV0aWxzLndyaXRlQ2FuZGlkYXRlKGNhbmQpO1xuICAgICAgICBldmVudC5jYW5kaWRhdGUgPSBPYmplY3QuYXNzaWduKGV2ZW50LmNhbmRpZGF0ZSxcbiAgICAgICAgICAgIFNEUFV0aWxzLnBhcnNlQ2FuZGlkYXRlKHNlcmlhbGl6ZWRDYW5kaWRhdGUpKTtcblxuICAgICAgICBldmVudC5jYW5kaWRhdGUuY2FuZGlkYXRlID0gc2VyaWFsaXplZENhbmRpZGF0ZTtcbiAgICAgICAgZXZlbnQuY2FuZGlkYXRlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjYW5kaWRhdGU6IGV2ZW50LmNhbmRpZGF0ZS5jYW5kaWRhdGUsXG4gICAgICAgICAgICBzZHBNaWQ6IGV2ZW50LmNhbmRpZGF0ZS5zZHBNaWQsXG4gICAgICAgICAgICBzZHBNTGluZUluZGV4OiBldmVudC5jYW5kaWRhdGUuc2RwTUxpbmVJbmRleCxcbiAgICAgICAgICAgIHVzZXJuYW1lRnJhZ21lbnQ6IGV2ZW50LmNhbmRpZGF0ZS51c2VybmFtZUZyYWdtZW50XG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gdXBkYXRlIGxvY2FsIGRlc2NyaXB0aW9uLlxuICAgICAgdmFyIHNlY3Rpb25zID0gU0RQVXRpbHMuZ2V0TWVkaWFTZWN0aW9ucyhwYy5fbG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgaWYgKCFlbmQpIHtcbiAgICAgICAgc2VjdGlvbnNbZXZlbnQuY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXhdICs9XG4gICAgICAgICAgICAnYT0nICsgZXZlbnQuY2FuZGlkYXRlLmNhbmRpZGF0ZSArICdcXHJcXG4nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VjdGlvbnNbZXZlbnQuY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXhdICs9XG4gICAgICAgICAgICAnYT1lbmQtb2YtY2FuZGlkYXRlc1xcclxcbic7XG4gICAgICB9XG4gICAgICBwYy5fbG9jYWxEZXNjcmlwdGlvbi5zZHAgPVxuICAgICAgICAgIFNEUFV0aWxzLmdldERlc2NyaXB0aW9uKHBjLl9sb2NhbERlc2NyaXB0aW9uLnNkcCkgK1xuICAgICAgICAgIHNlY3Rpb25zLmpvaW4oJycpO1xuICAgICAgdmFyIGNvbXBsZXRlID0gcGMudHJhbnNjZWl2ZXJzLmV2ZXJ5KGZ1bmN0aW9uKHRyYW5zY2VpdmVyKSB7XG4gICAgICAgIHJldHVybiB0cmFuc2NlaXZlci5pY2VHYXRoZXJlciAmJlxuICAgICAgICAgICAgdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIuc3RhdGUgPT09ICdjb21wbGV0ZWQnO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChwYy5pY2VHYXRoZXJpbmdTdGF0ZSAhPT0gJ2dhdGhlcmluZycpIHtcbiAgICAgICAgcGMuaWNlR2F0aGVyaW5nU3RhdGUgPSAnZ2F0aGVyaW5nJztcbiAgICAgICAgcGMuX2VtaXRHYXRoZXJpbmdTdGF0ZUNoYW5nZSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBFbWl0IGNhbmRpZGF0ZS4gQWxzbyBlbWl0IG51bGwgY2FuZGlkYXRlIHdoZW4gYWxsIGdhdGhlcmVycyBhcmVcbiAgICAgIC8vIGNvbXBsZXRlLlxuICAgICAgaWYgKCFlbmQpIHtcbiAgICAgICAgcGMuX2Rpc3BhdGNoRXZlbnQoJ2ljZWNhbmRpZGF0ZScsIGV2ZW50KTtcbiAgICAgIH1cbiAgICAgIGlmIChjb21wbGV0ZSkge1xuICAgICAgICBwYy5fZGlzcGF0Y2hFdmVudCgnaWNlY2FuZGlkYXRlJywgbmV3IEV2ZW50KCdpY2VjYW5kaWRhdGUnKSk7XG4gICAgICAgIHBjLmljZUdhdGhlcmluZ1N0YXRlID0gJ2NvbXBsZXRlJztcbiAgICAgICAgcGMuX2VtaXRHYXRoZXJpbmdTdGF0ZUNoYW5nZSgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBlbWl0IGFscmVhZHkgZ2F0aGVyZWQgY2FuZGlkYXRlcy5cbiAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGJ1ZmZlcmVkQ2FuZGlkYXRlRXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgICBpY2VHYXRoZXJlci5vbmxvY2FsY2FuZGlkYXRlKGUpO1xuICAgICAgfSk7XG4gICAgfSwgMCk7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIElDRSB0cmFuc3BvcnQgYW5kIERUTFMgdHJhbnNwb3J0LlxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX2NyZWF0ZUljZUFuZER0bHNUcmFuc3BvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBjID0gdGhpcztcbiAgICB2YXIgaWNlVHJhbnNwb3J0ID0gbmV3IHdpbmRvdy5SVENJY2VUcmFuc3BvcnQobnVsbCk7XG4gICAgaWNlVHJhbnNwb3J0Lm9uaWNlc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIHBjLl91cGRhdGVJY2VDb25uZWN0aW9uU3RhdGUoKTtcbiAgICAgIHBjLl91cGRhdGVDb25uZWN0aW9uU3RhdGUoKTtcbiAgICB9O1xuXG4gICAgdmFyIGR0bHNUcmFuc3BvcnQgPSBuZXcgd2luZG93LlJUQ0R0bHNUcmFuc3BvcnQoaWNlVHJhbnNwb3J0KTtcbiAgICBkdGxzVHJhbnNwb3J0Lm9uZHRsc3N0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICBwYy5fdXBkYXRlQ29ubmVjdGlvblN0YXRlKCk7XG4gICAgfTtcbiAgICBkdGxzVHJhbnNwb3J0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIG9uZXJyb3IgZG9lcyBub3Qgc2V0IHN0YXRlIHRvIGZhaWxlZCBieSBpdHNlbGYuXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZHRsc1RyYW5zcG9ydCwgJ3N0YXRlJyxcbiAgICAgICAgICB7dmFsdWU6ICdmYWlsZWQnLCB3cml0YWJsZTogdHJ1ZX0pO1xuICAgICAgcGMuX3VwZGF0ZUNvbm5lY3Rpb25TdGF0ZSgpO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWNlVHJhbnNwb3J0OiBpY2VUcmFuc3BvcnQsXG4gICAgICBkdGxzVHJhbnNwb3J0OiBkdGxzVHJhbnNwb3J0XG4gICAgfTtcbiAgfTtcblxuICAvLyBEZXN0cm95IElDRSBnYXRoZXJlciwgSUNFIHRyYW5zcG9ydCBhbmQgRFRMUyB0cmFuc3BvcnQuXG4gIC8vIFdpdGhvdXQgdHJpZ2dlcmluZyB0aGUgY2FsbGJhY2tzLlxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Rpc3Bvc2VJY2VBbmREdGxzVHJhbnNwb3J0cyA9IGZ1bmN0aW9uKFxuICAgICAgc2RwTUxpbmVJbmRleCkge1xuICAgIHZhciBpY2VHYXRoZXJlciA9IHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmljZUdhdGhlcmVyO1xuICAgIGlmIChpY2VHYXRoZXJlcikge1xuICAgICAgZGVsZXRlIGljZUdhdGhlcmVyLm9ubG9jYWxjYW5kaWRhdGU7XG4gICAgICBkZWxldGUgdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uaWNlR2F0aGVyZXI7XG4gICAgfVxuICAgIHZhciBpY2VUcmFuc3BvcnQgPSB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5pY2VUcmFuc3BvcnQ7XG4gICAgaWYgKGljZVRyYW5zcG9ydCkge1xuICAgICAgZGVsZXRlIGljZVRyYW5zcG9ydC5vbmljZXN0YXRlY2hhbmdlO1xuICAgICAgZGVsZXRlIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmljZVRyYW5zcG9ydDtcbiAgICB9XG4gICAgdmFyIGR0bHNUcmFuc3BvcnQgPSB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5kdGxzVHJhbnNwb3J0O1xuICAgIGlmIChkdGxzVHJhbnNwb3J0KSB7XG4gICAgICBkZWxldGUgZHRsc1RyYW5zcG9ydC5vbmR0bHNzdGF0ZWNoYW5nZTtcbiAgICAgIGRlbGV0ZSBkdGxzVHJhbnNwb3J0Lm9uZXJyb3I7XG4gICAgICBkZWxldGUgdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uZHRsc1RyYW5zcG9ydDtcbiAgICB9XG4gIH07XG5cbiAgLy8gU3RhcnQgdGhlIFJUUCBTZW5kZXIgYW5kIFJlY2VpdmVyIGZvciBhIHRyYW5zY2VpdmVyLlxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX3RyYW5zY2VpdmUgPSBmdW5jdGlvbih0cmFuc2NlaXZlcixcbiAgICAgIHNlbmQsIHJlY3YpIHtcbiAgICB2YXIgcGFyYW1zID0gZ2V0Q29tbW9uQ2FwYWJpbGl0aWVzKHRyYW5zY2VpdmVyLmxvY2FsQ2FwYWJpbGl0aWVzLFxuICAgICAgICB0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXMpO1xuICAgIGlmIChzZW5kICYmIHRyYW5zY2VpdmVyLnJ0cFNlbmRlcikge1xuICAgICAgcGFyYW1zLmVuY29kaW5ncyA9IHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnM7XG4gICAgICBwYXJhbXMucnRjcCA9IHtcbiAgICAgICAgY25hbWU6IFNEUFV0aWxzLmxvY2FsQ05hbWUsXG4gICAgICAgIGNvbXBvdW5kOiB0cmFuc2NlaXZlci5ydGNwUGFyYW1ldGVycy5jb21wb3VuZFxuICAgICAgfTtcbiAgICAgIGlmICh0cmFuc2NlaXZlci5yZWN2RW5jb2RpbmdQYXJhbWV0ZXJzLmxlbmd0aCkge1xuICAgICAgICBwYXJhbXMucnRjcC5zc3JjID0gdHJhbnNjZWl2ZXIucmVjdkVuY29kaW5nUGFyYW1ldGVyc1swXS5zc3JjO1xuICAgICAgfVxuICAgICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyLnNlbmQocGFyYW1zKTtcbiAgICB9XG4gICAgaWYgKHJlY3YgJiYgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIgJiYgcGFyYW1zLmNvZGVjcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyByZW1vdmUgUlRYIGZpZWxkIGluIEVkZ2UgMTQ5NDJcbiAgICAgIGlmICh0cmFuc2NlaXZlci5raW5kID09PSAndmlkZW8nXG4gICAgICAgICAgJiYgdHJhbnNjZWl2ZXIucmVjdkVuY29kaW5nUGFyYW1ldGVyc1xuICAgICAgICAgICYmIGVkZ2VWZXJzaW9uIDwgMTUwMTkpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIucmVjdkVuY29kaW5nUGFyYW1ldGVycy5mb3JFYWNoKGZ1bmN0aW9uKHApIHtcbiAgICAgICAgICBkZWxldGUgcC5ydHg7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKHRyYW5zY2VpdmVyLnJlY3ZFbmNvZGluZ1BhcmFtZXRlcnMubGVuZ3RoKSB7XG4gICAgICAgIHBhcmFtcy5lbmNvZGluZ3MgPSB0cmFuc2NlaXZlci5yZWN2RW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLmVuY29kaW5ncyA9IFt7fV07XG4gICAgICB9XG4gICAgICBwYXJhbXMucnRjcCA9IHtcbiAgICAgICAgY29tcG91bmQ6IHRyYW5zY2VpdmVyLnJ0Y3BQYXJhbWV0ZXJzLmNvbXBvdW5kXG4gICAgICB9O1xuICAgICAgaWYgKHRyYW5zY2VpdmVyLnJ0Y3BQYXJhbWV0ZXJzLmNuYW1lKSB7XG4gICAgICAgIHBhcmFtcy5ydGNwLmNuYW1lID0gdHJhbnNjZWl2ZXIucnRjcFBhcmFtZXRlcnMuY25hbWU7XG4gICAgICB9XG4gICAgICBpZiAodHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVycy5sZW5ndGgpIHtcbiAgICAgICAgcGFyYW1zLnJ0Y3Auc3NyYyA9IHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYztcbiAgICAgIH1cbiAgICAgIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyLnJlY2VpdmUocGFyYW1zKTtcbiAgICB9XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnNldExvY2FsRGVzY3JpcHRpb24gPSBmdW5jdGlvbihkZXNjcmlwdGlvbikge1xuICAgIHZhciBwYyA9IHRoaXM7XG5cbiAgICAvLyBOb3RlOiBwcmFuc3dlciBpcyBub3Qgc3VwcG9ydGVkLlxuICAgIGlmIChbJ29mZmVyJywgJ2Fuc3dlciddLmluZGV4T2YoZGVzY3JpcHRpb24udHlwZSkgPT09IC0xKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobWFrZUVycm9yKCdUeXBlRXJyb3InLFxuICAgICAgICAgICdVbnN1cHBvcnRlZCB0eXBlIFwiJyArIGRlc2NyaXB0aW9uLnR5cGUgKyAnXCInKSk7XG4gICAgfVxuXG4gICAgaWYgKCFpc0FjdGlvbkFsbG93ZWRJblNpZ25hbGluZ1N0YXRlKCdzZXRMb2NhbERlc2NyaXB0aW9uJyxcbiAgICAgICAgZGVzY3JpcHRpb24udHlwZSwgcGMuc2lnbmFsaW5nU3RhdGUpIHx8IHBjLl9pc0Nsb3NlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG1ha2VFcnJvcignSW52YWxpZFN0YXRlRXJyb3InLFxuICAgICAgICAgICdDYW4gbm90IHNldCBsb2NhbCAnICsgZGVzY3JpcHRpb24udHlwZSArXG4gICAgICAgICAgJyBpbiBzdGF0ZSAnICsgcGMuc2lnbmFsaW5nU3RhdGUpKTtcbiAgICB9XG5cbiAgICB2YXIgc2VjdGlvbnM7XG4gICAgdmFyIHNlc3Npb25wYXJ0O1xuICAgIGlmIChkZXNjcmlwdGlvbi50eXBlID09PSAnb2ZmZXInKSB7XG4gICAgICAvLyBWRVJZIGxpbWl0ZWQgc3VwcG9ydCBmb3IgU0RQIG11bmdpbmcuIExpbWl0ZWQgdG86XG4gICAgICAvLyAqIGNoYW5naW5nIHRoZSBvcmRlciBvZiBjb2RlY3NcbiAgICAgIHNlY3Rpb25zID0gU0RQVXRpbHMuc3BsaXRTZWN0aW9ucyhkZXNjcmlwdGlvbi5zZHApO1xuICAgICAgc2Vzc2lvbnBhcnQgPSBzZWN0aW9ucy5zaGlmdCgpO1xuICAgICAgc2VjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihtZWRpYVNlY3Rpb24sIHNkcE1MaW5lSW5kZXgpIHtcbiAgICAgICAgdmFyIGNhcHMgPSBTRFBVdGlscy5wYXJzZVJ0cFBhcmFtZXRlcnMobWVkaWFTZWN0aW9uKTtcbiAgICAgICAgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmxvY2FsQ2FwYWJpbGl0aWVzID0gY2FwcztcbiAgICAgIH0pO1xuXG4gICAgICBwYy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlciwgc2RwTUxpbmVJbmRleCkge1xuICAgICAgICBwYy5fZ2F0aGVyKHRyYW5zY2VpdmVyLm1pZCwgc2RwTUxpbmVJbmRleCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGRlc2NyaXB0aW9uLnR5cGUgPT09ICdhbnN3ZXInKSB7XG4gICAgICBzZWN0aW9ucyA9IFNEUFV0aWxzLnNwbGl0U2VjdGlvbnMocGMuX3JlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgICBzZXNzaW9ucGFydCA9IHNlY3Rpb25zLnNoaWZ0KCk7XG4gICAgICB2YXIgaXNJY2VMaXRlID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgoc2Vzc2lvbnBhcnQsXG4gICAgICAgICAgJ2E9aWNlLWxpdGUnKS5sZW5ndGggPiAwO1xuICAgICAgc2VjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihtZWRpYVNlY3Rpb24sIHNkcE1MaW5lSW5kZXgpIHtcbiAgICAgICAgdmFyIHRyYW5zY2VpdmVyID0gcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdO1xuICAgICAgICB2YXIgaWNlR2F0aGVyZXIgPSB0cmFuc2NlaXZlci5pY2VHYXRoZXJlcjtcbiAgICAgICAgdmFyIGljZVRyYW5zcG9ydCA9IHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydDtcbiAgICAgICAgdmFyIGR0bHNUcmFuc3BvcnQgPSB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0O1xuICAgICAgICB2YXIgbG9jYWxDYXBhYmlsaXRpZXMgPSB0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcztcbiAgICAgICAgdmFyIHJlbW90ZUNhcGFiaWxpdGllcyA9IHRyYW5zY2VpdmVyLnJlbW90ZUNhcGFiaWxpdGllcztcblxuICAgICAgICAvLyB0cmVhdCBidW5kbGUtb25seSBhcyBub3QtcmVqZWN0ZWQuXG4gICAgICAgIHZhciByZWplY3RlZCA9IFNEUFV0aWxzLmlzUmVqZWN0ZWQobWVkaWFTZWN0aW9uKSAmJlxuICAgICAgICAgICAgU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1idW5kbGUtb25seScpLmxlbmd0aCA9PT0gMDtcblxuICAgICAgICBpZiAoIXJlamVjdGVkICYmICF0cmFuc2NlaXZlci5yZWplY3RlZCkge1xuICAgICAgICAgIHZhciByZW1vdGVJY2VQYXJhbWV0ZXJzID0gU0RQVXRpbHMuZ2V0SWNlUGFyYW1ldGVycyhcbiAgICAgICAgICAgICAgbWVkaWFTZWN0aW9uLCBzZXNzaW9ucGFydCk7XG4gICAgICAgICAgdmFyIHJlbW90ZUR0bHNQYXJhbWV0ZXJzID0gU0RQVXRpbHMuZ2V0RHRsc1BhcmFtZXRlcnMoXG4gICAgICAgICAgICAgIG1lZGlhU2VjdGlvbiwgc2Vzc2lvbnBhcnQpO1xuICAgICAgICAgIGlmIChpc0ljZUxpdGUpIHtcbiAgICAgICAgICAgIHJlbW90ZUR0bHNQYXJhbWV0ZXJzLnJvbGUgPSAnc2VydmVyJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIXBjLnVzaW5nQnVuZGxlIHx8IHNkcE1MaW5lSW5kZXggPT09IDApIHtcbiAgICAgICAgICAgIHBjLl9nYXRoZXIodHJhbnNjZWl2ZXIubWlkLCBzZHBNTGluZUluZGV4KTtcbiAgICAgICAgICAgIGlmIChpY2VUcmFuc3BvcnQuc3RhdGUgPT09ICduZXcnKSB7XG4gICAgICAgICAgICAgIGljZVRyYW5zcG9ydC5zdGFydChpY2VHYXRoZXJlciwgcmVtb3RlSWNlUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICAgIGlzSWNlTGl0ZSA/ICdjb250cm9sbGluZycgOiAnY29udHJvbGxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGR0bHNUcmFuc3BvcnQuc3RhdGUgPT09ICduZXcnKSB7XG4gICAgICAgICAgICAgIGR0bHNUcmFuc3BvcnQuc3RhcnQocmVtb3RlRHRsc1BhcmFtZXRlcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENhbGN1bGF0ZSBpbnRlcnNlY3Rpb24gb2YgY2FwYWJpbGl0aWVzLlxuICAgICAgICAgIHZhciBwYXJhbXMgPSBnZXRDb21tb25DYXBhYmlsaXRpZXMobG9jYWxDYXBhYmlsaXRpZXMsXG4gICAgICAgICAgICAgIHJlbW90ZUNhcGFiaWxpdGllcyk7XG5cbiAgICAgICAgICAvLyBTdGFydCB0aGUgUlRDUnRwU2VuZGVyLiBUaGUgUlRDUnRwUmVjZWl2ZXIgZm9yIHRoaXNcbiAgICAgICAgICAvLyB0cmFuc2NlaXZlciBoYXMgYWxyZWFkeSBiZWVuIHN0YXJ0ZWQgaW4gc2V0UmVtb3RlRGVzY3JpcHRpb24uXG4gICAgICAgICAgcGMuX3RyYW5zY2VpdmUodHJhbnNjZWl2ZXIsXG4gICAgICAgICAgICAgIHBhcmFtcy5jb2RlY3MubGVuZ3RoID4gMCxcbiAgICAgICAgICAgICAgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBwYy5fbG9jYWxEZXNjcmlwdGlvbiA9IHtcbiAgICAgIHR5cGU6IGRlc2NyaXB0aW9uLnR5cGUsXG4gICAgICBzZHA6IGRlc2NyaXB0aW9uLnNkcFxuICAgIH07XG4gICAgaWYgKGRlc2NyaXB0aW9uLnR5cGUgPT09ICdvZmZlcicpIHtcbiAgICAgIHBjLl91cGRhdGVTaWduYWxpbmdTdGF0ZSgnaGF2ZS1sb2NhbC1vZmZlcicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYy5fdXBkYXRlU2lnbmFsaW5nU3RhdGUoJ3N0YWJsZScpO1xuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb24gPSBmdW5jdGlvbihkZXNjcmlwdGlvbikge1xuICAgIHZhciBwYyA9IHRoaXM7XG5cbiAgICAvLyBOb3RlOiBwcmFuc3dlciBpcyBub3Qgc3VwcG9ydGVkLlxuICAgIGlmIChbJ29mZmVyJywgJ2Fuc3dlciddLmluZGV4T2YoZGVzY3JpcHRpb24udHlwZSkgPT09IC0xKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobWFrZUVycm9yKCdUeXBlRXJyb3InLFxuICAgICAgICAgICdVbnN1cHBvcnRlZCB0eXBlIFwiJyArIGRlc2NyaXB0aW9uLnR5cGUgKyAnXCInKSk7XG4gICAgfVxuXG4gICAgaWYgKCFpc0FjdGlvbkFsbG93ZWRJblNpZ25hbGluZ1N0YXRlKCdzZXRSZW1vdGVEZXNjcmlwdGlvbicsXG4gICAgICAgIGRlc2NyaXB0aW9uLnR5cGUsIHBjLnNpZ25hbGluZ1N0YXRlKSB8fCBwYy5faXNDbG9zZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChtYWtlRXJyb3IoJ0ludmFsaWRTdGF0ZUVycm9yJyxcbiAgICAgICAgICAnQ2FuIG5vdCBzZXQgcmVtb3RlICcgKyBkZXNjcmlwdGlvbi50eXBlICtcbiAgICAgICAgICAnIGluIHN0YXRlICcgKyBwYy5zaWduYWxpbmdTdGF0ZSkpO1xuICAgIH1cblxuICAgIHZhciBzdHJlYW1zID0ge307XG4gICAgcGMucmVtb3RlU3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgc3RyZWFtc1tzdHJlYW0uaWRdID0gc3RyZWFtO1xuICAgIH0pO1xuICAgIHZhciByZWNlaXZlckxpc3QgPSBbXTtcbiAgICB2YXIgc2VjdGlvbnMgPSBTRFBVdGlscy5zcGxpdFNlY3Rpb25zKGRlc2NyaXB0aW9uLnNkcCk7XG4gICAgdmFyIHNlc3Npb25wYXJ0ID0gc2VjdGlvbnMuc2hpZnQoKTtcbiAgICB2YXIgaXNJY2VMaXRlID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgoc2Vzc2lvbnBhcnQsXG4gICAgICAgICdhPWljZS1saXRlJykubGVuZ3RoID4gMDtcbiAgICB2YXIgdXNpbmdCdW5kbGUgPSBTRFBVdGlscy5tYXRjaFByZWZpeChzZXNzaW9ucGFydCxcbiAgICAgICAgJ2E9Z3JvdXA6QlVORExFICcpLmxlbmd0aCA+IDA7XG4gICAgcGMudXNpbmdCdW5kbGUgPSB1c2luZ0J1bmRsZTtcbiAgICB2YXIgaWNlT3B0aW9ucyA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KHNlc3Npb25wYXJ0LFxuICAgICAgICAnYT1pY2Utb3B0aW9uczonKVswXTtcbiAgICBpZiAoaWNlT3B0aW9ucykge1xuICAgICAgcGMuY2FuVHJpY2tsZUljZUNhbmRpZGF0ZXMgPSBpY2VPcHRpb25zLnN1YnN0cigxNCkuc3BsaXQoJyAnKVxuICAgICAgICAgIC5pbmRleE9mKCd0cmlja2xlJykgPj0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgcGMuY2FuVHJpY2tsZUljZUNhbmRpZGF0ZXMgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBzZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKG1lZGlhU2VjdGlvbiwgc2RwTUxpbmVJbmRleCkge1xuICAgICAgdmFyIGxpbmVzID0gU0RQVXRpbHMuc3BsaXRMaW5lcyhtZWRpYVNlY3Rpb24pO1xuICAgICAgdmFyIGtpbmQgPSBTRFBVdGlscy5nZXRLaW5kKG1lZGlhU2VjdGlvbik7XG4gICAgICAvLyB0cmVhdCBidW5kbGUtb25seSBhcyBub3QtcmVqZWN0ZWQuXG4gICAgICB2YXIgcmVqZWN0ZWQgPSBTRFBVdGlscy5pc1JlamVjdGVkKG1lZGlhU2VjdGlvbikgJiZcbiAgICAgICAgICBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPWJ1bmRsZS1vbmx5JykubGVuZ3RoID09PSAwO1xuICAgICAgdmFyIHByb3RvY29sID0gbGluZXNbMF0uc3Vic3RyKDIpLnNwbGl0KCcgJylbMl07XG5cbiAgICAgIHZhciBkaXJlY3Rpb24gPSBTRFBVdGlscy5nZXREaXJlY3Rpb24obWVkaWFTZWN0aW9uLCBzZXNzaW9ucGFydCk7XG4gICAgICB2YXIgcmVtb3RlTXNpZCA9IFNEUFV0aWxzLnBhcnNlTXNpZChtZWRpYVNlY3Rpb24pO1xuXG4gICAgICB2YXIgbWlkID0gU0RQVXRpbHMuZ2V0TWlkKG1lZGlhU2VjdGlvbikgfHwgU0RQVXRpbHMuZ2VuZXJhdGVJZGVudGlmaWVyKCk7XG5cbiAgICAgIC8vIFJlamVjdCBkYXRhY2hhbm5lbHMgd2hpY2ggYXJlIG5vdCBpbXBsZW1lbnRlZCB5ZXQuXG4gICAgICBpZiAocmVqZWN0ZWQgfHwgKGtpbmQgPT09ICdhcHBsaWNhdGlvbicgJiYgKHByb3RvY29sID09PSAnRFRMUy9TQ1RQJyB8fFxuICAgICAgICAgIHByb3RvY29sID09PSAnVURQL0RUTFMvU0NUUCcpKSkge1xuICAgICAgICAvLyBUT0RPOiB0aGlzIGlzIGRhbmdlcm91cyBpbiB0aGUgY2FzZSB3aGVyZSBhIG5vbi1yZWplY3RlZCBtLWxpbmVcbiAgICAgICAgLy8gICAgIGJlY29tZXMgcmVqZWN0ZWQuXG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XSA9IHtcbiAgICAgICAgICBtaWQ6IG1pZCxcbiAgICAgICAgICBraW5kOiBraW5kLFxuICAgICAgICAgIHByb3RvY29sOiBwcm90b2NvbCxcbiAgICAgICAgICByZWplY3RlZDogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICghcmVqZWN0ZWQgJiYgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdICYmXG4gICAgICAgICAgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLnJlamVjdGVkKSB7XG4gICAgICAgIC8vIHJlY3ljbGUgYSByZWplY3RlZCB0cmFuc2NlaXZlci5cbiAgICAgICAgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdID0gcGMuX2NyZWF0ZVRyYW5zY2VpdmVyKGtpbmQsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICB2YXIgdHJhbnNjZWl2ZXI7XG4gICAgICB2YXIgaWNlR2F0aGVyZXI7XG4gICAgICB2YXIgaWNlVHJhbnNwb3J0O1xuICAgICAgdmFyIGR0bHNUcmFuc3BvcnQ7XG4gICAgICB2YXIgcnRwUmVjZWl2ZXI7XG4gICAgICB2YXIgc2VuZEVuY29kaW5nUGFyYW1ldGVycztcbiAgICAgIHZhciByZWN2RW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgICAgdmFyIGxvY2FsQ2FwYWJpbGl0aWVzO1xuXG4gICAgICB2YXIgdHJhY2s7XG4gICAgICAvLyBGSVhNRTogZW5zdXJlIHRoZSBtZWRpYVNlY3Rpb24gaGFzIHJ0Y3AtbXV4IHNldC5cbiAgICAgIHZhciByZW1vdGVDYXBhYmlsaXRpZXMgPSBTRFBVdGlscy5wYXJzZVJ0cFBhcmFtZXRlcnMobWVkaWFTZWN0aW9uKTtcbiAgICAgIHZhciByZW1vdGVJY2VQYXJhbWV0ZXJzO1xuICAgICAgdmFyIHJlbW90ZUR0bHNQYXJhbWV0ZXJzO1xuICAgICAgaWYgKCFyZWplY3RlZCkge1xuICAgICAgICByZW1vdGVJY2VQYXJhbWV0ZXJzID0gU0RQVXRpbHMuZ2V0SWNlUGFyYW1ldGVycyhtZWRpYVNlY3Rpb24sXG4gICAgICAgICAgICBzZXNzaW9ucGFydCk7XG4gICAgICAgIHJlbW90ZUR0bHNQYXJhbWV0ZXJzID0gU0RQVXRpbHMuZ2V0RHRsc1BhcmFtZXRlcnMobWVkaWFTZWN0aW9uLFxuICAgICAgICAgICAgc2Vzc2lvbnBhcnQpO1xuICAgICAgICByZW1vdGVEdGxzUGFyYW1ldGVycy5yb2xlID0gJ2NsaWVudCc7XG4gICAgICB9XG4gICAgICByZWN2RW5jb2RpbmdQYXJhbWV0ZXJzID1cbiAgICAgICAgICBTRFBVdGlscy5wYXJzZVJ0cEVuY29kaW5nUGFyYW1ldGVycyhtZWRpYVNlY3Rpb24pO1xuXG4gICAgICB2YXIgcnRjcFBhcmFtZXRlcnMgPSBTRFBVdGlscy5wYXJzZVJ0Y3BQYXJhbWV0ZXJzKG1lZGlhU2VjdGlvbik7XG5cbiAgICAgIHZhciBpc0NvbXBsZXRlID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLFxuICAgICAgICAgICdhPWVuZC1vZi1jYW5kaWRhdGVzJywgc2Vzc2lvbnBhcnQpLmxlbmd0aCA+IDA7XG4gICAgICB2YXIgY2FuZHMgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPWNhbmRpZGF0ZTonKVxuICAgICAgICAgIC5tYXAoZnVuY3Rpb24oY2FuZCkge1xuICAgICAgICAgICAgcmV0dXJuIFNEUFV0aWxzLnBhcnNlQ2FuZGlkYXRlKGNhbmQpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihjYW5kKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FuZC5jb21wb25lbnQgPT09IDE7XG4gICAgICAgICAgfSk7XG5cbiAgICAgIC8vIENoZWNrIGlmIHdlIGNhbiB1c2UgQlVORExFIGFuZCBkaXNwb3NlIHRyYW5zcG9ydHMuXG4gICAgICBpZiAoKGRlc2NyaXB0aW9uLnR5cGUgPT09ICdvZmZlcicgfHwgZGVzY3JpcHRpb24udHlwZSA9PT0gJ2Fuc3dlcicpICYmXG4gICAgICAgICAgIXJlamVjdGVkICYmIHVzaW5nQnVuZGxlICYmIHNkcE1MaW5lSW5kZXggPiAwICYmXG4gICAgICAgICAgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdKSB7XG4gICAgICAgIHBjLl9kaXNwb3NlSWNlQW5kRHRsc1RyYW5zcG9ydHMoc2RwTUxpbmVJbmRleCk7XG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5pY2VHYXRoZXJlciA9XG4gICAgICAgICAgICBwYy50cmFuc2NlaXZlcnNbMF0uaWNlR2F0aGVyZXI7XG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5pY2VUcmFuc3BvcnQgPVxuICAgICAgICAgICAgcGMudHJhbnNjZWl2ZXJzWzBdLmljZVRyYW5zcG9ydDtcbiAgICAgICAgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmR0bHNUcmFuc3BvcnQgPVxuICAgICAgICAgICAgcGMudHJhbnNjZWl2ZXJzWzBdLmR0bHNUcmFuc3BvcnQ7XG4gICAgICAgIGlmIChwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0ucnRwU2VuZGVyKSB7XG4gICAgICAgICAgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLnJ0cFNlbmRlci5zZXRUcmFuc3BvcnQoXG4gICAgICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1swXS5kdGxzVHJhbnNwb3J0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLnJ0cFJlY2VpdmVyKSB7XG4gICAgICAgICAgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLnJ0cFJlY2VpdmVyLnNldFRyYW5zcG9ydChcbiAgICAgICAgICAgICAgcGMudHJhbnNjZWl2ZXJzWzBdLmR0bHNUcmFuc3BvcnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZGVzY3JpcHRpb24udHlwZSA9PT0gJ29mZmVyJyAmJiAhcmVqZWN0ZWQpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIgPSBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0gfHxcbiAgICAgICAgICAgIHBjLl9jcmVhdGVUcmFuc2NlaXZlcihraW5kKTtcbiAgICAgICAgdHJhbnNjZWl2ZXIubWlkID0gbWlkO1xuXG4gICAgICAgIGlmICghdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIpIHtcbiAgICAgICAgICB0cmFuc2NlaXZlci5pY2VHYXRoZXJlciA9IHBjLl9jcmVhdGVJY2VHYXRoZXJlcihzZHBNTGluZUluZGV4LFxuICAgICAgICAgICAgICB1c2luZ0J1bmRsZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2FuZHMubGVuZ3RoICYmIHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydC5zdGF0ZSA9PT0gJ25ldycpIHtcbiAgICAgICAgICBpZiAoaXNDb21wbGV0ZSAmJiAoIXVzaW5nQnVuZGxlIHx8IHNkcE1MaW5lSW5kZXggPT09IDApKSB7XG4gICAgICAgICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuc2V0UmVtb3RlQ2FuZGlkYXRlcyhjYW5kcyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbmRzLmZvckVhY2goZnVuY3Rpb24oY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgIG1heWJlQWRkQ2FuZGlkYXRlKHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCwgY2FuZGlkYXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxvY2FsQ2FwYWJpbGl0aWVzID0gd2luZG93LlJUQ1J0cFJlY2VpdmVyLmdldENhcGFiaWxpdGllcyhraW5kKTtcblxuICAgICAgICAvLyBmaWx0ZXIgUlRYIHVudGlsIGFkZGl0aW9uYWwgc3R1ZmYgbmVlZGVkIGZvciBSVFggaXMgaW1wbGVtZW50ZWRcbiAgICAgICAgLy8gaW4gYWRhcHRlci5qc1xuICAgICAgICBpZiAoZWRnZVZlcnNpb24gPCAxNTAxOSkge1xuICAgICAgICAgIGxvY2FsQ2FwYWJpbGl0aWVzLmNvZGVjcyA9IGxvY2FsQ2FwYWJpbGl0aWVzLmNvZGVjcy5maWx0ZXIoXG4gICAgICAgICAgICAgIGZ1bmN0aW9uKGNvZGVjKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvZGVjLm5hbWUgIT09ICdydHgnO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbmRFbmNvZGluZ1BhcmFtZXRlcnMgPSB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzIHx8IFt7XG4gICAgICAgICAgc3NyYzogKDIgKiBzZHBNTGluZUluZGV4ICsgMikgKiAxMDAxXG4gICAgICAgIH1dO1xuXG4gICAgICAgIC8vIFRPRE86IHJld3JpdGUgdG8gdXNlIGh0dHA6Ly93M2MuZ2l0aHViLmlvL3dlYnJ0Yy1wYy8jc2V0LWFzc29jaWF0ZWQtcmVtb3RlLXN0cmVhbXNcbiAgICAgICAgdmFyIGlzTmV3VHJhY2sgPSBmYWxzZTtcbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ3NlbmRyZWN2JyB8fCBkaXJlY3Rpb24gPT09ICdzZW5kb25seScpIHtcbiAgICAgICAgICBpc05ld1RyYWNrID0gIXRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyO1xuICAgICAgICAgIHJ0cFJlY2VpdmVyID0gdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIgfHxcbiAgICAgICAgICAgICAgbmV3IHdpbmRvdy5SVENSdHBSZWNlaXZlcih0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0LCBraW5kKTtcblxuICAgICAgICAgIGlmIChpc05ld1RyYWNrKSB7XG4gICAgICAgICAgICB2YXIgc3RyZWFtO1xuICAgICAgICAgICAgdHJhY2sgPSBydHBSZWNlaXZlci50cmFjaztcbiAgICAgICAgICAgIC8vIEZJWE1FOiBkb2VzIG5vdCB3b3JrIHdpdGggUGxhbiBCLlxuICAgICAgICAgICAgaWYgKHJlbW90ZU1zaWQgJiYgcmVtb3RlTXNpZC5zdHJlYW0gPT09ICctJykge1xuICAgICAgICAgICAgICAvLyBuby1vcC4gYSBzdHJlYW0gaWQgb2YgJy0nIG1lYW5zOiBubyBhc3NvY2lhdGVkIHN0cmVhbS5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVtb3RlTXNpZCkge1xuICAgICAgICAgICAgICBpZiAoIXN0cmVhbXNbcmVtb3RlTXNpZC5zdHJlYW1dKSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtc1tyZW1vdGVNc2lkLnN0cmVhbV0gPSBuZXcgd2luZG93Lk1lZGlhU3RyZWFtKCk7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0cmVhbXNbcmVtb3RlTXNpZC5zdHJlYW1dLCAnaWQnLCB7XG4gICAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVtb3RlTXNpZC5zdHJlYW07XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRyYWNrLCAnaWQnLCB7XG4gICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiByZW1vdGVNc2lkLnRyYWNrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHN0cmVhbSA9IHN0cmVhbXNbcmVtb3RlTXNpZC5zdHJlYW1dO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaWYgKCFzdHJlYW1zLmRlZmF1bHQpIHtcbiAgICAgICAgICAgICAgICBzdHJlYW1zLmRlZmF1bHQgPSBuZXcgd2luZG93Lk1lZGlhU3RyZWFtKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc3RyZWFtID0gc3RyZWFtcy5kZWZhdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0cmVhbSkge1xuICAgICAgICAgICAgICBhZGRUcmFja1RvU3RyZWFtQW5kRmlyZUV2ZW50KHRyYWNrLCBzdHJlYW0pO1xuICAgICAgICAgICAgICB0cmFuc2NlaXZlci5hc3NvY2lhdGVkUmVtb3RlTWVkaWFTdHJlYW1zLnB1c2goc3RyZWFtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlY2VpdmVyTGlzdC5wdXNoKFt0cmFjaywgcnRwUmVjZWl2ZXIsIHN0cmVhbV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5ydHBSZWNlaXZlciAmJiB0cmFuc2NlaXZlci5ydHBSZWNlaXZlci50cmFjaykge1xuICAgICAgICAgIHRyYW5zY2VpdmVyLmFzc29jaWF0ZWRSZW1vdGVNZWRpYVN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbihzKSB7XG4gICAgICAgICAgICB2YXIgbmF0aXZlVHJhY2sgPSBzLmdldFRyYWNrcygpLmZpbmQoZnVuY3Rpb24odCkge1xuICAgICAgICAgICAgICByZXR1cm4gdC5pZCA9PT0gdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIudHJhY2suaWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChuYXRpdmVUcmFjaykge1xuICAgICAgICAgICAgICByZW1vdmVUcmFja0Zyb21TdHJlYW1BbmRGaXJlRXZlbnQobmF0aXZlVHJhY2ssIHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRyYW5zY2VpdmVyLmFzc29jaWF0ZWRSZW1vdGVNZWRpYVN0cmVhbXMgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyYW5zY2VpdmVyLmxvY2FsQ2FwYWJpbGl0aWVzID0gbG9jYWxDYXBhYmlsaXRpZXM7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJlbW90ZUNhcGFiaWxpdGllcyA9IHJlbW90ZUNhcGFiaWxpdGllcztcbiAgICAgICAgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIgPSBydHBSZWNlaXZlcjtcbiAgICAgICAgdHJhbnNjZWl2ZXIucnRjcFBhcmFtZXRlcnMgPSBydGNwUGFyYW1ldGVycztcbiAgICAgICAgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVycyA9IHNlbmRFbmNvZGluZ1BhcmFtZXRlcnM7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJlY3ZFbmNvZGluZ1BhcmFtZXRlcnMgPSByZWN2RW5jb2RpbmdQYXJhbWV0ZXJzO1xuXG4gICAgICAgIC8vIFN0YXJ0IHRoZSBSVENSdHBSZWNlaXZlciBub3cuIFRoZSBSVFBTZW5kZXIgaXMgc3RhcnRlZCBpblxuICAgICAgICAvLyBzZXRMb2NhbERlc2NyaXB0aW9uLlxuICAgICAgICBwYy5fdHJhbnNjZWl2ZShwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0sXG4gICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgIGlzTmV3VHJhY2spO1xuICAgICAgfSBlbHNlIGlmIChkZXNjcmlwdGlvbi50eXBlID09PSAnYW5zd2VyJyAmJiAhcmVqZWN0ZWQpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIgPSBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF07XG4gICAgICAgIGljZUdhdGhlcmVyID0gdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXI7XG4gICAgICAgIGljZVRyYW5zcG9ydCA9IHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydDtcbiAgICAgICAgZHRsc1RyYW5zcG9ydCA9IHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQ7XG4gICAgICAgIHJ0cFJlY2VpdmVyID0gdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXI7XG4gICAgICAgIHNlbmRFbmNvZGluZ1BhcmFtZXRlcnMgPSB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgICAgICBsb2NhbENhcGFiaWxpdGllcyA9IHRyYW5zY2VpdmVyLmxvY2FsQ2FwYWJpbGl0aWVzO1xuXG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5yZWN2RW5jb2RpbmdQYXJhbWV0ZXJzID1cbiAgICAgICAgICAgIHJlY3ZFbmNvZGluZ1BhcmFtZXRlcnM7XG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5yZW1vdGVDYXBhYmlsaXRpZXMgPVxuICAgICAgICAgICAgcmVtb3RlQ2FwYWJpbGl0aWVzO1xuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0ucnRjcFBhcmFtZXRlcnMgPSBydGNwUGFyYW1ldGVycztcblxuICAgICAgICBpZiAoY2FuZHMubGVuZ3RoICYmIGljZVRyYW5zcG9ydC5zdGF0ZSA9PT0gJ25ldycpIHtcbiAgICAgICAgICBpZiAoKGlzSWNlTGl0ZSB8fCBpc0NvbXBsZXRlKSAmJlxuICAgICAgICAgICAgICAoIXVzaW5nQnVuZGxlIHx8IHNkcE1MaW5lSW5kZXggPT09IDApKSB7XG4gICAgICAgICAgICBpY2VUcmFuc3BvcnQuc2V0UmVtb3RlQ2FuZGlkYXRlcyhjYW5kcyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbmRzLmZvckVhY2goZnVuY3Rpb24oY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgIG1heWJlQWRkQ2FuZGlkYXRlKHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCwgY2FuZGlkYXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdXNpbmdCdW5kbGUgfHwgc2RwTUxpbmVJbmRleCA9PT0gMCkge1xuICAgICAgICAgIGlmIChpY2VUcmFuc3BvcnQuc3RhdGUgPT09ICduZXcnKSB7XG4gICAgICAgICAgICBpY2VUcmFuc3BvcnQuc3RhcnQoaWNlR2F0aGVyZXIsIHJlbW90ZUljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgJ2NvbnRyb2xsaW5nJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChkdGxzVHJhbnNwb3J0LnN0YXRlID09PSAnbmV3Jykge1xuICAgICAgICAgICAgZHRsc1RyYW5zcG9ydC5zdGFydChyZW1vdGVEdGxzUGFyYW1ldGVycyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhlIG9mZmVyIGNvbnRhaW5lZCBSVFggYnV0IHRoZSBhbnN3ZXIgZGlkIG5vdCxcbiAgICAgICAgLy8gcmVtb3ZlIFJUWCBmcm9tIHNlbmRFbmNvZGluZ1BhcmFtZXRlcnMuXG4gICAgICAgIHZhciBjb21tb25DYXBhYmlsaXRpZXMgPSBnZXRDb21tb25DYXBhYmlsaXRpZXMoXG4gICAgICAgICAgdHJhbnNjZWl2ZXIubG9jYWxDYXBhYmlsaXRpZXMsXG4gICAgICAgICAgdHJhbnNjZWl2ZXIucmVtb3RlQ2FwYWJpbGl0aWVzKTtcblxuICAgICAgICB2YXIgaGFzUnR4ID0gY29tbW9uQ2FwYWJpbGl0aWVzLmNvZGVjcy5maWx0ZXIoZnVuY3Rpb24oYykge1xuICAgICAgICAgIHJldHVybiBjLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3J0eCc7XG4gICAgICAgIH0pLmxlbmd0aDtcbiAgICAgICAgaWYgKCFoYXNSdHggJiYgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHgpIHtcbiAgICAgICAgICBkZWxldGUgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHg7XG4gICAgICAgIH1cblxuICAgICAgICBwYy5fdHJhbnNjZWl2ZSh0cmFuc2NlaXZlcixcbiAgICAgICAgICAgIGRpcmVjdGlvbiA9PT0gJ3NlbmRyZWN2JyB8fCBkaXJlY3Rpb24gPT09ICdyZWN2b25seScsXG4gICAgICAgICAgICBkaXJlY3Rpb24gPT09ICdzZW5kcmVjdicgfHwgZGlyZWN0aW9uID09PSAnc2VuZG9ubHknKTtcblxuICAgICAgICAvLyBUT0RPOiByZXdyaXRlIHRvIHVzZSBodHRwOi8vdzNjLmdpdGh1Yi5pby93ZWJydGMtcGMvI3NldC1hc3NvY2lhdGVkLXJlbW90ZS1zdHJlYW1zXG4gICAgICAgIGlmIChydHBSZWNlaXZlciAmJlxuICAgICAgICAgICAgKGRpcmVjdGlvbiA9PT0gJ3NlbmRyZWN2JyB8fCBkaXJlY3Rpb24gPT09ICdzZW5kb25seScpKSB7XG4gICAgICAgICAgdHJhY2sgPSBydHBSZWNlaXZlci50cmFjaztcbiAgICAgICAgICBpZiAocmVtb3RlTXNpZCkge1xuICAgICAgICAgICAgaWYgKCFzdHJlYW1zW3JlbW90ZU1zaWQuc3RyZWFtXSkge1xuICAgICAgICAgICAgICBzdHJlYW1zW3JlbW90ZU1zaWQuc3RyZWFtXSA9IG5ldyB3aW5kb3cuTWVkaWFTdHJlYW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFkZFRyYWNrVG9TdHJlYW1BbmRGaXJlRXZlbnQodHJhY2ssIHN0cmVhbXNbcmVtb3RlTXNpZC5zdHJlYW1dKTtcbiAgICAgICAgICAgIHJlY2VpdmVyTGlzdC5wdXNoKFt0cmFjaywgcnRwUmVjZWl2ZXIsIHN0cmVhbXNbcmVtb3RlTXNpZC5zdHJlYW1dXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghc3RyZWFtcy5kZWZhdWx0KSB7XG4gICAgICAgICAgICAgIHN0cmVhbXMuZGVmYXVsdCA9IG5ldyB3aW5kb3cuTWVkaWFTdHJlYW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFkZFRyYWNrVG9TdHJlYW1BbmRGaXJlRXZlbnQodHJhY2ssIHN0cmVhbXMuZGVmYXVsdCk7XG4gICAgICAgICAgICByZWNlaXZlckxpc3QucHVzaChbdHJhY2ssIHJ0cFJlY2VpdmVyLCBzdHJlYW1zLmRlZmF1bHRdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gRklYTUU6IGFjdHVhbGx5IHRoZSByZWNlaXZlciBzaG91bGQgYmUgY3JlYXRlZCBsYXRlci5cbiAgICAgICAgICBkZWxldGUgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChwYy5fZHRsc1JvbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcGMuX2R0bHNSb2xlID0gZGVzY3JpcHRpb24udHlwZSA9PT0gJ29mZmVyJyA/ICdhY3RpdmUnIDogJ3Bhc3NpdmUnO1xuICAgIH1cblxuICAgIHBjLl9yZW1vdGVEZXNjcmlwdGlvbiA9IHtcbiAgICAgIHR5cGU6IGRlc2NyaXB0aW9uLnR5cGUsXG4gICAgICBzZHA6IGRlc2NyaXB0aW9uLnNkcFxuICAgIH07XG4gICAgaWYgKGRlc2NyaXB0aW9uLnR5cGUgPT09ICdvZmZlcicpIHtcbiAgICAgIHBjLl91cGRhdGVTaWduYWxpbmdTdGF0ZSgnaGF2ZS1yZW1vdGUtb2ZmZXInKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGMuX3VwZGF0ZVNpZ25hbGluZ1N0YXRlKCdzdGFibGUnKTtcbiAgICB9XG4gICAgT2JqZWN0LmtleXMoc3RyZWFtcykuZm9yRWFjaChmdW5jdGlvbihzaWQpIHtcbiAgICAgIHZhciBzdHJlYW0gPSBzdHJlYW1zW3NpZF07XG4gICAgICBpZiAoc3RyZWFtLmdldFRyYWNrcygpLmxlbmd0aCkge1xuICAgICAgICBpZiAocGMucmVtb3RlU3RyZWFtcy5pbmRleE9mKHN0cmVhbSkgPT09IC0xKSB7XG4gICAgICAgICAgcGMucmVtb3RlU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEV2ZW50KCdhZGRzdHJlYW0nKTtcbiAgICAgICAgICBldmVudC5zdHJlYW0gPSBzdHJlYW07XG4gICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwYy5fZGlzcGF0Y2hFdmVudCgnYWRkc3RyZWFtJywgZXZlbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVjZWl2ZXJMaXN0LmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgIHZhciB0cmFjayA9IGl0ZW1bMF07XG4gICAgICAgICAgdmFyIHJlY2VpdmVyID0gaXRlbVsxXTtcbiAgICAgICAgICBpZiAoc3RyZWFtLmlkICE9PSBpdGVtWzJdLmlkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGZpcmVBZGRUcmFjayhwYywgdHJhY2ssIHJlY2VpdmVyLCBbc3RyZWFtXSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJlY2VpdmVyTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIGlmIChpdGVtWzJdKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGZpcmVBZGRUcmFjayhwYywgaXRlbVswXSwgaXRlbVsxXSwgW10pO1xuICAgIH0pO1xuXG4gICAgLy8gY2hlY2sgd2hldGhlciBhZGRJY2VDYW5kaWRhdGUoe30pIHdhcyBjYWxsZWQgd2l0aGluIGZvdXIgc2Vjb25kcyBhZnRlclxuICAgIC8vIHNldFJlbW90ZURlc2NyaXB0aW9uLlxuICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEocGMgJiYgcGMudHJhbnNjZWl2ZXJzKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBwYy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgICBpZiAodHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0ICYmXG4gICAgICAgICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuc3RhdGUgPT09ICduZXcnICYmXG4gICAgICAgICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuZ2V0UmVtb3RlQ2FuZGlkYXRlcygpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ1RpbWVvdXQgZm9yIGFkZFJlbW90ZUNhbmRpZGF0ZS4gQ29uc2lkZXIgc2VuZGluZyAnICtcbiAgICAgICAgICAgICAgJ2FuIGVuZC1vZi1jYW5kaWRhdGVzIG5vdGlmaWNhdGlvbicpO1xuICAgICAgICAgIHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydC5hZGRSZW1vdGVDYW5kaWRhdGUoe30pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LCA0MDAwKTtcblxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRyYW5zY2VpdmVycy5mb3JFYWNoKGZ1bmN0aW9uKHRyYW5zY2VpdmVyKSB7XG4gICAgICAvKiBub3QgeWV0XG4gICAgICBpZiAodHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIuY2xvc2UoKTtcbiAgICAgIH1cbiAgICAgICovXG4gICAgICBpZiAodHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0KSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydC5zdG9wKCk7XG4gICAgICB9XG4gICAgICBpZiAodHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydCkge1xuICAgICAgICB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0LnN0b3AoKTtcbiAgICAgIH1cbiAgICAgIGlmICh0cmFuc2NlaXZlci5ydHBTZW5kZXIpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyLnN0b3AoKTtcbiAgICAgIH1cbiAgICAgIGlmICh0cmFuc2NlaXZlci5ydHBSZWNlaXZlcikge1xuICAgICAgICB0cmFuc2NlaXZlci5ydHBSZWNlaXZlci5zdG9wKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gRklYTUU6IGNsZWFuIHVwIHRyYWNrcywgbG9jYWwgc3RyZWFtcywgcmVtb3RlIHN0cmVhbXMsIGV0Y1xuICAgIHRoaXMuX2lzQ2xvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLl91cGRhdGVTaWduYWxpbmdTdGF0ZSgnY2xvc2VkJyk7XG4gIH07XG5cbiAgLy8gVXBkYXRlIHRoZSBzaWduYWxpbmcgc3RhdGUuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5fdXBkYXRlU2lnbmFsaW5nU3RhdGUgPSBmdW5jdGlvbihuZXdTdGF0ZSkge1xuICAgIHRoaXMuc2lnbmFsaW5nU3RhdGUgPSBuZXdTdGF0ZTtcbiAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJyk7XG4gICAgdGhpcy5fZGlzcGF0Y2hFdmVudCgnc2lnbmFsaW5nc3RhdGVjaGFuZ2UnLCBldmVudCk7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgdG8gZmlyZSB0aGUgbmVnb3RpYXRpb25uZWVkZWQgZXZlbnQuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5fbWF5YmVGaXJlTmVnb3RpYXRpb25OZWVkZWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuICAgIGlmICh0aGlzLnNpZ25hbGluZ1N0YXRlICE9PSAnc3RhYmxlJyB8fCB0aGlzLm5lZWROZWdvdGlhdGlvbiA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLm5lZWROZWdvdGlhdGlvbiA9IHRydWU7XG4gICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocGMubmVlZE5lZ290aWF0aW9uKSB7XG4gICAgICAgIHBjLm5lZWROZWdvdGlhdGlvbiA9IGZhbHNlO1xuICAgICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ25lZ290aWF0aW9ubmVlZGVkJyk7XG4gICAgICAgIHBjLl9kaXNwYXRjaEV2ZW50KCduZWdvdGlhdGlvbm5lZWRlZCcsIGV2ZW50KTtcbiAgICAgIH1cbiAgICB9LCAwKTtcbiAgfTtcblxuICAvLyBVcGRhdGUgdGhlIGljZSBjb25uZWN0aW9uIHN0YXRlLlxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZUljZUNvbm5lY3Rpb25TdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBuZXdTdGF0ZTtcbiAgICB2YXIgc3RhdGVzID0ge1xuICAgICAgJ25ldyc6IDAsXG4gICAgICBjbG9zZWQ6IDAsXG4gICAgICBjaGVja2luZzogMCxcbiAgICAgIGNvbm5lY3RlZDogMCxcbiAgICAgIGNvbXBsZXRlZDogMCxcbiAgICAgIGRpc2Nvbm5lY3RlZDogMCxcbiAgICAgIGZhaWxlZDogMFxuICAgIH07XG4gICAgdGhpcy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgaWYgKHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCAmJiAhdHJhbnNjZWl2ZXIucmVqZWN0ZWQpIHtcbiAgICAgICAgc3RhdGVzW3RyYW5zY2VpdmVyLmljZVRyYW5zcG9ydC5zdGF0ZV0rKztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIG5ld1N0YXRlID0gJ25ldyc7XG4gICAgaWYgKHN0YXRlcy5mYWlsZWQgPiAwKSB7XG4gICAgICBuZXdTdGF0ZSA9ICdmYWlsZWQnO1xuICAgIH0gZWxzZSBpZiAoc3RhdGVzLmNoZWNraW5nID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnY2hlY2tpbmcnO1xuICAgIH0gZWxzZSBpZiAoc3RhdGVzLmRpc2Nvbm5lY3RlZCA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2Rpc2Nvbm5lY3RlZCc7XG4gICAgfSBlbHNlIGlmIChzdGF0ZXMubmV3ID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnbmV3JztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5jb25uZWN0ZWQgPiAwKSB7XG4gICAgICBuZXdTdGF0ZSA9ICdjb25uZWN0ZWQnO1xuICAgIH0gZWxzZSBpZiAoc3RhdGVzLmNvbXBsZXRlZCA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2NvbXBsZXRlZCc7XG4gICAgfVxuXG4gICAgaWYgKG5ld1N0YXRlICE9PSB0aGlzLmljZUNvbm5lY3Rpb25TdGF0ZSkge1xuICAgICAgdGhpcy5pY2VDb25uZWN0aW9uU3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgIHZhciBldmVudCA9IG5ldyBFdmVudCgnaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJyk7XG4gICAgICB0aGlzLl9kaXNwYXRjaEV2ZW50KCdpY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UnLCBldmVudCk7XG4gICAgfVxuICB9O1xuXG4gIC8vIFVwZGF0ZSB0aGUgY29ubmVjdGlvbiBzdGF0ZS5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl91cGRhdGVDb25uZWN0aW9uU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmV3U3RhdGU7XG4gICAgdmFyIHN0YXRlcyA9IHtcbiAgICAgICduZXcnOiAwLFxuICAgICAgY2xvc2VkOiAwLFxuICAgICAgY29ubmVjdGluZzogMCxcbiAgICAgIGNvbm5lY3RlZDogMCxcbiAgICAgIGNvbXBsZXRlZDogMCxcbiAgICAgIGRpc2Nvbm5lY3RlZDogMCxcbiAgICAgIGZhaWxlZDogMFxuICAgIH07XG4gICAgdGhpcy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgaWYgKHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCAmJiB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0ICYmXG4gICAgICAgICAgIXRyYW5zY2VpdmVyLnJlamVjdGVkKSB7XG4gICAgICAgIHN0YXRlc1t0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuc3RhdGVdKys7XG4gICAgICAgIHN0YXRlc1t0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0LnN0YXRlXSsrO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8vIElDRVRyYW5zcG9ydC5jb21wbGV0ZWQgYW5kIGNvbm5lY3RlZCBhcmUgdGhlIHNhbWUgZm9yIHRoaXMgcHVycG9zZS5cbiAgICBzdGF0ZXMuY29ubmVjdGVkICs9IHN0YXRlcy5jb21wbGV0ZWQ7XG5cbiAgICBuZXdTdGF0ZSA9ICduZXcnO1xuICAgIGlmIChzdGF0ZXMuZmFpbGVkID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnZmFpbGVkJztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5jb25uZWN0aW5nID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnY29ubmVjdGluZyc7XG4gICAgfSBlbHNlIGlmIChzdGF0ZXMuZGlzY29ubmVjdGVkID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnZGlzY29ubmVjdGVkJztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5uZXcgPiAwKSB7XG4gICAgICBuZXdTdGF0ZSA9ICduZXcnO1xuICAgIH0gZWxzZSBpZiAoc3RhdGVzLmNvbm5lY3RlZCA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2Nvbm5lY3RlZCc7XG4gICAgfVxuXG4gICAgaWYgKG5ld1N0YXRlICE9PSB0aGlzLmNvbm5lY3Rpb25TdGF0ZSkge1xuICAgICAgdGhpcy5jb25uZWN0aW9uU3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgIHZhciBldmVudCA9IG5ldyBFdmVudCgnY29ubmVjdGlvbnN0YXRlY2hhbmdlJyk7XG4gICAgICB0aGlzLl9kaXNwYXRjaEV2ZW50KCdjb25uZWN0aW9uc3RhdGVjaGFuZ2UnLCBldmVudCk7XG4gICAgfVxuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVPZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYyA9IHRoaXM7XG5cbiAgICBpZiAocGMuX2lzQ2xvc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobWFrZUVycm9yKCdJbnZhbGlkU3RhdGVFcnJvcicsXG4gICAgICAgICAgJ0NhbiBub3QgY2FsbCBjcmVhdGVPZmZlciBhZnRlciBjbG9zZScpKTtcbiAgICB9XG5cbiAgICB2YXIgbnVtQXVkaW9UcmFja3MgPSBwYy50cmFuc2NlaXZlcnMuZmlsdGVyKGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiB0LmtpbmQgPT09ICdhdWRpbyc7XG4gICAgfSkubGVuZ3RoO1xuICAgIHZhciBudW1WaWRlb1RyYWNrcyA9IHBjLnRyYW5zY2VpdmVycy5maWx0ZXIoZnVuY3Rpb24odCkge1xuICAgICAgcmV0dXJuIHQua2luZCA9PT0gJ3ZpZGVvJztcbiAgICB9KS5sZW5ndGg7XG5cbiAgICAvLyBEZXRlcm1pbmUgbnVtYmVyIG9mIGF1ZGlvIGFuZCB2aWRlbyB0cmFja3Mgd2UgbmVlZCB0byBzZW5kL3JlY3YuXG4gICAgdmFyIG9mZmVyT3B0aW9ucyA9IGFyZ3VtZW50c1swXTtcbiAgICBpZiAob2ZmZXJPcHRpb25zKSB7XG4gICAgICAvLyBSZWplY3QgQ2hyb21lIGxlZ2FjeSBjb25zdHJhaW50cy5cbiAgICAgIGlmIChvZmZlck9wdGlvbnMubWFuZGF0b3J5IHx8IG9mZmVyT3B0aW9ucy5vcHRpb25hbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgJ0xlZ2FjeSBtYW5kYXRvcnkvb3B0aW9uYWwgY29uc3RyYWludHMgbm90IHN1cHBvcnRlZC4nKTtcbiAgICAgIH1cbiAgICAgIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVBdWRpbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVBdWRpbyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIG51bUF1ZGlvVHJhY2tzID0gMTtcbiAgICAgICAgfSBlbHNlIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVBdWRpbyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBudW1BdWRpb1RyYWNrcyA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbnVtQXVkaW9UcmFja3MgPSBvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVBdWRpbztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZVZpZGVvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZVZpZGVvID09PSB0cnVlKSB7XG4gICAgICAgICAgbnVtVmlkZW9UcmFja3MgPSAxO1xuICAgICAgICB9IGVsc2UgaWYgKG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZVZpZGVvID09PSBmYWxzZSkge1xuICAgICAgICAgIG51bVZpZGVvVHJhY2tzID0gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBudW1WaWRlb1RyYWNrcyA9IG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZVZpZGVvO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIGlmICh0cmFuc2NlaXZlci5raW5kID09PSAnYXVkaW8nKSB7XG4gICAgICAgIG51bUF1ZGlvVHJhY2tzLS07XG4gICAgICAgIGlmIChudW1BdWRpb1RyYWNrcyA8IDApIHtcbiAgICAgICAgICB0cmFuc2NlaXZlci53YW50UmVjZWl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRyYW5zY2VpdmVyLmtpbmQgPT09ICd2aWRlbycpIHtcbiAgICAgICAgbnVtVmlkZW9UcmFja3MtLTtcbiAgICAgICAgaWYgKG51bVZpZGVvVHJhY2tzIDwgMCkge1xuICAgICAgICAgIHRyYW5zY2VpdmVyLndhbnRSZWNlaXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBNLWxpbmVzIGZvciByZWN2b25seSBzdHJlYW1zLlxuICAgIHdoaWxlIChudW1BdWRpb1RyYWNrcyA+IDAgfHwgbnVtVmlkZW9UcmFja3MgPiAwKSB7XG4gICAgICBpZiAobnVtQXVkaW9UcmFja3MgPiAwKSB7XG4gICAgICAgIHBjLl9jcmVhdGVUcmFuc2NlaXZlcignYXVkaW8nKTtcbiAgICAgICAgbnVtQXVkaW9UcmFja3MtLTtcbiAgICAgIH1cbiAgICAgIGlmIChudW1WaWRlb1RyYWNrcyA+IDApIHtcbiAgICAgICAgcGMuX2NyZWF0ZVRyYW5zY2VpdmVyKCd2aWRlbycpO1xuICAgICAgICBudW1WaWRlb1RyYWNrcy0tO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBzZHAgPSBTRFBVdGlscy53cml0ZVNlc3Npb25Cb2lsZXJwbGF0ZShwYy5fc2RwU2Vzc2lvbklkLFxuICAgICAgICBwYy5fc2RwU2Vzc2lvblZlcnNpb24rKyk7XG4gICAgcGMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIsIHNkcE1MaW5lSW5kZXgpIHtcbiAgICAgIC8vIEZvciBlYWNoIHRyYWNrLCBjcmVhdGUgYW4gaWNlIGdhdGhlcmVyLCBpY2UgdHJhbnNwb3J0LFxuICAgICAgLy8gZHRscyB0cmFuc3BvcnQsIHBvdGVudGlhbGx5IHJ0cHNlbmRlciBhbmQgcnRwcmVjZWl2ZXIuXG4gICAgICB2YXIgdHJhY2sgPSB0cmFuc2NlaXZlci50cmFjaztcbiAgICAgIHZhciBraW5kID0gdHJhbnNjZWl2ZXIua2luZDtcbiAgICAgIHZhciBtaWQgPSB0cmFuc2NlaXZlci5taWQgfHwgU0RQVXRpbHMuZ2VuZXJhdGVJZGVudGlmaWVyKCk7XG4gICAgICB0cmFuc2NlaXZlci5taWQgPSBtaWQ7XG5cbiAgICAgIGlmICghdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIgPSBwYy5fY3JlYXRlSWNlR2F0aGVyZXIoc2RwTUxpbmVJbmRleCxcbiAgICAgICAgICAgIHBjLnVzaW5nQnVuZGxlKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGxvY2FsQ2FwYWJpbGl0aWVzID0gd2luZG93LlJUQ1J0cFNlbmRlci5nZXRDYXBhYmlsaXRpZXMoa2luZCk7XG4gICAgICAvLyBmaWx0ZXIgUlRYIHVudGlsIGFkZGl0aW9uYWwgc3R1ZmYgbmVlZGVkIGZvciBSVFggaXMgaW1wbGVtZW50ZWRcbiAgICAgIC8vIGluIGFkYXB0ZXIuanNcbiAgICAgIGlmIChlZGdlVmVyc2lvbiA8IDE1MDE5KSB7XG4gICAgICAgIGxvY2FsQ2FwYWJpbGl0aWVzLmNvZGVjcyA9IGxvY2FsQ2FwYWJpbGl0aWVzLmNvZGVjcy5maWx0ZXIoXG4gICAgICAgICAgICBmdW5jdGlvbihjb2RlYykge1xuICAgICAgICAgICAgICByZXR1cm4gY29kZWMubmFtZSAhPT0gJ3J0eCc7XG4gICAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGxvY2FsQ2FwYWJpbGl0aWVzLmNvZGVjcy5mb3JFYWNoKGZ1bmN0aW9uKGNvZGVjKSB7XG4gICAgICAgIC8vIHdvcmsgYXJvdW5kIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC93ZWJydGMvaXNzdWVzL2RldGFpbD9pZD02NTUyXG4gICAgICAgIC8vIGJ5IGFkZGluZyBsZXZlbC1hc3ltbWV0cnktYWxsb3dlZD0xXG4gICAgICAgIGlmIChjb2RlYy5uYW1lID09PSAnSDI2NCcgJiZcbiAgICAgICAgICAgIGNvZGVjLnBhcmFtZXRlcnNbJ2xldmVsLWFzeW1tZXRyeS1hbGxvd2VkJ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvZGVjLnBhcmFtZXRlcnNbJ2xldmVsLWFzeW1tZXRyeS1hbGxvd2VkJ10gPSAnMSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmb3Igc3Vic2VxdWVudCBvZmZlcnMsIHdlIG1pZ2h0IGhhdmUgdG8gcmUtdXNlIHRoZSBwYXlsb2FkXG4gICAgICAgIC8vIHR5cGUgb2YgdGhlIGxhc3Qgb2ZmZXIuXG4gICAgICAgIGlmICh0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXMgJiZcbiAgICAgICAgICAgIHRyYW5zY2VpdmVyLnJlbW90ZUNhcGFiaWxpdGllcy5jb2RlY3MpIHtcbiAgICAgICAgICB0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXMuY29kZWNzLmZvckVhY2goZnVuY3Rpb24ocmVtb3RlQ29kZWMpIHtcbiAgICAgICAgICAgIGlmIChjb2RlYy5uYW1lLnRvTG93ZXJDYXNlKCkgPT09IHJlbW90ZUNvZGVjLm5hbWUudG9Mb3dlckNhc2UoKSAmJlxuICAgICAgICAgICAgICAgIGNvZGVjLmNsb2NrUmF0ZSA9PT0gcmVtb3RlQ29kZWMuY2xvY2tSYXRlKSB7XG4gICAgICAgICAgICAgIGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlID0gcmVtb3RlQ29kZWMucGF5bG9hZFR5cGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgbG9jYWxDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGhkckV4dCkge1xuICAgICAgICB2YXIgcmVtb3RlRXh0ZW5zaW9ucyA9IHRyYW5zY2VpdmVyLnJlbW90ZUNhcGFiaWxpdGllcyAmJlxuICAgICAgICAgICAgdHJhbnNjZWl2ZXIucmVtb3RlQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMgfHwgW107XG4gICAgICAgIHJlbW90ZUV4dGVuc2lvbnMuZm9yRWFjaChmdW5jdGlvbihySGRyRXh0KSB7XG4gICAgICAgICAgaWYgKGhkckV4dC51cmkgPT09IHJIZHJFeHQudXJpKSB7XG4gICAgICAgICAgICBoZHJFeHQuaWQgPSBySGRyRXh0LmlkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gZ2VuZXJhdGUgYW4gc3NyYyBub3csIHRvIGJlIHVzZWQgbGF0ZXIgaW4gcnRwU2VuZGVyLnNlbmRcbiAgICAgIHZhciBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzID0gdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVycyB8fCBbe1xuICAgICAgICBzc3JjOiAoMiAqIHNkcE1MaW5lSW5kZXggKyAxKSAqIDEwMDFcbiAgICAgIH1dO1xuICAgICAgaWYgKHRyYWNrKSB7XG4gICAgICAgIC8vIGFkZCBSVFhcbiAgICAgICAgaWYgKGVkZ2VWZXJzaW9uID49IDE1MDE5ICYmIGtpbmQgPT09ICd2aWRlbycgJiZcbiAgICAgICAgICAgICFzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eCkge1xuICAgICAgICAgIHNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4ID0ge1xuICAgICAgICAgICAgc3NyYzogc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5zc3JjICsgMVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRyYW5zY2VpdmVyLndhbnRSZWNlaXZlKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyID0gbmV3IHdpbmRvdy5SVENSdHBSZWNlaXZlcihcbiAgICAgICAgICAgIHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQsIGtpbmQpO1xuICAgICAgfVxuXG4gICAgICB0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcyA9IGxvY2FsQ2FwYWJpbGl0aWVzO1xuICAgICAgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVycyA9IHNlbmRFbmNvZGluZ1BhcmFtZXRlcnM7XG4gICAgfSk7XG5cbiAgICAvLyBhbHdheXMgb2ZmZXIgQlVORExFIGFuZCBkaXNwb3NlIG9uIHJldHVybiBpZiBub3Qgc3VwcG9ydGVkLlxuICAgIGlmIChwYy5fY29uZmlnLmJ1bmRsZVBvbGljeSAhPT0gJ21heC1jb21wYXQnKSB7XG4gICAgICBzZHAgKz0gJ2E9Z3JvdXA6QlVORExFICcgKyBwYy50cmFuc2NlaXZlcnMubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgcmV0dXJuIHQubWlkO1xuICAgICAgfSkuam9pbignICcpICsgJ1xcclxcbic7XG4gICAgfVxuICAgIHNkcCArPSAnYT1pY2Utb3B0aW9uczp0cmlja2xlXFxyXFxuJztcblxuICAgIHBjLnRyYW5zY2VpdmVycy5mb3JFYWNoKGZ1bmN0aW9uKHRyYW5zY2VpdmVyLCBzZHBNTGluZUluZGV4KSB7XG4gICAgICBzZHAgKz0gd3JpdGVNZWRpYVNlY3Rpb24odHJhbnNjZWl2ZXIsIHRyYW5zY2VpdmVyLmxvY2FsQ2FwYWJpbGl0aWVzLFxuICAgICAgICAgICdvZmZlcicsIHRyYW5zY2VpdmVyLnN0cmVhbSwgcGMuX2R0bHNSb2xlKTtcbiAgICAgIHNkcCArPSAnYT1ydGNwLXJzaXplXFxyXFxuJztcblxuICAgICAgaWYgKHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyICYmIHBjLmljZUdhdGhlcmluZ1N0YXRlICE9PSAnbmV3JyAmJlxuICAgICAgICAgIChzZHBNTGluZUluZGV4ID09PSAwIHx8ICFwYy51c2luZ0J1bmRsZSkpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIuZ2V0TG9jYWxDYW5kaWRhdGVzKCkuZm9yRWFjaChmdW5jdGlvbihjYW5kKSB7XG4gICAgICAgICAgY2FuZC5jb21wb25lbnQgPSAxO1xuICAgICAgICAgIHNkcCArPSAnYT0nICsgU0RQVXRpbHMud3JpdGVDYW5kaWRhdGUoY2FuZCkgKyAnXFxyXFxuJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyLnN0YXRlID09PSAnY29tcGxldGVkJykge1xuICAgICAgICAgIHNkcCArPSAnYT1lbmQtb2YtY2FuZGlkYXRlc1xcclxcbic7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBkZXNjID0gbmV3IHdpbmRvdy5SVENTZXNzaW9uRGVzY3JpcHRpb24oe1xuICAgICAgdHlwZTogJ29mZmVyJyxcbiAgICAgIHNkcDogc2RwXG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShkZXNjKTtcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlQW5zd2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBjID0gdGhpcztcblxuICAgIGlmIChwYy5faXNDbG9zZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChtYWtlRXJyb3IoJ0ludmFsaWRTdGF0ZUVycm9yJyxcbiAgICAgICAgICAnQ2FuIG5vdCBjYWxsIGNyZWF0ZUFuc3dlciBhZnRlciBjbG9zZScpKTtcbiAgICB9XG5cbiAgICBpZiAoIShwYy5zaWduYWxpbmdTdGF0ZSA9PT0gJ2hhdmUtcmVtb3RlLW9mZmVyJyB8fFxuICAgICAgICBwYy5zaWduYWxpbmdTdGF0ZSA9PT0gJ2hhdmUtbG9jYWwtcHJhbnN3ZXInKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG1ha2VFcnJvcignSW52YWxpZFN0YXRlRXJyb3InLFxuICAgICAgICAgICdDYW4gbm90IGNhbGwgY3JlYXRlQW5zd2VyIGluIHNpZ25hbGluZ1N0YXRlICcgKyBwYy5zaWduYWxpbmdTdGF0ZSkpO1xuICAgIH1cblxuICAgIHZhciBzZHAgPSBTRFBVdGlscy53cml0ZVNlc3Npb25Cb2lsZXJwbGF0ZShwYy5fc2RwU2Vzc2lvbklkLFxuICAgICAgICBwYy5fc2RwU2Vzc2lvblZlcnNpb24rKyk7XG4gICAgaWYgKHBjLnVzaW5nQnVuZGxlKSB7XG4gICAgICBzZHAgKz0gJ2E9Z3JvdXA6QlVORExFICcgKyBwYy50cmFuc2NlaXZlcnMubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgcmV0dXJuIHQubWlkO1xuICAgICAgfSkuam9pbignICcpICsgJ1xcclxcbic7XG4gICAgfVxuICAgIHNkcCArPSAnYT1pY2Utb3B0aW9uczp0cmlja2xlXFxyXFxuJztcblxuICAgIHZhciBtZWRpYVNlY3Rpb25zSW5PZmZlciA9IFNEUFV0aWxzLmdldE1lZGlhU2VjdGlvbnMoXG4gICAgICAgIHBjLl9yZW1vdGVEZXNjcmlwdGlvbi5zZHApLmxlbmd0aDtcbiAgICBwYy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlciwgc2RwTUxpbmVJbmRleCkge1xuICAgICAgaWYgKHNkcE1MaW5lSW5kZXggKyAxID4gbWVkaWFTZWN0aW9uc0luT2ZmZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRyYW5zY2VpdmVyLnJlamVjdGVkKSB7XG4gICAgICAgIGlmICh0cmFuc2NlaXZlci5raW5kID09PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICAgICAgaWYgKHRyYW5zY2VpdmVyLnByb3RvY29sID09PSAnRFRMUy9TQ1RQJykgeyAvLyBsZWdhY3kgZm10XG4gICAgICAgICAgICBzZHAgKz0gJ209YXBwbGljYXRpb24gMCBEVExTL1NDVFAgNTAwMFxcclxcbic7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNkcCArPSAnbT1hcHBsaWNhdGlvbiAwICcgKyB0cmFuc2NlaXZlci5wcm90b2NvbCArXG4gICAgICAgICAgICAgICAgJyB3ZWJydGMtZGF0YWNoYW5uZWxcXHJcXG4nO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5raW5kID09PSAnYXVkaW8nKSB7XG4gICAgICAgICAgc2RwICs9ICdtPWF1ZGlvIDAgVURQL1RMUy9SVFAvU0FWUEYgMFxcclxcbicgK1xuICAgICAgICAgICAgICAnYT1ydHBtYXA6MCBQQ01VLzgwMDBcXHJcXG4nO1xuICAgICAgICB9IGVsc2UgaWYgKHRyYW5zY2VpdmVyLmtpbmQgPT09ICd2aWRlbycpIHtcbiAgICAgICAgICBzZHAgKz0gJ209dmlkZW8gMCBVRFAvVExTL1JUUC9TQVZQRiAxMjBcXHJcXG4nICtcbiAgICAgICAgICAgICAgJ2E9cnRwbWFwOjEyMCBWUDgvOTAwMDBcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICAgIHNkcCArPSAnYz1JTiBJUDQgMC4wLjAuMFxcclxcbicgK1xuICAgICAgICAgICAgJ2E9aW5hY3RpdmVcXHJcXG4nICtcbiAgICAgICAgICAgICdhPW1pZDonICsgdHJhbnNjZWl2ZXIubWlkICsgJ1xcclxcbic7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gRklYTUU6IGxvb2sgYXQgZGlyZWN0aW9uLlxuICAgICAgaWYgKHRyYW5zY2VpdmVyLnN0cmVhbSkge1xuICAgICAgICB2YXIgbG9jYWxUcmFjaztcbiAgICAgICAgaWYgKHRyYW5zY2VpdmVyLmtpbmQgPT09ICdhdWRpbycpIHtcbiAgICAgICAgICBsb2NhbFRyYWNrID0gdHJhbnNjZWl2ZXIuc3RyZWFtLmdldEF1ZGlvVHJhY2tzKClbMF07XG4gICAgICAgIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIua2luZCA9PT0gJ3ZpZGVvJykge1xuICAgICAgICAgIGxvY2FsVHJhY2sgPSB0cmFuc2NlaXZlci5zdHJlYW0uZ2V0VmlkZW9UcmFja3MoKVswXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobG9jYWxUcmFjaykge1xuICAgICAgICAgIC8vIGFkZCBSVFhcbiAgICAgICAgICBpZiAoZWRnZVZlcnNpb24gPj0gMTUwMTkgJiYgdHJhbnNjZWl2ZXIua2luZCA9PT0gJ3ZpZGVvJyAmJlxuICAgICAgICAgICAgICAhdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHgpIHtcbiAgICAgICAgICAgIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4ID0ge1xuICAgICAgICAgICAgICBzc3JjOiB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnNzcmMgKyAxXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDYWxjdWxhdGUgaW50ZXJzZWN0aW9uIG9mIGNhcGFiaWxpdGllcy5cbiAgICAgIHZhciBjb21tb25DYXBhYmlsaXRpZXMgPSBnZXRDb21tb25DYXBhYmlsaXRpZXMoXG4gICAgICAgICAgdHJhbnNjZWl2ZXIubG9jYWxDYXBhYmlsaXRpZXMsXG4gICAgICAgICAgdHJhbnNjZWl2ZXIucmVtb3RlQ2FwYWJpbGl0aWVzKTtcblxuICAgICAgdmFyIGhhc1J0eCA9IGNvbW1vbkNhcGFiaWxpdGllcy5jb2RlY3MuZmlsdGVyKGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgcmV0dXJuIGMubmFtZS50b0xvd2VyQ2FzZSgpID09PSAncnR4JztcbiAgICAgIH0pLmxlbmd0aDtcbiAgICAgIGlmICghaGFzUnR4ICYmIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4KSB7XG4gICAgICAgIGRlbGV0ZSB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eDtcbiAgICAgIH1cblxuICAgICAgc2RwICs9IHdyaXRlTWVkaWFTZWN0aW9uKHRyYW5zY2VpdmVyLCBjb21tb25DYXBhYmlsaXRpZXMsXG4gICAgICAgICAgJ2Fuc3dlcicsIHRyYW5zY2VpdmVyLnN0cmVhbSwgcGMuX2R0bHNSb2xlKTtcbiAgICAgIGlmICh0cmFuc2NlaXZlci5ydGNwUGFyYW1ldGVycyAmJlxuICAgICAgICAgIHRyYW5zY2VpdmVyLnJ0Y3BQYXJhbWV0ZXJzLnJlZHVjZWRTaXplKSB7XG4gICAgICAgIHNkcCArPSAnYT1ydGNwLXJzaXplXFxyXFxuJztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBkZXNjID0gbmV3IHdpbmRvdy5SVENTZXNzaW9uRGVzY3JpcHRpb24oe1xuICAgICAgdHlwZTogJ2Fuc3dlcicsXG4gICAgICBzZHA6IHNkcFxuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZGVzYyk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICAgIHZhciBwYyA9IHRoaXM7XG4gICAgdmFyIHNlY3Rpb25zO1xuICAgIGlmIChjYW5kaWRhdGUgJiYgIShjYW5kaWRhdGUuc2RwTUxpbmVJbmRleCAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIGNhbmRpZGF0ZS5zZHBNaWQpKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignc2RwTUxpbmVJbmRleCBvciBzZHBNaWQgcmVxdWlyZWQnKSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogbmVlZHMgdG8gZ28gaW50byBvcHMgcXVldWUuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgaWYgKCFwYy5fcmVtb3RlRGVzY3JpcHRpb24pIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChtYWtlRXJyb3IoJ0ludmFsaWRTdGF0ZUVycm9yJyxcbiAgICAgICAgICAgICdDYW4gbm90IGFkZCBJQ0UgY2FuZGlkYXRlIHdpdGhvdXQgYSByZW1vdGUgZGVzY3JpcHRpb24nKSk7XG4gICAgICB9IGVsc2UgaWYgKCFjYW5kaWRhdGUgfHwgY2FuZGlkYXRlLmNhbmRpZGF0ZSA9PT0gJycpIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBwYy50cmFuc2NlaXZlcnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBpZiAocGMudHJhbnNjZWl2ZXJzW2pdLnJlamVjdGVkKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGMudHJhbnNjZWl2ZXJzW2pdLmljZVRyYW5zcG9ydC5hZGRSZW1vdGVDYW5kaWRhdGUoe30pO1xuICAgICAgICAgIHNlY3Rpb25zID0gU0RQVXRpbHMuZ2V0TWVkaWFTZWN0aW9ucyhwYy5fcmVtb3RlRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgICBzZWN0aW9uc1tqXSArPSAnYT1lbmQtb2YtY2FuZGlkYXRlc1xcclxcbic7XG4gICAgICAgICAgcGMuX3JlbW90ZURlc2NyaXB0aW9uLnNkcCA9XG4gICAgICAgICAgICAgIFNEUFV0aWxzLmdldERlc2NyaXB0aW9uKHBjLl9yZW1vdGVEZXNjcmlwdGlvbi5zZHApICtcbiAgICAgICAgICAgICAgc2VjdGlvbnMuam9pbignJyk7XG4gICAgICAgICAgaWYgKHBjLnVzaW5nQnVuZGxlKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBzZHBNTGluZUluZGV4ID0gY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXg7XG4gICAgICAgIGlmIChjYW5kaWRhdGUuc2RwTWlkKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYy50cmFuc2NlaXZlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChwYy50cmFuc2NlaXZlcnNbaV0ubWlkID09PSBjYW5kaWRhdGUuc2RwTWlkKSB7XG4gICAgICAgICAgICAgIHNkcE1MaW5lSW5kZXggPSBpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRyYW5zY2VpdmVyID0gcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdO1xuICAgICAgICBpZiAodHJhbnNjZWl2ZXIpIHtcbiAgICAgICAgICBpZiAodHJhbnNjZWl2ZXIucmVqZWN0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNvbHZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBjYW5kID0gT2JqZWN0LmtleXMoY2FuZGlkYXRlLmNhbmRpZGF0ZSkubGVuZ3RoID4gMCA/XG4gICAgICAgICAgICAgIFNEUFV0aWxzLnBhcnNlQ2FuZGlkYXRlKGNhbmRpZGF0ZS5jYW5kaWRhdGUpIDoge307XG4gICAgICAgICAgLy8gSWdub3JlIENocm9tZSdzIGludmFsaWQgY2FuZGlkYXRlcyBzaW5jZSBFZGdlIGRvZXMgbm90IGxpa2UgdGhlbS5cbiAgICAgICAgICBpZiAoY2FuZC5wcm90b2NvbCA9PT0gJ3RjcCcgJiYgKGNhbmQucG9ydCA9PT0gMCB8fCBjYW5kLnBvcnQgPT09IDkpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBJZ25vcmUgUlRDUCBjYW5kaWRhdGVzLCB3ZSBhc3N1bWUgUlRDUC1NVVguXG4gICAgICAgICAgaWYgKGNhbmQuY29tcG9uZW50ICYmIGNhbmQuY29tcG9uZW50ICE9PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyB3aGVuIHVzaW5nIGJ1bmRsZSwgYXZvaWQgYWRkaW5nIGNhbmRpZGF0ZXMgdG8gdGhlIHdyb25nXG4gICAgICAgICAgLy8gaWNlIHRyYW5zcG9ydC4gQW5kIGF2b2lkIGFkZGluZyBjYW5kaWRhdGVzIGFkZGVkIGluIHRoZSBTRFAuXG4gICAgICAgICAgaWYgKHNkcE1MaW5lSW5kZXggPT09IDAgfHwgKHNkcE1MaW5lSW5kZXggPiAwICYmXG4gICAgICAgICAgICAgIHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCAhPT0gcGMudHJhbnNjZWl2ZXJzWzBdLmljZVRyYW5zcG9ydCkpIHtcbiAgICAgICAgICAgIGlmICghbWF5YmVBZGRDYW5kaWRhdGUodHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0LCBjYW5kKSkge1xuICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KG1ha2VFcnJvcignT3BlcmF0aW9uRXJyb3InLFxuICAgICAgICAgICAgICAgICAgJ0NhbiBub3QgYWRkIElDRSBjYW5kaWRhdGUnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gdXBkYXRlIHRoZSByZW1vdGVEZXNjcmlwdGlvbi5cbiAgICAgICAgICB2YXIgY2FuZGlkYXRlU3RyaW5nID0gY2FuZGlkYXRlLmNhbmRpZGF0ZS50cmltKCk7XG4gICAgICAgICAgaWYgKGNhbmRpZGF0ZVN0cmluZy5pbmRleE9mKCdhPScpID09PSAwKSB7XG4gICAgICAgICAgICBjYW5kaWRhdGVTdHJpbmcgPSBjYW5kaWRhdGVTdHJpbmcuc3Vic3RyKDIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZWN0aW9ucyA9IFNEUFV0aWxzLmdldE1lZGlhU2VjdGlvbnMocGMuX3JlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgICAgc2VjdGlvbnNbc2RwTUxpbmVJbmRleF0gKz0gJ2E9JyArXG4gICAgICAgICAgICAgIChjYW5kLnR5cGUgPyBjYW5kaWRhdGVTdHJpbmcgOiAnZW5kLW9mLWNhbmRpZGF0ZXMnKVxuICAgICAgICAgICAgICArICdcXHJcXG4nO1xuICAgICAgICAgIHBjLl9yZW1vdGVEZXNjcmlwdGlvbi5zZHAgPVxuICAgICAgICAgICAgICBTRFBVdGlscy5nZXREZXNjcmlwdGlvbihwYy5fcmVtb3RlRGVzY3JpcHRpb24uc2RwKSArXG4gICAgICAgICAgICAgIHNlY3Rpb25zLmpvaW4oJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiByZWplY3QobWFrZUVycm9yKCdPcGVyYXRpb25FcnJvcicsXG4gICAgICAgICAgICAgICdDYW4gbm90IGFkZCBJQ0UgY2FuZGlkYXRlJykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXNvbHZlKCk7XG4gICAgfSk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFN0YXRzID0gZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICBpZiAoc2VsZWN0b3IgJiYgc2VsZWN0b3IgaW5zdGFuY2VvZiB3aW5kb3cuTWVkaWFTdHJlYW1UcmFjaykge1xuICAgICAgdmFyIHNlbmRlck9yUmVjZWl2ZXIgPSBudWxsO1xuICAgICAgdGhpcy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgICBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyICYmXG4gICAgICAgICAgICB0cmFuc2NlaXZlci5ydHBTZW5kZXIudHJhY2sgPT09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgc2VuZGVyT3JSZWNlaXZlciA9IHRyYW5zY2VpdmVyLnJ0cFNlbmRlcjtcbiAgICAgICAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5ydHBSZWNlaXZlciAmJlxuICAgICAgICAgICAgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIudHJhY2sgPT09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgc2VuZGVyT3JSZWNlaXZlciA9IHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmICghc2VuZGVyT3JSZWNlaXZlcikge1xuICAgICAgICB0aHJvdyBtYWtlRXJyb3IoJ0ludmFsaWRBY2Nlc3NFcnJvcicsICdJbnZhbGlkIHNlbGVjdG9yLicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNlbmRlck9yUmVjZWl2ZXIuZ2V0U3RhdHMoKTtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZXMgPSBbXTtcbiAgICB0aGlzLnRyYW5zY2VpdmVycy5mb3JFYWNoKGZ1bmN0aW9uKHRyYW5zY2VpdmVyKSB7XG4gICAgICBbJ3J0cFNlbmRlcicsICdydHBSZWNlaXZlcicsICdpY2VHYXRoZXJlcicsICdpY2VUcmFuc3BvcnQnLFxuICAgICAgICAgICdkdGxzVHJhbnNwb3J0J10uZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICAgICAgICAgIGlmICh0cmFuc2NlaXZlclttZXRob2RdKSB7XG4gICAgICAgICAgICAgIHByb21pc2VzLnB1c2godHJhbnNjZWl2ZXJbbWV0aG9kXS5nZXRTdGF0cygpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oYWxsU3RhdHMpIHtcbiAgICAgIHZhciByZXN1bHRzID0gbmV3IE1hcCgpO1xuICAgICAgYWxsU3RhdHMuZm9yRWFjaChmdW5jdGlvbihzdGF0cykge1xuICAgICAgICBzdGF0cy5mb3JFYWNoKGZ1bmN0aW9uKHN0YXQpIHtcbiAgICAgICAgICByZXN1bHRzLnNldChzdGF0LmlkLCBzdGF0KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIGZpeCBsb3ctbGV2ZWwgc3RhdCBuYW1lcyBhbmQgcmV0dXJuIE1hcCBpbnN0ZWFkIG9mIG9iamVjdC5cbiAgdmFyIG9ydGNPYmplY3RzID0gWydSVENSdHBTZW5kZXInLCAnUlRDUnRwUmVjZWl2ZXInLCAnUlRDSWNlR2F0aGVyZXInLFxuICAgICdSVENJY2VUcmFuc3BvcnQnLCAnUlRDRHRsc1RyYW5zcG9ydCddO1xuICBvcnRjT2JqZWN0cy5mb3JFYWNoKGZ1bmN0aW9uKG9ydGNPYmplY3ROYW1lKSB7XG4gICAgdmFyIG9iaiA9IHdpbmRvd1tvcnRjT2JqZWN0TmFtZV07XG4gICAgaWYgKG9iaiAmJiBvYmoucHJvdG90eXBlICYmIG9iai5wcm90b3R5cGUuZ2V0U3RhdHMpIHtcbiAgICAgIHZhciBuYXRpdmVHZXRzdGF0cyA9IG9iai5wcm90b3R5cGUuZ2V0U3RhdHM7XG4gICAgICBvYmoucHJvdG90eXBlLmdldFN0YXRzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBuYXRpdmVHZXRzdGF0cy5hcHBseSh0aGlzKVxuICAgICAgICAudGhlbihmdW5jdGlvbihuYXRpdmVTdGF0cykge1xuICAgICAgICAgIHZhciBtYXBTdGF0cyA9IG5ldyBNYXAoKTtcbiAgICAgICAgICBPYmplY3Qua2V5cyhuYXRpdmVTdGF0cykuZm9yRWFjaChmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgbmF0aXZlU3RhdHNbaWRdLnR5cGUgPSBmaXhTdGF0c1R5cGUobmF0aXZlU3RhdHNbaWRdKTtcbiAgICAgICAgICAgIG1hcFN0YXRzLnNldChpZCwgbmF0aXZlU3RhdHNbaWRdKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gbWFwU3RhdHM7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIGxlZ2FjeSBjYWxsYmFjayBzaGltcy4gU2hvdWxkIGJlIG1vdmVkIHRvIGFkYXB0ZXIuanMgc29tZSBkYXlzLlxuICB2YXIgbWV0aG9kcyA9IFsnY3JlYXRlT2ZmZXInLCAnY3JlYXRlQW5zd2VyJ107XG4gIG1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICB2YXIgbmF0aXZlTWV0aG9kID0gUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF07XG4gICAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSAnZnVuY3Rpb24nIHx8XG4gICAgICAgICAgdHlwZW9mIGFyZ3NbMV0gPT09ICdmdW5jdGlvbicpIHsgLy8gbGVnYWN5XG4gICAgICAgIHJldHVybiBuYXRpdmVNZXRob2QuYXBwbHkodGhpcywgW2FyZ3VtZW50c1syXV0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhcmdzWzBdLmFwcGx5KG51bGwsIFtkZXNjcmlwdGlvbl0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFyZ3NbMV0uYXBwbHkobnVsbCwgW2Vycm9yXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYXRpdmVNZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9KTtcblxuICBtZXRob2RzID0gWydzZXRMb2NhbERlc2NyaXB0aW9uJywgJ3NldFJlbW90ZURlc2NyaXB0aW9uJywgJ2FkZEljZUNhbmRpZGF0ZSddO1xuICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgdmFyIG5hdGl2ZU1ldGhvZCA9IFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdO1xuICAgIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICAgIHR5cGVvZiBhcmdzWzJdID09PSAnZnVuY3Rpb24nKSB7IC8vIGxlZ2FjeVxuICAgICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhcmdzWzFdLmFwcGx5KG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGFyZ3NbMl0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFyZ3NbMl0uYXBwbHkobnVsbCwgW2Vycm9yXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYXRpdmVNZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBnZXRTdGF0cyBpcyBzcGVjaWFsLiBJdCBkb2Vzbid0IGhhdmUgYSBzcGVjIGxlZ2FjeSBtZXRob2QgeWV0IHdlIHN1cHBvcnRcbiAgLy8gZ2V0U3RhdHMoc29tZXRoaW5nLCBjYikgd2l0aG91dCBlcnJvciBjYWxsYmFja3MuXG4gIFsnZ2V0U3RhdHMnXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIHZhciBuYXRpdmVNZXRob2QgPSBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXTtcbiAgICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIG5hdGl2ZU1ldGhvZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXJnc1sxXS5hcHBseShudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hdGl2ZU1ldGhvZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH0pO1xuXG4gIHJldHVybiBSVENQZWVyQ29ubmVjdGlvbjtcbn07XG4iLCIvKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxuLy8gU0RQIGhlbHBlcnMuXG52YXIgU0RQVXRpbHMgPSB7fTtcblxuLy8gR2VuZXJhdGUgYW4gYWxwaGFudW1lcmljIGlkZW50aWZpZXIgZm9yIGNuYW1lIG9yIG1pZHMuXG4vLyBUT0RPOiB1c2UgVVVJRHMgaW5zdGVhZD8gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vamVkLzk4Mjg4M1xuU0RQVXRpbHMuZ2VuZXJhdGVJZGVudGlmaWVyID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgMTApO1xufTtcblxuLy8gVGhlIFJUQ1AgQ05BTUUgdXNlZCBieSBhbGwgcGVlcmNvbm5lY3Rpb25zIGZyb20gdGhlIHNhbWUgSlMuXG5TRFBVdGlscy5sb2NhbENOYW1lID0gU0RQVXRpbHMuZ2VuZXJhdGVJZGVudGlmaWVyKCk7XG5cbi8vIFNwbGl0cyBTRFAgaW50byBsaW5lcywgZGVhbGluZyB3aXRoIGJvdGggQ1JMRiBhbmQgTEYuXG5TRFBVdGlscy5zcGxpdExpbmVzID0gZnVuY3Rpb24oYmxvYikge1xuICByZXR1cm4gYmxvYi50cmltKCkuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgcmV0dXJuIGxpbmUudHJpbSgpO1xuICB9KTtcbn07XG4vLyBTcGxpdHMgU0RQIGludG8gc2Vzc2lvbnBhcnQgYW5kIG1lZGlhc2VjdGlvbnMuIEVuc3VyZXMgQ1JMRi5cblNEUFV0aWxzLnNwbGl0U2VjdGlvbnMgPSBmdW5jdGlvbihibG9iKSB7XG4gIHZhciBwYXJ0cyA9IGJsb2Iuc3BsaXQoJ1xcbm09Jyk7XG4gIHJldHVybiBwYXJ0cy5tYXAoZnVuY3Rpb24ocGFydCwgaW5kZXgpIHtcbiAgICByZXR1cm4gKGluZGV4ID4gMCA/ICdtPScgKyBwYXJ0IDogcGFydCkudHJpbSgpICsgJ1xcclxcbic7XG4gIH0pO1xufTtcblxuLy8gcmV0dXJucyB0aGUgc2Vzc2lvbiBkZXNjcmlwdGlvbi5cblNEUFV0aWxzLmdldERlc2NyaXB0aW9uID0gZnVuY3Rpb24oYmxvYikge1xuICB2YXIgc2VjdGlvbnMgPSBTRFBVdGlscy5zcGxpdFNlY3Rpb25zKGJsb2IpO1xuICByZXR1cm4gc2VjdGlvbnMgJiYgc2VjdGlvbnNbMF07XG59O1xuXG4vLyByZXR1cm5zIHRoZSBpbmRpdmlkdWFsIG1lZGlhIHNlY3Rpb25zLlxuU0RQVXRpbHMuZ2V0TWVkaWFTZWN0aW9ucyA9IGZ1bmN0aW9uKGJsb2IpIHtcbiAgdmFyIHNlY3Rpb25zID0gU0RQVXRpbHMuc3BsaXRTZWN0aW9ucyhibG9iKTtcbiAgc2VjdGlvbnMuc2hpZnQoKTtcbiAgcmV0dXJuIHNlY3Rpb25zO1xufTtcblxuLy8gUmV0dXJucyBsaW5lcyB0aGF0IHN0YXJ0IHdpdGggYSBjZXJ0YWluIHByZWZpeC5cblNEUFV0aWxzLm1hdGNoUHJlZml4ID0gZnVuY3Rpb24oYmxvYiwgcHJlZml4KSB7XG4gIHJldHVybiBTRFBVdGlscy5zcGxpdExpbmVzKGJsb2IpLmZpbHRlcihmdW5jdGlvbihsaW5lKSB7XG4gICAgcmV0dXJuIGxpbmUuaW5kZXhPZihwcmVmaXgpID09PSAwO1xuICB9KTtcbn07XG5cbi8vIFBhcnNlcyBhbiBJQ0UgY2FuZGlkYXRlIGxpbmUuIFNhbXBsZSBpbnB1dDpcbi8vIGNhbmRpZGF0ZTo3MDI3ODYzNTAgMiB1ZHAgNDE4MTk5MDIgOC44LjguOCA2MDc2OSB0eXAgcmVsYXkgcmFkZHIgOC44LjguOFxuLy8gcnBvcnQgNTU5OTZcIlxuU0RQVXRpbHMucGFyc2VDYW5kaWRhdGUgPSBmdW5jdGlvbihsaW5lKSB7XG4gIHZhciBwYXJ0cztcbiAgLy8gUGFyc2UgYm90aCB2YXJpYW50cy5cbiAgaWYgKGxpbmUuaW5kZXhPZignYT1jYW5kaWRhdGU6JykgPT09IDApIHtcbiAgICBwYXJ0cyA9IGxpbmUuc3Vic3RyaW5nKDEyKS5zcGxpdCgnICcpO1xuICB9IGVsc2Uge1xuICAgIHBhcnRzID0gbGluZS5zdWJzdHJpbmcoMTApLnNwbGl0KCcgJyk7XG4gIH1cblxuICB2YXIgY2FuZGlkYXRlID0ge1xuICAgIGZvdW5kYXRpb246IHBhcnRzWzBdLFxuICAgIGNvbXBvbmVudDogcGFyc2VJbnQocGFydHNbMV0sIDEwKSxcbiAgICBwcm90b2NvbDogcGFydHNbMl0udG9Mb3dlckNhc2UoKSxcbiAgICBwcmlvcml0eTogcGFyc2VJbnQocGFydHNbM10sIDEwKSxcbiAgICBpcDogcGFydHNbNF0sXG4gICAgYWRkcmVzczogcGFydHNbNF0sIC8vIGFkZHJlc3MgaXMgYW4gYWxpYXMgZm9yIGlwLlxuICAgIHBvcnQ6IHBhcnNlSW50KHBhcnRzWzVdLCAxMCksXG4gICAgLy8gc2tpcCBwYXJ0c1s2XSA9PSAndHlwJ1xuICAgIHR5cGU6IHBhcnRzWzddXG4gIH07XG5cbiAgZm9yICh2YXIgaSA9IDg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHN3aXRjaCAocGFydHNbaV0pIHtcbiAgICAgIGNhc2UgJ3JhZGRyJzpcbiAgICAgICAgY2FuZGlkYXRlLnJlbGF0ZWRBZGRyZXNzID0gcGFydHNbaSArIDFdO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3Jwb3J0JzpcbiAgICAgICAgY2FuZGlkYXRlLnJlbGF0ZWRQb3J0ID0gcGFyc2VJbnQocGFydHNbaSArIDFdLCAxMCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndGNwdHlwZSc6XG4gICAgICAgIGNhbmRpZGF0ZS50Y3BUeXBlID0gcGFydHNbaSArIDFdO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3VmcmFnJzpcbiAgICAgICAgY2FuZGlkYXRlLnVmcmFnID0gcGFydHNbaSArIDFdOyAvLyBmb3IgYmFja3dhcmQgY29tcGFiaWxpdHkuXG4gICAgICAgIGNhbmRpZGF0ZS51c2VybmFtZUZyYWdtZW50ID0gcGFydHNbaSArIDFdO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6IC8vIGV4dGVuc2lvbiBoYW5kbGluZywgaW4gcGFydGljdWxhciB1ZnJhZ1xuICAgICAgICBjYW5kaWRhdGVbcGFydHNbaV1dID0gcGFydHNbaSArIDFdO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNhbmRpZGF0ZTtcbn07XG5cbi8vIFRyYW5zbGF0ZXMgYSBjYW5kaWRhdGUgb2JqZWN0IGludG8gU0RQIGNhbmRpZGF0ZSBhdHRyaWJ1dGUuXG5TRFBVdGlscy53cml0ZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICB2YXIgc2RwID0gW107XG4gIHNkcC5wdXNoKGNhbmRpZGF0ZS5mb3VuZGF0aW9uKTtcbiAgc2RwLnB1c2goY2FuZGlkYXRlLmNvbXBvbmVudCk7XG4gIHNkcC5wdXNoKGNhbmRpZGF0ZS5wcm90b2NvbC50b1VwcGVyQ2FzZSgpKTtcbiAgc2RwLnB1c2goY2FuZGlkYXRlLnByaW9yaXR5KTtcbiAgc2RwLnB1c2goY2FuZGlkYXRlLmFkZHJlc3MgfHwgY2FuZGlkYXRlLmlwKTtcbiAgc2RwLnB1c2goY2FuZGlkYXRlLnBvcnQpO1xuXG4gIHZhciB0eXBlID0gY2FuZGlkYXRlLnR5cGU7XG4gIHNkcC5wdXNoKCd0eXAnKTtcbiAgc2RwLnB1c2godHlwZSk7XG4gIGlmICh0eXBlICE9PSAnaG9zdCcgJiYgY2FuZGlkYXRlLnJlbGF0ZWRBZGRyZXNzICYmXG4gICAgICBjYW5kaWRhdGUucmVsYXRlZFBvcnQpIHtcbiAgICBzZHAucHVzaCgncmFkZHInKTtcbiAgICBzZHAucHVzaChjYW5kaWRhdGUucmVsYXRlZEFkZHJlc3MpO1xuICAgIHNkcC5wdXNoKCdycG9ydCcpO1xuICAgIHNkcC5wdXNoKGNhbmRpZGF0ZS5yZWxhdGVkUG9ydCk7XG4gIH1cbiAgaWYgKGNhbmRpZGF0ZS50Y3BUeXBlICYmIGNhbmRpZGF0ZS5wcm90b2NvbC50b0xvd2VyQ2FzZSgpID09PSAndGNwJykge1xuICAgIHNkcC5wdXNoKCd0Y3B0eXBlJyk7XG4gICAgc2RwLnB1c2goY2FuZGlkYXRlLnRjcFR5cGUpO1xuICB9XG4gIGlmIChjYW5kaWRhdGUudXNlcm5hbWVGcmFnbWVudCB8fCBjYW5kaWRhdGUudWZyYWcpIHtcbiAgICBzZHAucHVzaCgndWZyYWcnKTtcbiAgICBzZHAucHVzaChjYW5kaWRhdGUudXNlcm5hbWVGcmFnbWVudCB8fCBjYW5kaWRhdGUudWZyYWcpO1xuICB9XG4gIHJldHVybiAnY2FuZGlkYXRlOicgKyBzZHAuam9pbignICcpO1xufTtcblxuLy8gUGFyc2VzIGFuIGljZS1vcHRpb25zIGxpbmUsIHJldHVybnMgYW4gYXJyYXkgb2Ygb3B0aW9uIHRhZ3MuXG4vLyBhPWljZS1vcHRpb25zOmZvbyBiYXJcblNEUFV0aWxzLnBhcnNlSWNlT3B0aW9ucyA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgcmV0dXJuIGxpbmUuc3Vic3RyKDE0KS5zcGxpdCgnICcpO1xufTtcblxuLy8gUGFyc2VzIGFuIHJ0cG1hcCBsaW5lLCByZXR1cm5zIFJUQ1J0cENvZGRlY1BhcmFtZXRlcnMuIFNhbXBsZSBpbnB1dDpcbi8vIGE9cnRwbWFwOjExMSBvcHVzLzQ4MDAwLzJcblNEUFV0aWxzLnBhcnNlUnRwTWFwID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cig5KS5zcGxpdCgnICcpO1xuICB2YXIgcGFyc2VkID0ge1xuICAgIHBheWxvYWRUeXBlOiBwYXJzZUludChwYXJ0cy5zaGlmdCgpLCAxMCkgLy8gd2FzOiBpZFxuICB9O1xuXG4gIHBhcnRzID0gcGFydHNbMF0uc3BsaXQoJy8nKTtcblxuICBwYXJzZWQubmFtZSA9IHBhcnRzWzBdO1xuICBwYXJzZWQuY2xvY2tSYXRlID0gcGFyc2VJbnQocGFydHNbMV0sIDEwKTsgLy8gd2FzOiBjbG9ja3JhdGVcbiAgcGFyc2VkLmNoYW5uZWxzID0gcGFydHMubGVuZ3RoID09PSAzID8gcGFyc2VJbnQocGFydHNbMl0sIDEwKSA6IDE7XG4gIC8vIGxlZ2FjeSBhbGlhcywgZ290IHJlbmFtZWQgYmFjayB0byBjaGFubmVscyBpbiBPUlRDLlxuICBwYXJzZWQubnVtQ2hhbm5lbHMgPSBwYXJzZWQuY2hhbm5lbHM7XG4gIHJldHVybiBwYXJzZWQ7XG59O1xuXG4vLyBHZW5lcmF0ZSBhbiBhPXJ0cG1hcCBsaW5lIGZyb20gUlRDUnRwQ29kZWNDYXBhYmlsaXR5IG9yXG4vLyBSVENSdHBDb2RlY1BhcmFtZXRlcnMuXG5TRFBVdGlscy53cml0ZVJ0cE1hcCA9IGZ1bmN0aW9uKGNvZGVjKSB7XG4gIHZhciBwdCA9IGNvZGVjLnBheWxvYWRUeXBlO1xuICBpZiAoY29kZWMucHJlZmVycmVkUGF5bG9hZFR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgIHB0ID0gY29kZWMucHJlZmVycmVkUGF5bG9hZFR5cGU7XG4gIH1cbiAgdmFyIGNoYW5uZWxzID0gY29kZWMuY2hhbm5lbHMgfHwgY29kZWMubnVtQ2hhbm5lbHMgfHwgMTtcbiAgcmV0dXJuICdhPXJ0cG1hcDonICsgcHQgKyAnICcgKyBjb2RlYy5uYW1lICsgJy8nICsgY29kZWMuY2xvY2tSYXRlICtcbiAgICAgIChjaGFubmVscyAhPT0gMSA/ICcvJyArIGNoYW5uZWxzIDogJycpICsgJ1xcclxcbic7XG59O1xuXG4vLyBQYXJzZXMgYW4gYT1leHRtYXAgbGluZSAoaGVhZGVyZXh0ZW5zaW9uIGZyb20gUkZDIDUyODUpLiBTYW1wbGUgaW5wdXQ6XG4vLyBhPWV4dG1hcDoyIHVybjppZXRmOnBhcmFtczpydHAtaGRyZXh0OnRvZmZzZXRcbi8vIGE9ZXh0bWFwOjIvc2VuZG9ubHkgdXJuOmlldGY6cGFyYW1zOnJ0cC1oZHJleHQ6dG9mZnNldFxuU0RQVXRpbHMucGFyc2VFeHRtYXAgPSBmdW5jdGlvbihsaW5lKSB7XG4gIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyKDkpLnNwbGl0KCcgJyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IHBhcnNlSW50KHBhcnRzWzBdLCAxMCksXG4gICAgZGlyZWN0aW9uOiBwYXJ0c1swXS5pbmRleE9mKCcvJykgPiAwID8gcGFydHNbMF0uc3BsaXQoJy8nKVsxXSA6ICdzZW5kcmVjdicsXG4gICAgdXJpOiBwYXJ0c1sxXVxuICB9O1xufTtcblxuLy8gR2VuZXJhdGVzIGE9ZXh0bWFwIGxpbmUgZnJvbSBSVENSdHBIZWFkZXJFeHRlbnNpb25QYXJhbWV0ZXJzIG9yXG4vLyBSVENSdHBIZWFkZXJFeHRlbnNpb24uXG5TRFBVdGlscy53cml0ZUV4dG1hcCA9IGZ1bmN0aW9uKGhlYWRlckV4dGVuc2lvbikge1xuICByZXR1cm4gJ2E9ZXh0bWFwOicgKyAoaGVhZGVyRXh0ZW5zaW9uLmlkIHx8IGhlYWRlckV4dGVuc2lvbi5wcmVmZXJyZWRJZCkgK1xuICAgICAgKGhlYWRlckV4dGVuc2lvbi5kaXJlY3Rpb24gJiYgaGVhZGVyRXh0ZW5zaW9uLmRpcmVjdGlvbiAhPT0gJ3NlbmRyZWN2J1xuICAgICAgICA/ICcvJyArIGhlYWRlckV4dGVuc2lvbi5kaXJlY3Rpb25cbiAgICAgICAgOiAnJykgK1xuICAgICAgJyAnICsgaGVhZGVyRXh0ZW5zaW9uLnVyaSArICdcXHJcXG4nO1xufTtcblxuLy8gUGFyc2VzIGFuIGZ0bXAgbGluZSwgcmV0dXJucyBkaWN0aW9uYXJ5LiBTYW1wbGUgaW5wdXQ6XG4vLyBhPWZtdHA6OTYgdmJyPW9uO2NuZz1vblxuLy8gQWxzbyBkZWFscyB3aXRoIHZicj1vbjsgY25nPW9uXG5TRFBVdGlscy5wYXJzZUZtdHAgPSBmdW5jdGlvbihsaW5lKSB7XG4gIHZhciBwYXJzZWQgPSB7fTtcbiAgdmFyIGt2O1xuICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cihsaW5lLmluZGV4T2YoJyAnKSArIDEpLnNwbGl0KCc7Jyk7XG4gIGZvciAodmFyIGogPSAwOyBqIDwgcGFydHMubGVuZ3RoOyBqKyspIHtcbiAgICBrdiA9IHBhcnRzW2pdLnRyaW0oKS5zcGxpdCgnPScpO1xuICAgIHBhcnNlZFtrdlswXS50cmltKCldID0ga3ZbMV07XG4gIH1cbiAgcmV0dXJuIHBhcnNlZDtcbn07XG5cbi8vIEdlbmVyYXRlcyBhbiBhPWZ0bXAgbGluZSBmcm9tIFJUQ1J0cENvZGVjQ2FwYWJpbGl0eSBvciBSVENSdHBDb2RlY1BhcmFtZXRlcnMuXG5TRFBVdGlscy53cml0ZUZtdHAgPSBmdW5jdGlvbihjb2RlYykge1xuICB2YXIgbGluZSA9ICcnO1xuICB2YXIgcHQgPSBjb2RlYy5wYXlsb2FkVHlwZTtcbiAgaWYgKGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICBwdCA9IGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlO1xuICB9XG4gIGlmIChjb2RlYy5wYXJhbWV0ZXJzICYmIE9iamVjdC5rZXlzKGNvZGVjLnBhcmFtZXRlcnMpLmxlbmd0aCkge1xuICAgIHZhciBwYXJhbXMgPSBbXTtcbiAgICBPYmplY3Qua2V5cyhjb2RlYy5wYXJhbWV0ZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgICBpZiAoY29kZWMucGFyYW1ldGVyc1twYXJhbV0pIHtcbiAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0gKyAnPScgKyBjb2RlYy5wYXJhbWV0ZXJzW3BhcmFtXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgbGluZSArPSAnYT1mbXRwOicgKyBwdCArICcgJyArIHBhcmFtcy5qb2luKCc7JykgKyAnXFxyXFxuJztcbiAgfVxuICByZXR1cm4gbGluZTtcbn07XG5cbi8vIFBhcnNlcyBhbiBydGNwLWZiIGxpbmUsIHJldHVybnMgUlRDUFJ0Y3BGZWVkYmFjayBvYmplY3QuIFNhbXBsZSBpbnB1dDpcbi8vIGE9cnRjcC1mYjo5OCBuYWNrIHJwc2lcblNEUFV0aWxzLnBhcnNlUnRjcEZiID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cihsaW5lLmluZGV4T2YoJyAnKSArIDEpLnNwbGl0KCcgJyk7XG4gIHJldHVybiB7XG4gICAgdHlwZTogcGFydHMuc2hpZnQoKSxcbiAgICBwYXJhbWV0ZXI6IHBhcnRzLmpvaW4oJyAnKVxuICB9O1xufTtcbi8vIEdlbmVyYXRlIGE9cnRjcC1mYiBsaW5lcyBmcm9tIFJUQ1J0cENvZGVjQ2FwYWJpbGl0eSBvciBSVENSdHBDb2RlY1BhcmFtZXRlcnMuXG5TRFBVdGlscy53cml0ZVJ0Y3BGYiA9IGZ1bmN0aW9uKGNvZGVjKSB7XG4gIHZhciBsaW5lcyA9ICcnO1xuICB2YXIgcHQgPSBjb2RlYy5wYXlsb2FkVHlwZTtcbiAgaWYgKGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICBwdCA9IGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlO1xuICB9XG4gIGlmIChjb2RlYy5ydGNwRmVlZGJhY2sgJiYgY29kZWMucnRjcEZlZWRiYWNrLmxlbmd0aCkge1xuICAgIC8vIEZJWE1FOiBzcGVjaWFsIGhhbmRsaW5nIGZvciB0cnItaW50P1xuICAgIGNvZGVjLnJ0Y3BGZWVkYmFjay5mb3JFYWNoKGZ1bmN0aW9uKGZiKSB7XG4gICAgICBsaW5lcyArPSAnYT1ydGNwLWZiOicgKyBwdCArICcgJyArIGZiLnR5cGUgK1xuICAgICAgKGZiLnBhcmFtZXRlciAmJiBmYi5wYXJhbWV0ZXIubGVuZ3RoID8gJyAnICsgZmIucGFyYW1ldGVyIDogJycpICtcbiAgICAgICAgICAnXFxyXFxuJztcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gbGluZXM7XG59O1xuXG4vLyBQYXJzZXMgYW4gUkZDIDU1NzYgc3NyYyBtZWRpYSBhdHRyaWJ1dGUuIFNhbXBsZSBpbnB1dDpcbi8vIGE9c3NyYzozNzM1OTI4NTU5IGNuYW1lOnNvbWV0aGluZ1xuU0RQVXRpbHMucGFyc2VTc3JjTWVkaWEgPSBmdW5jdGlvbihsaW5lKSB7XG4gIHZhciBzcCA9IGxpbmUuaW5kZXhPZignICcpO1xuICB2YXIgcGFydHMgPSB7XG4gICAgc3NyYzogcGFyc2VJbnQobGluZS5zdWJzdHIoNywgc3AgLSA3KSwgMTApXG4gIH07XG4gIHZhciBjb2xvbiA9IGxpbmUuaW5kZXhPZignOicsIHNwKTtcbiAgaWYgKGNvbG9uID4gLTEpIHtcbiAgICBwYXJ0cy5hdHRyaWJ1dGUgPSBsaW5lLnN1YnN0cihzcCArIDEsIGNvbG9uIC0gc3AgLSAxKTtcbiAgICBwYXJ0cy52YWx1ZSA9IGxpbmUuc3Vic3RyKGNvbG9uICsgMSk7XG4gIH0gZWxzZSB7XG4gICAgcGFydHMuYXR0cmlidXRlID0gbGluZS5zdWJzdHIoc3AgKyAxKTtcbiAgfVxuICByZXR1cm4gcGFydHM7XG59O1xuXG5TRFBVdGlscy5wYXJzZVNzcmNHcm91cCA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHIoMTMpLnNwbGl0KCcgJyk7XG4gIHJldHVybiB7XG4gICAgc2VtYW50aWNzOiBwYXJ0cy5zaGlmdCgpLFxuICAgIHNzcmNzOiBwYXJ0cy5tYXAoZnVuY3Rpb24oc3NyYykge1xuICAgICAgcmV0dXJuIHBhcnNlSW50KHNzcmMsIDEwKTtcbiAgICB9KVxuICB9O1xufTtcblxuLy8gRXh0cmFjdHMgdGhlIE1JRCAoUkZDIDU4ODgpIGZyb20gYSBtZWRpYSBzZWN0aW9uLlxuLy8gcmV0dXJucyB0aGUgTUlEIG9yIHVuZGVmaW5lZCBpZiBubyBtaWQgbGluZSB3YXMgZm91bmQuXG5TRFBVdGlscy5nZXRNaWQgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24pIHtcbiAgdmFyIG1pZCA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9bWlkOicpWzBdO1xuICBpZiAobWlkKSB7XG4gICAgcmV0dXJuIG1pZC5zdWJzdHIoNik7XG4gIH1cbn07XG5cblNEUFV0aWxzLnBhcnNlRmluZ2VycHJpbnQgPSBmdW5jdGlvbihsaW5lKSB7XG4gIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyKDE0KS5zcGxpdCgnICcpO1xuICByZXR1cm4ge1xuICAgIGFsZ29yaXRobTogcGFydHNbMF0udG9Mb3dlckNhc2UoKSwgLy8gYWxnb3JpdGhtIGlzIGNhc2Utc2Vuc2l0aXZlIGluIEVkZ2UuXG4gICAgdmFsdWU6IHBhcnRzWzFdXG4gIH07XG59O1xuXG4vLyBFeHRyYWN0cyBEVExTIHBhcmFtZXRlcnMgZnJvbSBTRFAgbWVkaWEgc2VjdGlvbiBvciBzZXNzaW9ucGFydC5cbi8vIEZJWE1FOiBmb3IgY29uc2lzdGVuY3kgd2l0aCBvdGhlciBmdW5jdGlvbnMgdGhpcyBzaG91bGQgb25seVxuLy8gICBnZXQgdGhlIGZpbmdlcnByaW50IGxpbmUgYXMgaW5wdXQuIFNlZSBhbHNvIGdldEljZVBhcmFtZXRlcnMuXG5TRFBVdGlscy5nZXREdGxzUGFyYW1ldGVycyA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbiwgc2Vzc2lvbnBhcnQpIHtcbiAgdmFyIGxpbmVzID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uICsgc2Vzc2lvbnBhcnQsXG4gICAgJ2E9ZmluZ2VycHJpbnQ6Jyk7XG4gIC8vIE5vdGU6IGE9c2V0dXAgbGluZSBpcyBpZ25vcmVkIHNpbmNlIHdlIHVzZSB0aGUgJ2F1dG8nIHJvbGUuXG4gIC8vIE5vdGUyOiAnYWxnb3JpdGhtJyBpcyBub3QgY2FzZSBzZW5zaXRpdmUgZXhjZXB0IGluIEVkZ2UuXG4gIHJldHVybiB7XG4gICAgcm9sZTogJ2F1dG8nLFxuICAgIGZpbmdlcnByaW50czogbGluZXMubWFwKFNEUFV0aWxzLnBhcnNlRmluZ2VycHJpbnQpXG4gIH07XG59O1xuXG4vLyBTZXJpYWxpemVzIERUTFMgcGFyYW1ldGVycyB0byBTRFAuXG5TRFBVdGlscy53cml0ZUR0bHNQYXJhbWV0ZXJzID0gZnVuY3Rpb24ocGFyYW1zLCBzZXR1cFR5cGUpIHtcbiAgdmFyIHNkcCA9ICdhPXNldHVwOicgKyBzZXR1cFR5cGUgKyAnXFxyXFxuJztcbiAgcGFyYW1zLmZpbmdlcnByaW50cy5mb3JFYWNoKGZ1bmN0aW9uKGZwKSB7XG4gICAgc2RwICs9ICdhPWZpbmdlcnByaW50OicgKyBmcC5hbGdvcml0aG0gKyAnICcgKyBmcC52YWx1ZSArICdcXHJcXG4nO1xuICB9KTtcbiAgcmV0dXJuIHNkcDtcbn07XG5cbi8vIFBhcnNlcyBhPWNyeXB0byBsaW5lcyBpbnRvXG4vLyAgIGh0dHBzOi8vcmF3Z2l0LmNvbS9hYm9iYS9lZGdlcnRjL21hc3Rlci9tc29ydGMtcnM0Lmh0bWwjZGljdGlvbmFyeS1ydGNzcnRwc2Rlc3BhcmFtZXRlcnMtbWVtYmVyc1xuU0RQVXRpbHMucGFyc2VDcnlwdG9MaW5lID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cig5KS5zcGxpdCgnICcpO1xuICByZXR1cm4ge1xuICAgIHRhZzogcGFyc2VJbnQocGFydHNbMF0sIDEwKSxcbiAgICBjcnlwdG9TdWl0ZTogcGFydHNbMV0sXG4gICAga2V5UGFyYW1zOiBwYXJ0c1syXSxcbiAgICBzZXNzaW9uUGFyYW1zOiBwYXJ0cy5zbGljZSgzKSxcbiAgfTtcbn07XG5cblNEUFV0aWxzLndyaXRlQ3J5cHRvTGluZSA9IGZ1bmN0aW9uKHBhcmFtZXRlcnMpIHtcbiAgcmV0dXJuICdhPWNyeXB0bzonICsgcGFyYW1ldGVycy50YWcgKyAnICcgK1xuICAgIHBhcmFtZXRlcnMuY3J5cHRvU3VpdGUgKyAnICcgK1xuICAgICh0eXBlb2YgcGFyYW1ldGVycy5rZXlQYXJhbXMgPT09ICdvYmplY3QnXG4gICAgICA/IFNEUFV0aWxzLndyaXRlQ3J5cHRvS2V5UGFyYW1zKHBhcmFtZXRlcnMua2V5UGFyYW1zKVxuICAgICAgOiBwYXJhbWV0ZXJzLmtleVBhcmFtcykgK1xuICAgIChwYXJhbWV0ZXJzLnNlc3Npb25QYXJhbXMgPyAnICcgKyBwYXJhbWV0ZXJzLnNlc3Npb25QYXJhbXMuam9pbignICcpIDogJycpICtcbiAgICAnXFxyXFxuJztcbn07XG5cbi8vIFBhcnNlcyB0aGUgY3J5cHRvIGtleSBwYXJhbWV0ZXJzIGludG9cbi8vICAgaHR0cHM6Ly9yYXdnaXQuY29tL2Fib2JhL2VkZ2VydGMvbWFzdGVyL21zb3J0Yy1yczQuaHRtbCNydGNzcnRwa2V5cGFyYW0qXG5TRFBVdGlscy5wYXJzZUNyeXB0b0tleVBhcmFtcyA9IGZ1bmN0aW9uKGtleVBhcmFtcykge1xuICBpZiAoa2V5UGFyYW1zLmluZGV4T2YoJ2lubGluZTonKSAhPT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHZhciBwYXJ0cyA9IGtleVBhcmFtcy5zdWJzdHIoNykuc3BsaXQoJ3wnKTtcbiAgcmV0dXJuIHtcbiAgICBrZXlNZXRob2Q6ICdpbmxpbmUnLFxuICAgIGtleVNhbHQ6IHBhcnRzWzBdLFxuICAgIGxpZmVUaW1lOiBwYXJ0c1sxXSxcbiAgICBta2lWYWx1ZTogcGFydHNbMl0gPyBwYXJ0c1syXS5zcGxpdCgnOicpWzBdIDogdW5kZWZpbmVkLFxuICAgIG1raUxlbmd0aDogcGFydHNbMl0gPyBwYXJ0c1syXS5zcGxpdCgnOicpWzFdIDogdW5kZWZpbmVkLFxuICB9O1xufTtcblxuU0RQVXRpbHMud3JpdGVDcnlwdG9LZXlQYXJhbXMgPSBmdW5jdGlvbihrZXlQYXJhbXMpIHtcbiAgcmV0dXJuIGtleVBhcmFtcy5rZXlNZXRob2QgKyAnOidcbiAgICArIGtleVBhcmFtcy5rZXlTYWx0ICtcbiAgICAoa2V5UGFyYW1zLmxpZmVUaW1lID8gJ3wnICsga2V5UGFyYW1zLmxpZmVUaW1lIDogJycpICtcbiAgICAoa2V5UGFyYW1zLm1raVZhbHVlICYmIGtleVBhcmFtcy5ta2lMZW5ndGhcbiAgICAgID8gJ3wnICsga2V5UGFyYW1zLm1raVZhbHVlICsgJzonICsga2V5UGFyYW1zLm1raUxlbmd0aFxuICAgICAgOiAnJyk7XG59O1xuXG4vLyBFeHRyYWN0cyBhbGwgU0RFUyBwYXJhbXRlcnMuXG5TRFBVdGlscy5nZXRDcnlwdG9QYXJhbWV0ZXJzID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uLCBzZXNzaW9ucGFydCkge1xuICB2YXIgbGluZXMgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24gKyBzZXNzaW9ucGFydCxcbiAgICAnYT1jcnlwdG86Jyk7XG4gIHJldHVybiBsaW5lcy5tYXAoU0RQVXRpbHMucGFyc2VDcnlwdG9MaW5lKTtcbn07XG5cbi8vIFBhcnNlcyBJQ0UgaW5mb3JtYXRpb24gZnJvbSBTRFAgbWVkaWEgc2VjdGlvbiBvciBzZXNzaW9ucGFydC5cbi8vIEZJWE1FOiBmb3IgY29uc2lzdGVuY3kgd2l0aCBvdGhlciBmdW5jdGlvbnMgdGhpcyBzaG91bGQgb25seVxuLy8gICBnZXQgdGhlIGljZS11ZnJhZyBhbmQgaWNlLXB3ZCBsaW5lcyBhcyBpbnB1dC5cblNEUFV0aWxzLmdldEljZVBhcmFtZXRlcnMgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24sIHNlc3Npb25wYXJ0KSB7XG4gIHZhciB1ZnJhZyA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiArIHNlc3Npb25wYXJ0LFxuICAgICdhPWljZS11ZnJhZzonKVswXTtcbiAgdmFyIHB3ZCA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiArIHNlc3Npb25wYXJ0LFxuICAgICdhPWljZS1wd2Q6JylbMF07XG4gIGlmICghKHVmcmFnICYmIHB3ZCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4ge1xuICAgIHVzZXJuYW1lRnJhZ21lbnQ6IHVmcmFnLnN1YnN0cigxMiksXG4gICAgcGFzc3dvcmQ6IHB3ZC5zdWJzdHIoMTApLFxuICB9O1xufTtcblxuLy8gU2VyaWFsaXplcyBJQ0UgcGFyYW1ldGVycyB0byBTRFAuXG5TRFBVdGlscy53cml0ZUljZVBhcmFtZXRlcnMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgcmV0dXJuICdhPWljZS11ZnJhZzonICsgcGFyYW1zLnVzZXJuYW1lRnJhZ21lbnQgKyAnXFxyXFxuJyArXG4gICAgICAnYT1pY2UtcHdkOicgKyBwYXJhbXMucGFzc3dvcmQgKyAnXFxyXFxuJztcbn07XG5cbi8vIFBhcnNlcyB0aGUgU0RQIG1lZGlhIHNlY3Rpb24gYW5kIHJldHVybnMgUlRDUnRwUGFyYW1ldGVycy5cblNEUFV0aWxzLnBhcnNlUnRwUGFyYW1ldGVycyA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbikge1xuICB2YXIgZGVzY3JpcHRpb24gPSB7XG4gICAgY29kZWNzOiBbXSxcbiAgICBoZWFkZXJFeHRlbnNpb25zOiBbXSxcbiAgICBmZWNNZWNoYW5pc21zOiBbXSxcbiAgICBydGNwOiBbXVxuICB9O1xuICB2YXIgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKG1lZGlhU2VjdGlvbik7XG4gIHZhciBtbGluZSA9IGxpbmVzWzBdLnNwbGl0KCcgJyk7XG4gIGZvciAodmFyIGkgPSAzOyBpIDwgbWxpbmUubGVuZ3RoOyBpKyspIHsgLy8gZmluZCBhbGwgY29kZWNzIGZyb20gbWxpbmVbMy4uXVxuICAgIHZhciBwdCA9IG1saW5lW2ldO1xuICAgIHZhciBydHBtYXBsaW5lID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgoXG4gICAgICBtZWRpYVNlY3Rpb24sICdhPXJ0cG1hcDonICsgcHQgKyAnICcpWzBdO1xuICAgIGlmIChydHBtYXBsaW5lKSB7XG4gICAgICB2YXIgY29kZWMgPSBTRFBVdGlscy5wYXJzZVJ0cE1hcChydHBtYXBsaW5lKTtcbiAgICAgIHZhciBmbXRwcyA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KFxuICAgICAgICBtZWRpYVNlY3Rpb24sICdhPWZtdHA6JyArIHB0ICsgJyAnKTtcbiAgICAgIC8vIE9ubHkgdGhlIGZpcnN0IGE9Zm10cDo8cHQ+IGlzIGNvbnNpZGVyZWQuXG4gICAgICBjb2RlYy5wYXJhbWV0ZXJzID0gZm10cHMubGVuZ3RoID8gU0RQVXRpbHMucGFyc2VGbXRwKGZtdHBzWzBdKSA6IHt9O1xuICAgICAgY29kZWMucnRjcEZlZWRiYWNrID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgoXG4gICAgICAgIG1lZGlhU2VjdGlvbiwgJ2E9cnRjcC1mYjonICsgcHQgKyAnICcpXG4gICAgICAgIC5tYXAoU0RQVXRpbHMucGFyc2VSdGNwRmIpO1xuICAgICAgZGVzY3JpcHRpb24uY29kZWNzLnB1c2goY29kZWMpO1xuICAgICAgLy8gcGFyc2UgRkVDIG1lY2hhbmlzbXMgZnJvbSBydHBtYXAgbGluZXMuXG4gICAgICBzd2l0Y2ggKGNvZGVjLm5hbWUudG9VcHBlckNhc2UoKSkge1xuICAgICAgICBjYXNlICdSRUQnOlxuICAgICAgICBjYXNlICdVTFBGRUMnOlxuICAgICAgICAgIGRlc2NyaXB0aW9uLmZlY01lY2hhbmlzbXMucHVzaChjb2RlYy5uYW1lLnRvVXBwZXJDYXNlKCkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OiAvLyBvbmx5IFJFRCBhbmQgVUxQRkVDIGFyZSByZWNvZ25pemVkIGFzIEZFQyBtZWNoYW5pc21zLlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPWV4dG1hcDonKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICBkZXNjcmlwdGlvbi5oZWFkZXJFeHRlbnNpb25zLnB1c2goU0RQVXRpbHMucGFyc2VFeHRtYXAobGluZSkpO1xuICB9KTtcbiAgLy8gRklYTUU6IHBhcnNlIHJ0Y3AuXG4gIHJldHVybiBkZXNjcmlwdGlvbjtcbn07XG5cbi8vIEdlbmVyYXRlcyBwYXJ0cyBvZiB0aGUgU0RQIG1lZGlhIHNlY3Rpb24gZGVzY3JpYmluZyB0aGUgY2FwYWJpbGl0aWVzIC9cbi8vIHBhcmFtZXRlcnMuXG5TRFBVdGlscy53cml0ZVJ0cERlc2NyaXB0aW9uID0gZnVuY3Rpb24oa2luZCwgY2Fwcykge1xuICB2YXIgc2RwID0gJyc7XG5cbiAgLy8gQnVpbGQgdGhlIG1saW5lLlxuICBzZHAgKz0gJ209JyArIGtpbmQgKyAnICc7XG4gIHNkcCArPSBjYXBzLmNvZGVjcy5sZW5ndGggPiAwID8gJzknIDogJzAnOyAvLyByZWplY3QgaWYgbm8gY29kZWNzLlxuICBzZHAgKz0gJyBVRFAvVExTL1JUUC9TQVZQRiAnO1xuICBzZHAgKz0gY2Fwcy5jb2RlY3MubWFwKGZ1bmN0aW9uKGNvZGVjKSB7XG4gICAgaWYgKGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZTtcbiAgICB9XG4gICAgcmV0dXJuIGNvZGVjLnBheWxvYWRUeXBlO1xuICB9KS5qb2luKCcgJykgKyAnXFxyXFxuJztcblxuICBzZHAgKz0gJ2M9SU4gSVA0IDAuMC4wLjBcXHJcXG4nO1xuICBzZHAgKz0gJ2E9cnRjcDo5IElOIElQNCAwLjAuMC4wXFxyXFxuJztcblxuICAvLyBBZGQgYT1ydHBtYXAgbGluZXMgZm9yIGVhY2ggY29kZWMuIEFsc28gZm10cCBhbmQgcnRjcC1mYi5cbiAgY2Fwcy5jb2RlY3MuZm9yRWFjaChmdW5jdGlvbihjb2RlYykge1xuICAgIHNkcCArPSBTRFBVdGlscy53cml0ZVJ0cE1hcChjb2RlYyk7XG4gICAgc2RwICs9IFNEUFV0aWxzLndyaXRlRm10cChjb2RlYyk7XG4gICAgc2RwICs9IFNEUFV0aWxzLndyaXRlUnRjcEZiKGNvZGVjKTtcbiAgfSk7XG4gIHZhciBtYXhwdGltZSA9IDA7XG4gIGNhcHMuY29kZWNzLmZvckVhY2goZnVuY3Rpb24oY29kZWMpIHtcbiAgICBpZiAoY29kZWMubWF4cHRpbWUgPiBtYXhwdGltZSkge1xuICAgICAgbWF4cHRpbWUgPSBjb2RlYy5tYXhwdGltZTtcbiAgICB9XG4gIH0pO1xuICBpZiAobWF4cHRpbWUgPiAwKSB7XG4gICAgc2RwICs9ICdhPW1heHB0aW1lOicgKyBtYXhwdGltZSArICdcXHJcXG4nO1xuICB9XG4gIHNkcCArPSAnYT1ydGNwLW11eFxcclxcbic7XG5cbiAgaWYgKGNhcHMuaGVhZGVyRXh0ZW5zaW9ucykge1xuICAgIGNhcHMuaGVhZGVyRXh0ZW5zaW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGV4dGVuc2lvbikge1xuICAgICAgc2RwICs9IFNEUFV0aWxzLndyaXRlRXh0bWFwKGV4dGVuc2lvbik7XG4gICAgfSk7XG4gIH1cbiAgLy8gRklYTUU6IHdyaXRlIGZlY01lY2hhbmlzbXMuXG4gIHJldHVybiBzZHA7XG59O1xuXG4vLyBQYXJzZXMgdGhlIFNEUCBtZWRpYSBzZWN0aW9uIGFuZCByZXR1cm5zIGFuIGFycmF5IG9mXG4vLyBSVENSdHBFbmNvZGluZ1BhcmFtZXRlcnMuXG5TRFBVdGlscy5wYXJzZVJ0cEVuY29kaW5nUGFyYW1ldGVycyA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbikge1xuICB2YXIgZW5jb2RpbmdQYXJhbWV0ZXJzID0gW107XG4gIHZhciBkZXNjcmlwdGlvbiA9IFNEUFV0aWxzLnBhcnNlUnRwUGFyYW1ldGVycyhtZWRpYVNlY3Rpb24pO1xuICB2YXIgaGFzUmVkID0gZGVzY3JpcHRpb24uZmVjTWVjaGFuaXNtcy5pbmRleE9mKCdSRUQnKSAhPT0gLTE7XG4gIHZhciBoYXNVbHBmZWMgPSBkZXNjcmlwdGlvbi5mZWNNZWNoYW5pc21zLmluZGV4T2YoJ1VMUEZFQycpICE9PSAtMTtcblxuICAvLyBmaWx0ZXIgYT1zc3JjOi4uLiBjbmFtZTosIGlnbm9yZSBQbGFuQi1tc2lkXG4gIHZhciBzc3JjcyA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9c3NyYzonKVxuICAgIC5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgcmV0dXJuIFNEUFV0aWxzLnBhcnNlU3NyY01lZGlhKGxpbmUpO1xuICAgIH0pXG4gICAgLmZpbHRlcihmdW5jdGlvbihwYXJ0cykge1xuICAgICAgcmV0dXJuIHBhcnRzLmF0dHJpYnV0ZSA9PT0gJ2NuYW1lJztcbiAgICB9KTtcbiAgdmFyIHByaW1hcnlTc3JjID0gc3NyY3MubGVuZ3RoID4gMCAmJiBzc3Jjc1swXS5zc3JjO1xuICB2YXIgc2Vjb25kYXJ5U3NyYztcblxuICB2YXIgZmxvd3MgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXNzcmMtZ3JvdXA6RklEJylcbiAgICAubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyKDE3KS5zcGxpdCgnICcpO1xuICAgICAgcmV0dXJuIHBhcnRzLm1hcChmdW5jdGlvbihwYXJ0KSB7XG4gICAgICAgIHJldHVybiBwYXJzZUludChwYXJ0LCAxMCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgaWYgKGZsb3dzLmxlbmd0aCA+IDAgJiYgZmxvd3NbMF0ubGVuZ3RoID4gMSAmJiBmbG93c1swXVswXSA9PT0gcHJpbWFyeVNzcmMpIHtcbiAgICBzZWNvbmRhcnlTc3JjID0gZmxvd3NbMF1bMV07XG4gIH1cblxuICBkZXNjcmlwdGlvbi5jb2RlY3MuZm9yRWFjaChmdW5jdGlvbihjb2RlYykge1xuICAgIGlmIChjb2RlYy5uYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdSVFgnICYmIGNvZGVjLnBhcmFtZXRlcnMuYXB0KSB7XG4gICAgICB2YXIgZW5jUGFyYW0gPSB7XG4gICAgICAgIHNzcmM6IHByaW1hcnlTc3JjLFxuICAgICAgICBjb2RlY1BheWxvYWRUeXBlOiBwYXJzZUludChjb2RlYy5wYXJhbWV0ZXJzLmFwdCwgMTApXG4gICAgICB9O1xuICAgICAgaWYgKHByaW1hcnlTc3JjICYmIHNlY29uZGFyeVNzcmMpIHtcbiAgICAgICAgZW5jUGFyYW0ucnR4ID0ge3NzcmM6IHNlY29uZGFyeVNzcmN9O1xuICAgICAgfVxuICAgICAgZW5jb2RpbmdQYXJhbWV0ZXJzLnB1c2goZW5jUGFyYW0pO1xuICAgICAgaWYgKGhhc1JlZCkge1xuICAgICAgICBlbmNQYXJhbSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZW5jUGFyYW0pKTtcbiAgICAgICAgZW5jUGFyYW0uZmVjID0ge1xuICAgICAgICAgIHNzcmM6IHByaW1hcnlTc3JjLFxuICAgICAgICAgIG1lY2hhbmlzbTogaGFzVWxwZmVjID8gJ3JlZCt1bHBmZWMnIDogJ3JlZCdcbiAgICAgICAgfTtcbiAgICAgICAgZW5jb2RpbmdQYXJhbWV0ZXJzLnB1c2goZW5jUGFyYW0pO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIGlmIChlbmNvZGluZ1BhcmFtZXRlcnMubGVuZ3RoID09PSAwICYmIHByaW1hcnlTc3JjKSB7XG4gICAgZW5jb2RpbmdQYXJhbWV0ZXJzLnB1c2goe1xuICAgICAgc3NyYzogcHJpbWFyeVNzcmNcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHdlIHN1cHBvcnQgYm90aCBiPUFTIGFuZCBiPVRJQVMgYnV0IGludGVycHJldCBBUyBhcyBUSUFTLlxuICB2YXIgYmFuZHdpZHRoID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYj0nKTtcbiAgaWYgKGJhbmR3aWR0aC5sZW5ndGgpIHtcbiAgICBpZiAoYmFuZHdpZHRoWzBdLmluZGV4T2YoJ2I9VElBUzonKSA9PT0gMCkge1xuICAgICAgYmFuZHdpZHRoID0gcGFyc2VJbnQoYmFuZHdpZHRoWzBdLnN1YnN0cig3KSwgMTApO1xuICAgIH0gZWxzZSBpZiAoYmFuZHdpZHRoWzBdLmluZGV4T2YoJ2I9QVM6JykgPT09IDApIHtcbiAgICAgIC8vIHVzZSBmb3JtdWxhIGZyb20gSlNFUCB0byBjb252ZXJ0IGI9QVMgdG8gVElBUyB2YWx1ZS5cbiAgICAgIGJhbmR3aWR0aCA9IHBhcnNlSW50KGJhbmR3aWR0aFswXS5zdWJzdHIoNSksIDEwKSAqIDEwMDAgKiAwLjk1XG4gICAgICAgICAgLSAoNTAgKiA0MCAqIDgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBiYW5kd2lkdGggPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGVuY29kaW5nUGFyYW1ldGVycy5mb3JFYWNoKGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgcGFyYW1zLm1heEJpdHJhdGUgPSBiYW5kd2lkdGg7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGVuY29kaW5nUGFyYW1ldGVycztcbn07XG5cbi8vIHBhcnNlcyBodHRwOi8vZHJhZnQub3J0Yy5vcmcvI3J0Y3J0Y3BwYXJhbWV0ZXJzKlxuU0RQVXRpbHMucGFyc2VSdGNwUGFyYW1ldGVycyA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbikge1xuICB2YXIgcnRjcFBhcmFtZXRlcnMgPSB7fTtcblxuICAvLyBHZXRzIHRoZSBmaXJzdCBTU1JDLiBOb3RlIHRoYSB3aXRoIFJUWCB0aGVyZSBtaWdodCBiZSBtdWx0aXBsZVxuICAvLyBTU1JDcy5cbiAgdmFyIHJlbW90ZVNzcmMgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXNzcmM6JylcbiAgICAubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHJldHVybiBTRFBVdGlscy5wYXJzZVNzcmNNZWRpYShsaW5lKTtcbiAgICB9KVxuICAgIC5maWx0ZXIoZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqLmF0dHJpYnV0ZSA9PT0gJ2NuYW1lJztcbiAgICB9KVswXTtcbiAgaWYgKHJlbW90ZVNzcmMpIHtcbiAgICBydGNwUGFyYW1ldGVycy5jbmFtZSA9IHJlbW90ZVNzcmMudmFsdWU7XG4gICAgcnRjcFBhcmFtZXRlcnMuc3NyYyA9IHJlbW90ZVNzcmMuc3NyYztcbiAgfVxuXG4gIC8vIEVkZ2UgdXNlcyB0aGUgY29tcG91bmQgYXR0cmlidXRlIGluc3RlYWQgb2YgcmVkdWNlZFNpemVcbiAgLy8gY29tcG91bmQgaXMgIXJlZHVjZWRTaXplXG4gIHZhciByc2l6ZSA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9cnRjcC1yc2l6ZScpO1xuICBydGNwUGFyYW1ldGVycy5yZWR1Y2VkU2l6ZSA9IHJzaXplLmxlbmd0aCA+IDA7XG4gIHJ0Y3BQYXJhbWV0ZXJzLmNvbXBvdW5kID0gcnNpemUubGVuZ3RoID09PSAwO1xuXG4gIC8vIHBhcnNlcyB0aGUgcnRjcC1tdXggYXR0ctGWYnV0ZS5cbiAgLy8gTm90ZSB0aGF0IEVkZ2UgZG9lcyBub3Qgc3VwcG9ydCB1bm11eGVkIFJUQ1AuXG4gIHZhciBtdXggPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXJ0Y3AtbXV4Jyk7XG4gIHJ0Y3BQYXJhbWV0ZXJzLm11eCA9IG11eC5sZW5ndGggPiAwO1xuXG4gIHJldHVybiBydGNwUGFyYW1ldGVycztcbn07XG5cbi8vIHBhcnNlcyBlaXRoZXIgYT1tc2lkOiBvciBhPXNzcmM6Li4uIG1zaWQgbGluZXMgYW5kIHJldHVybnNcbi8vIHRoZSBpZCBvZiB0aGUgTWVkaWFTdHJlYW0gYW5kIE1lZGlhU3RyZWFtVHJhY2suXG5TRFBVdGlscy5wYXJzZU1zaWQgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24pIHtcbiAgdmFyIHBhcnRzO1xuICB2YXIgc3BlYyA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9bXNpZDonKTtcbiAgaWYgKHNwZWMubGVuZ3RoID09PSAxKSB7XG4gICAgcGFydHMgPSBzcGVjWzBdLnN1YnN0cig3KS5zcGxpdCgnICcpO1xuICAgIHJldHVybiB7c3RyZWFtOiBwYXJ0c1swXSwgdHJhY2s6IHBhcnRzWzFdfTtcbiAgfVxuICB2YXIgcGxhbkIgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXNzcmM6JylcbiAgICAubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHJldHVybiBTRFBVdGlscy5wYXJzZVNzcmNNZWRpYShsaW5lKTtcbiAgICB9KVxuICAgIC5maWx0ZXIoZnVuY3Rpb24obXNpZFBhcnRzKSB7XG4gICAgICByZXR1cm4gbXNpZFBhcnRzLmF0dHJpYnV0ZSA9PT0gJ21zaWQnO1xuICAgIH0pO1xuICBpZiAocGxhbkIubGVuZ3RoID4gMCkge1xuICAgIHBhcnRzID0gcGxhbkJbMF0udmFsdWUuc3BsaXQoJyAnKTtcbiAgICByZXR1cm4ge3N0cmVhbTogcGFydHNbMF0sIHRyYWNrOiBwYXJ0c1sxXX07XG4gIH1cbn07XG5cbi8vIFNDVFBcbi8vIHBhcnNlcyBkcmFmdC1pZXRmLW1tdXNpYy1zY3RwLXNkcC0yNiBmaXJzdCBhbmQgZmFsbHMgYmFja1xuLy8gdG8gZHJhZnQtaWV0Zi1tbXVzaWMtc2N0cC1zZHAtMDVcblNEUFV0aWxzLnBhcnNlU2N0cERlc2NyaXB0aW9uID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uKSB7XG4gIHZhciBtbGluZSA9IFNEUFV0aWxzLnBhcnNlTUxpbmUobWVkaWFTZWN0aW9uKTtcbiAgdmFyIG1heFNpemVMaW5lID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1tYXgtbWVzc2FnZS1zaXplOicpO1xuICB2YXIgbWF4TWVzc2FnZVNpemU7XG4gIGlmIChtYXhTaXplTGluZS5sZW5ndGggPiAwKSB7XG4gICAgbWF4TWVzc2FnZVNpemUgPSBwYXJzZUludChtYXhTaXplTGluZVswXS5zdWJzdHIoMTkpLCAxMCk7XG4gIH1cbiAgaWYgKGlzTmFOKG1heE1lc3NhZ2VTaXplKSkge1xuICAgIG1heE1lc3NhZ2VTaXplID0gNjU1MzY7XG4gIH1cbiAgdmFyIHNjdHBQb3J0ID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1zY3RwLXBvcnQ6Jyk7XG4gIGlmIChzY3RwUG9ydC5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBvcnQ6IHBhcnNlSW50KHNjdHBQb3J0WzBdLnN1YnN0cigxMiksIDEwKSxcbiAgICAgIHByb3RvY29sOiBtbGluZS5mbXQsXG4gICAgICBtYXhNZXNzYWdlU2l6ZTogbWF4TWVzc2FnZVNpemVcbiAgICB9O1xuICB9XG4gIHZhciBzY3RwTWFwTGluZXMgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXNjdHBtYXA6Jyk7XG4gIGlmIChzY3RwTWFwTGluZXMubGVuZ3RoID4gMCkge1xuICAgIHZhciBwYXJ0cyA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9c2N0cG1hcDonKVswXVxuICAgICAgLnN1YnN0cigxMClcbiAgICAgIC5zcGxpdCgnICcpO1xuICAgIHJldHVybiB7XG4gICAgICBwb3J0OiBwYXJzZUludChwYXJ0c1swXSwgMTApLFxuICAgICAgcHJvdG9jb2w6IHBhcnRzWzFdLFxuICAgICAgbWF4TWVzc2FnZVNpemU6IG1heE1lc3NhZ2VTaXplXG4gICAgfTtcbiAgfVxufTtcblxuLy8gU0NUUFxuLy8gb3V0cHV0cyB0aGUgZHJhZnQtaWV0Zi1tbXVzaWMtc2N0cC1zZHAtMjYgdmVyc2lvbiB0aGF0IGFsbCBicm93c2Vyc1xuLy8gc3VwcG9ydCBieSBub3cgcmVjZWl2aW5nIGluIHRoaXMgZm9ybWF0LCB1bmxlc3Mgd2Ugb3JpZ2luYWxseSBwYXJzZWRcbi8vIGFzIHRoZSBkcmFmdC1pZXRmLW1tdXNpYy1zY3RwLXNkcC0wNSBmb3JtYXQgKGluZGljYXRlZCBieSB0aGUgbS1saW5lXG4vLyBwcm90b2NvbCBvZiBEVExTL1NDVFAgLS0gd2l0aG91dCBVRFAvIG9yIFRDUC8pXG5TRFBVdGlscy53cml0ZVNjdHBEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKG1lZGlhLCBzY3RwKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgaWYgKG1lZGlhLnByb3RvY29sICE9PSAnRFRMUy9TQ1RQJykge1xuICAgIG91dHB1dCA9IFtcbiAgICAgICdtPScgKyBtZWRpYS5raW5kICsgJyA5ICcgKyBtZWRpYS5wcm90b2NvbCArICcgJyArIHNjdHAucHJvdG9jb2wgKyAnXFxyXFxuJyxcbiAgICAgICdjPUlOIElQNCAwLjAuMC4wXFxyXFxuJyxcbiAgICAgICdhPXNjdHAtcG9ydDonICsgc2N0cC5wb3J0ICsgJ1xcclxcbidcbiAgICBdO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IFtcbiAgICAgICdtPScgKyBtZWRpYS5raW5kICsgJyA5ICcgKyBtZWRpYS5wcm90b2NvbCArICcgJyArIHNjdHAucG9ydCArICdcXHJcXG4nLFxuICAgICAgJ2M9SU4gSVA0IDAuMC4wLjBcXHJcXG4nLFxuICAgICAgJ2E9c2N0cG1hcDonICsgc2N0cC5wb3J0ICsgJyAnICsgc2N0cC5wcm90b2NvbCArICcgNjU1MzVcXHJcXG4nXG4gICAgXTtcbiAgfVxuICBpZiAoc2N0cC5tYXhNZXNzYWdlU2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgb3V0cHV0LnB1c2goJ2E9bWF4LW1lc3NhZ2Utc2l6ZTonICsgc2N0cC5tYXhNZXNzYWdlU2l6ZSArICdcXHJcXG4nKTtcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xufTtcblxuLy8gR2VuZXJhdGUgYSBzZXNzaW9uIElEIGZvciBTRFAuXG4vLyBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvZHJhZnQtaWV0Zi1ydGN3ZWItanNlcC0yMCNzZWN0aW9uLTUuMi4xXG4vLyByZWNvbW1lbmRzIHVzaW5nIGEgY3J5cHRvZ3JhcGhpY2FsbHkgcmFuZG9tICt2ZSA2NC1iaXQgdmFsdWVcbi8vIGJ1dCByaWdodCBub3cgdGhpcyBzaG91bGQgYmUgYWNjZXB0YWJsZSBhbmQgd2l0aGluIHRoZSByaWdodCByYW5nZVxuU0RQVXRpbHMuZ2VuZXJhdGVTZXNzaW9uSWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoKS5zdWJzdHIoMiwgMjEpO1xufTtcblxuLy8gV3JpdGUgYm9pbGRlciBwbGF0ZSBmb3Igc3RhcnQgb2YgU0RQXG4vLyBzZXNzSWQgYXJndW1lbnQgaXMgb3B0aW9uYWwgLSBpZiBub3Qgc3VwcGxpZWQgaXQgd2lsbFxuLy8gYmUgZ2VuZXJhdGVkIHJhbmRvbWx5XG4vLyBzZXNzVmVyc2lvbiBpcyBvcHRpb25hbCBhbmQgZGVmYXVsdHMgdG8gMlxuLy8gc2Vzc1VzZXIgaXMgb3B0aW9uYWwgYW5kIGRlZmF1bHRzIHRvICd0aGlzaXNhZGFwdGVyb3J0YydcblNEUFV0aWxzLndyaXRlU2Vzc2lvbkJvaWxlcnBsYXRlID0gZnVuY3Rpb24oc2Vzc0lkLCBzZXNzVmVyLCBzZXNzVXNlcikge1xuICB2YXIgc2Vzc2lvbklkO1xuICB2YXIgdmVyc2lvbiA9IHNlc3NWZXIgIT09IHVuZGVmaW5lZCA/IHNlc3NWZXIgOiAyO1xuICBpZiAoc2Vzc0lkKSB7XG4gICAgc2Vzc2lvbklkID0gc2Vzc0lkO1xuICB9IGVsc2Uge1xuICAgIHNlc3Npb25JZCA9IFNEUFV0aWxzLmdlbmVyYXRlU2Vzc2lvbklkKCk7XG4gIH1cbiAgdmFyIHVzZXIgPSBzZXNzVXNlciB8fCAndGhpc2lzYWRhcHRlcm9ydGMnO1xuICAvLyBGSVhNRTogc2Vzcy1pZCBzaG91bGQgYmUgYW4gTlRQIHRpbWVzdGFtcC5cbiAgcmV0dXJuICd2PTBcXHJcXG4nICtcbiAgICAgICdvPScgKyB1c2VyICsgJyAnICsgc2Vzc2lvbklkICsgJyAnICsgdmVyc2lvbiArXG4gICAgICAgICcgSU4gSVA0IDEyNy4wLjAuMVxcclxcbicgK1xuICAgICAgJ3M9LVxcclxcbicgK1xuICAgICAgJ3Q9MCAwXFxyXFxuJztcbn07XG5cblNEUFV0aWxzLndyaXRlTWVkaWFTZWN0aW9uID0gZnVuY3Rpb24odHJhbnNjZWl2ZXIsIGNhcHMsIHR5cGUsIHN0cmVhbSkge1xuICB2YXIgc2RwID0gU0RQVXRpbHMud3JpdGVSdHBEZXNjcmlwdGlvbih0cmFuc2NlaXZlci5raW5kLCBjYXBzKTtcblxuICAvLyBNYXAgSUNFIHBhcmFtZXRlcnMgKHVmcmFnLCBwd2QpIHRvIFNEUC5cbiAgc2RwICs9IFNEUFV0aWxzLndyaXRlSWNlUGFyYW1ldGVycyhcbiAgICB0cmFuc2NlaXZlci5pY2VHYXRoZXJlci5nZXRMb2NhbFBhcmFtZXRlcnMoKSk7XG5cbiAgLy8gTWFwIERUTFMgcGFyYW1ldGVycyB0byBTRFAuXG4gIHNkcCArPSBTRFBVdGlscy53cml0ZUR0bHNQYXJhbWV0ZXJzKFxuICAgIHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQuZ2V0TG9jYWxQYXJhbWV0ZXJzKCksXG4gICAgdHlwZSA9PT0gJ29mZmVyJyA/ICdhY3RwYXNzJyA6ICdhY3RpdmUnKTtcblxuICBzZHAgKz0gJ2E9bWlkOicgKyB0cmFuc2NlaXZlci5taWQgKyAnXFxyXFxuJztcblxuICBpZiAodHJhbnNjZWl2ZXIuZGlyZWN0aW9uKSB7XG4gICAgc2RwICs9ICdhPScgKyB0cmFuc2NlaXZlci5kaXJlY3Rpb24gKyAnXFxyXFxuJztcbiAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5ydHBTZW5kZXIgJiYgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIpIHtcbiAgICBzZHAgKz0gJ2E9c2VuZHJlY3ZcXHJcXG4nO1xuICB9IGVsc2UgaWYgKHRyYW5zY2VpdmVyLnJ0cFNlbmRlcikge1xuICAgIHNkcCArPSAnYT1zZW5kb25seVxcclxcbic7XG4gIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIpIHtcbiAgICBzZHAgKz0gJ2E9cmVjdm9ubHlcXHJcXG4nO1xuICB9IGVsc2Uge1xuICAgIHNkcCArPSAnYT1pbmFjdGl2ZVxcclxcbic7XG4gIH1cblxuICBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyKSB7XG4gICAgLy8gc3BlYy5cbiAgICB2YXIgbXNpZCA9ICdtc2lkOicgKyBzdHJlYW0uaWQgKyAnICcgK1xuICAgICAgICB0cmFuc2NlaXZlci5ydHBTZW5kZXIudHJhY2suaWQgKyAnXFxyXFxuJztcbiAgICBzZHAgKz0gJ2E9JyArIG1zaWQ7XG5cbiAgICAvLyBmb3IgQ2hyb21lLlxuICAgIHNkcCArPSAnYT1zc3JjOicgKyB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnNzcmMgK1xuICAgICAgICAnICcgKyBtc2lkO1xuICAgIGlmICh0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eCkge1xuICAgICAgc2RwICs9ICdhPXNzcmM6JyArIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4LnNzcmMgK1xuICAgICAgICAgICcgJyArIG1zaWQ7XG4gICAgICBzZHAgKz0gJ2E9c3NyYy1ncm91cDpGSUQgJyArXG4gICAgICAgICAgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5zc3JjICsgJyAnICtcbiAgICAgICAgICB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eC5zc3JjICtcbiAgICAgICAgICAnXFxyXFxuJztcbiAgICB9XG4gIH1cbiAgLy8gRklYTUU6IHRoaXMgc2hvdWxkIGJlIHdyaXR0ZW4gYnkgd3JpdGVSdHBEZXNjcmlwdGlvbi5cbiAgc2RwICs9ICdhPXNzcmM6JyArIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYyArXG4gICAgICAnIGNuYW1lOicgKyBTRFBVdGlscy5sb2NhbENOYW1lICsgJ1xcclxcbic7XG4gIGlmICh0cmFuc2NlaXZlci5ydHBTZW5kZXIgJiYgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHgpIHtcbiAgICBzZHAgKz0gJ2E9c3NyYzonICsgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHguc3NyYyArXG4gICAgICAgICcgY25hbWU6JyArIFNEUFV0aWxzLmxvY2FsQ05hbWUgKyAnXFxyXFxuJztcbiAgfVxuICByZXR1cm4gc2RwO1xufTtcblxuLy8gR2V0cyB0aGUgZGlyZWN0aW9uIGZyb20gdGhlIG1lZGlhU2VjdGlvbiBvciB0aGUgc2Vzc2lvbnBhcnQuXG5TRFBVdGlscy5nZXREaXJlY3Rpb24gPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24sIHNlc3Npb25wYXJ0KSB7XG4gIC8vIExvb2sgZm9yIHNlbmRyZWN2LCBzZW5kb25seSwgcmVjdm9ubHksIGluYWN0aXZlLCBkZWZhdWx0IHRvIHNlbmRyZWN2LlxuICB2YXIgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKG1lZGlhU2VjdGlvbik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBzd2l0Y2ggKGxpbmVzW2ldKSB7XG4gICAgICBjYXNlICdhPXNlbmRyZWN2JzpcbiAgICAgIGNhc2UgJ2E9c2VuZG9ubHknOlxuICAgICAgY2FzZSAnYT1yZWN2b25seSc6XG4gICAgICBjYXNlICdhPWluYWN0aXZlJzpcbiAgICAgICAgcmV0dXJuIGxpbmVzW2ldLnN1YnN0cigyKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIC8vIEZJWE1FOiBXaGF0IHNob3VsZCBoYXBwZW4gaGVyZT9cbiAgICB9XG4gIH1cbiAgaWYgKHNlc3Npb25wYXJ0KSB7XG4gICAgcmV0dXJuIFNEUFV0aWxzLmdldERpcmVjdGlvbihzZXNzaW9ucGFydCk7XG4gIH1cbiAgcmV0dXJuICdzZW5kcmVjdic7XG59O1xuXG5TRFBVdGlscy5nZXRLaW5kID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uKSB7XG4gIHZhciBsaW5lcyA9IFNEUFV0aWxzLnNwbGl0TGluZXMobWVkaWFTZWN0aW9uKTtcbiAgdmFyIG1saW5lID0gbGluZXNbMF0uc3BsaXQoJyAnKTtcbiAgcmV0dXJuIG1saW5lWzBdLnN1YnN0cigyKTtcbn07XG5cblNEUFV0aWxzLmlzUmVqZWN0ZWQgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24pIHtcbiAgcmV0dXJuIG1lZGlhU2VjdGlvbi5zcGxpdCgnICcsIDIpWzFdID09PSAnMCc7XG59O1xuXG5TRFBVdGlscy5wYXJzZU1MaW5lID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uKSB7XG4gIHZhciBsaW5lcyA9IFNEUFV0aWxzLnNwbGl0TGluZXMobWVkaWFTZWN0aW9uKTtcbiAgdmFyIHBhcnRzID0gbGluZXNbMF0uc3Vic3RyKDIpLnNwbGl0KCcgJyk7XG4gIHJldHVybiB7XG4gICAga2luZDogcGFydHNbMF0sXG4gICAgcG9ydDogcGFyc2VJbnQocGFydHNbMV0sIDEwKSxcbiAgICBwcm90b2NvbDogcGFydHNbMl0sXG4gICAgZm10OiBwYXJ0cy5zbGljZSgzKS5qb2luKCcgJylcbiAgfTtcbn07XG5cblNEUFV0aWxzLnBhcnNlT0xpbmUgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24pIHtcbiAgdmFyIGxpbmUgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdvPScpWzBdO1xuICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cigyKS5zcGxpdCgnICcpO1xuICByZXR1cm4ge1xuICAgIHVzZXJuYW1lOiBwYXJ0c1swXSxcbiAgICBzZXNzaW9uSWQ6IHBhcnRzWzFdLFxuICAgIHNlc3Npb25WZXJzaW9uOiBwYXJzZUludChwYXJ0c1syXSwgMTApLFxuICAgIG5ldFR5cGU6IHBhcnRzWzNdLFxuICAgIGFkZHJlc3NUeXBlOiBwYXJ0c1s0XSxcbiAgICBhZGRyZXNzOiBwYXJ0c1s1XVxuICB9O1xufTtcblxuLy8gYSB2ZXJ5IG5haXZlIGludGVycHJldGF0aW9uIG9mIGEgdmFsaWQgU0RQLlxuU0RQVXRpbHMuaXNWYWxpZFNEUCA9IGZ1bmN0aW9uKGJsb2IpIHtcbiAgaWYgKHR5cGVvZiBibG9iICE9PSAnc3RyaW5nJyB8fCBibG9iLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKGJsb2IpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGxpbmVzW2ldLmxlbmd0aCA8IDIgfHwgbGluZXNbaV0uY2hhckF0KDEpICE9PSAnPScpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gVE9ETzogY2hlY2sgdGhlIG1vZGlmaWVyIGEgYml0IG1vcmUuXG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBFeHBvc2UgcHVibGljIG1ldGhvZHMuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBTRFBVdGlscztcbn1cbiIsIi8qKlxuICogQ29udmVydCBhcnJheSBvZiAxNiBieXRlIHZhbHVlcyB0byBVVUlEIHN0cmluZyBmb3JtYXQgb2YgdGhlIGZvcm06XG4gKiBYWFhYWFhYWC1YWFhYLVhYWFgtWFhYWC1YWFhYWFhYWFhYWFhcbiAqL1xudmFyIGJ5dGVUb0hleCA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICBieXRlVG9IZXhbaV0gPSAoaSArIDB4MTAwKS50b1N0cmluZygxNikuc3Vic3RyKDEpO1xufVxuXG5mdW5jdGlvbiBieXRlc1RvVXVpZChidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IG9mZnNldCB8fCAwO1xuICB2YXIgYnRoID0gYnl0ZVRvSGV4O1xuICAvLyBqb2luIHVzZWQgdG8gZml4IG1lbW9yeSBpc3N1ZSBjYXVzZWQgYnkgY29uY2F0ZW5hdGlvbjogaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzE3NSNjNFxuICByZXR1cm4gKFtcbiAgICBidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLFxuICAgIGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcbiAgICBidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG4gICAgYnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuICAgIGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcbiAgICBidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLFxuICAgIGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sXG4gICAgYnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXVxuICBdKS5qb2luKCcnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBieXRlc1RvVXVpZDtcbiIsIi8vIFVuaXF1ZSBJRCBjcmVhdGlvbiByZXF1aXJlcyBhIGhpZ2ggcXVhbGl0eSByYW5kb20gIyBnZW5lcmF0b3IuICBJbiB0aGVcbi8vIGJyb3dzZXIgdGhpcyBpcyBhIGxpdHRsZSBjb21wbGljYXRlZCBkdWUgdG8gdW5rbm93biBxdWFsaXR5IG9mIE1hdGgucmFuZG9tKClcbi8vIGFuZCBpbmNvbnNpc3RlbnQgc3VwcG9ydCBmb3IgdGhlIGBjcnlwdG9gIEFQSS4gIFdlIGRvIHRoZSBiZXN0IHdlIGNhbiB2aWFcbi8vIGZlYXR1cmUtZGV0ZWN0aW9uXG5cbi8vIGdldFJhbmRvbVZhbHVlcyBuZWVkcyB0byBiZSBpbnZva2VkIGluIGEgY29udGV4dCB3aGVyZSBcInRoaXNcIiBpcyBhIENyeXB0b1xuLy8gaW1wbGVtZW50YXRpb24uIEFsc28sIGZpbmQgdGhlIGNvbXBsZXRlIGltcGxlbWVudGF0aW9uIG9mIGNyeXB0byBvbiBJRTExLlxudmFyIGdldFJhbmRvbVZhbHVlcyA9ICh0eXBlb2YoY3J5cHRvKSAhPSAndW5kZWZpbmVkJyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChjcnlwdG8pKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICh0eXBlb2YobXNDcnlwdG8pICE9ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cubXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzID09ICdmdW5jdGlvbicgJiYgbXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQobXNDcnlwdG8pKTtcblxuaWYgKGdldFJhbmRvbVZhbHVlcykge1xuICAvLyBXSEFUV0cgY3J5cHRvIFJORyAtIGh0dHA6Ly93aWtpLndoYXR3Zy5vcmcvd2lraS9DcnlwdG9cbiAgdmFyIHJuZHM4ID0gbmV3IFVpbnQ4QXJyYXkoMTYpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmXG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGF0d2dSTkcoKSB7XG4gICAgZ2V0UmFuZG9tVmFsdWVzKHJuZHM4KTtcbiAgICByZXR1cm4gcm5kczg7XG4gIH07XG59IGVsc2Uge1xuICAvLyBNYXRoLnJhbmRvbSgpLWJhc2VkIChSTkcpXG4gIC8vXG4gIC8vIElmIGFsbCBlbHNlIGZhaWxzLCB1c2UgTWF0aC5yYW5kb20oKS4gIEl0J3MgZmFzdCwgYnV0IGlzIG9mIHVuc3BlY2lmaWVkXG4gIC8vIHF1YWxpdHkuXG4gIHZhciBybmRzID0gbmV3IEFycmF5KDE2KTtcblxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG1hdGhSTkcoKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIHI7IGkgPCAxNjsgaSsrKSB7XG4gICAgICBpZiAoKGkgJiAweDAzKSA9PT0gMCkgciA9IE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDAwMDtcbiAgICAgIHJuZHNbaV0gPSByID4+PiAoKGkgJiAweDAzKSA8PCAzKSAmIDB4ZmY7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJuZHM7XG4gIH07XG59XG4iLCJ2YXIgcm5nID0gcmVxdWlyZSgnLi9saWIvcm5nJyk7XG52YXIgYnl0ZXNUb1V1aWQgPSByZXF1aXJlKCcuL2xpYi9ieXRlc1RvVXVpZCcpO1xuXG5mdW5jdGlvbiB2NChvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IGJ1ZiAmJiBvZmZzZXQgfHwgMDtcblxuICBpZiAodHlwZW9mKG9wdGlvbnMpID09ICdzdHJpbmcnKSB7XG4gICAgYnVmID0gb3B0aW9ucyA9PT0gJ2JpbmFyeScgPyBuZXcgQXJyYXkoMTYpIDogbnVsbDtcbiAgICBvcHRpb25zID0gbnVsbDtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgcm5kcyA9IG9wdGlvbnMucmFuZG9tIHx8IChvcHRpb25zLnJuZyB8fCBybmcpKCk7XG5cbiAgLy8gUGVyIDQuNCwgc2V0IGJpdHMgZm9yIHZlcnNpb24gYW5kIGBjbG9ja19zZXFfaGlfYW5kX3Jlc2VydmVkYFxuICBybmRzWzZdID0gKHJuZHNbNl0gJiAweDBmKSB8IDB4NDA7XG4gIHJuZHNbOF0gPSAocm5kc1s4XSAmIDB4M2YpIHwgMHg4MDtcblxuICAvLyBDb3B5IGJ5dGVzIHRvIGJ1ZmZlciwgaWYgcHJvdmlkZWRcbiAgaWYgKGJ1Zikge1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCAxNjsgKytpaSkge1xuICAgICAgYnVmW2kgKyBpaV0gPSBybmRzW2lpXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmIHx8IGJ5dGVzVG9VdWlkKHJuZHMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHY0O1xuIiwiLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTYgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX2FkYXB0ZXJfZmFjdG9yeSA9IHJlcXVpcmUoJy4vYWRhcHRlcl9mYWN0b3J5LmpzJyk7XG5cbnZhciBhZGFwdGVyID0gKDAsIF9hZGFwdGVyX2ZhY3RvcnkuYWRhcHRlckZhY3RvcnkpKHsgd2luZG93OiB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IHdpbmRvdyB9KTtcbmV4cG9ydHMuZGVmYXVsdCA9IGFkYXB0ZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmFkYXB0ZXJGYWN0b3J5ID0gYWRhcHRlckZhY3Rvcnk7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciB1dGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF91dGlscyk7XG5cbnZhciBfY2hyb21lX3NoaW0gPSByZXF1aXJlKCcuL2Nocm9tZS9jaHJvbWVfc2hpbScpO1xuXG52YXIgY2hyb21lU2hpbSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9jaHJvbWVfc2hpbSk7XG5cbnZhciBfZWRnZV9zaGltID0gcmVxdWlyZSgnLi9lZGdlL2VkZ2Vfc2hpbScpO1xuXG52YXIgZWRnZVNoaW0gPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfZWRnZV9zaGltKTtcblxudmFyIF9maXJlZm94X3NoaW0gPSByZXF1aXJlKCcuL2ZpcmVmb3gvZmlyZWZveF9zaGltJyk7XG5cbnZhciBmaXJlZm94U2hpbSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9maXJlZm94X3NoaW0pO1xuXG52YXIgX3NhZmFyaV9zaGltID0gcmVxdWlyZSgnLi9zYWZhcmkvc2FmYXJpX3NoaW0nKTtcblxudmFyIHNhZmFyaVNoaW0gPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfc2FmYXJpX3NoaW0pO1xuXG52YXIgX2NvbW1vbl9zaGltID0gcmVxdWlyZSgnLi9jb21tb25fc2hpbScpO1xuXG52YXIgY29tbW9uU2hpbSA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF9jb21tb25fc2hpbSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbi8vIFNoaW1taW5nIHN0YXJ0cyBoZXJlLlxuLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTYgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG5mdW5jdGlvbiBhZGFwdGVyRmFjdG9yeSgpIHtcbiAgdmFyIF9yZWYgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IHt9LFxuICAgICAgd2luZG93ID0gX3JlZi53aW5kb3c7XG5cbiAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHtcbiAgICBzaGltQ2hyb21lOiB0cnVlLFxuICAgIHNoaW1GaXJlZm94OiB0cnVlLFxuICAgIHNoaW1FZGdlOiB0cnVlLFxuICAgIHNoaW1TYWZhcmk6IHRydWVcbiAgfTtcblxuICAvLyBVdGlscy5cbiAgdmFyIGxvZ2dpbmcgPSB1dGlscy5sb2c7XG4gIHZhciBicm93c2VyRGV0YWlscyA9IHV0aWxzLmRldGVjdEJyb3dzZXIod2luZG93KTtcblxuICB2YXIgYWRhcHRlciA9IHtcbiAgICBicm93c2VyRGV0YWlsczogYnJvd3NlckRldGFpbHMsXG4gICAgY29tbW9uU2hpbTogY29tbW9uU2hpbSxcbiAgICBleHRyYWN0VmVyc2lvbjogdXRpbHMuZXh0cmFjdFZlcnNpb24sXG4gICAgZGlzYWJsZUxvZzogdXRpbHMuZGlzYWJsZUxvZyxcbiAgICBkaXNhYmxlV2FybmluZ3M6IHV0aWxzLmRpc2FibGVXYXJuaW5nc1xuICB9O1xuXG4gIC8vIFNoaW0gYnJvd3NlciBpZiBmb3VuZC5cbiAgc3dpdGNoIChicm93c2VyRGV0YWlscy5icm93c2VyKSB7XG4gICAgY2FzZSAnY2hyb21lJzpcbiAgICAgIGlmICghY2hyb21lU2hpbSB8fCAhY2hyb21lU2hpbS5zaGltUGVlckNvbm5lY3Rpb24gfHwgIW9wdGlvbnMuc2hpbUNocm9tZSkge1xuICAgICAgICBsb2dnaW5nKCdDaHJvbWUgc2hpbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhpcyBhZGFwdGVyIHJlbGVhc2UuJyk7XG4gICAgICAgIHJldHVybiBhZGFwdGVyO1xuICAgICAgfVxuICAgICAgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPT09IG51bGwpIHtcbiAgICAgICAgbG9nZ2luZygnQ2hyb21lIHNoaW0gY2FuIG5vdCBkZXRlcm1pbmUgdmVyc2lvbiwgbm90IHNoaW1taW5nLicpO1xuICAgICAgICByZXR1cm4gYWRhcHRlcjtcbiAgICAgIH1cbiAgICAgIGxvZ2dpbmcoJ2FkYXB0ZXIuanMgc2hpbW1pbmcgY2hyb21lLicpO1xuICAgICAgLy8gRXhwb3J0IHRvIHRoZSBhZGFwdGVyIGdsb2JhbCBvYmplY3QgdmlzaWJsZSBpbiB0aGUgYnJvd3Nlci5cbiAgICAgIGFkYXB0ZXIuYnJvd3NlclNoaW0gPSBjaHJvbWVTaGltO1xuXG4gICAgICBjaHJvbWVTaGltLnNoaW1HZXRVc2VyTWVkaWEod2luZG93KTtcbiAgICAgIGNocm9tZVNoaW0uc2hpbU1lZGlhU3RyZWFtKHdpbmRvdyk7XG4gICAgICBjaHJvbWVTaGltLnNoaW1QZWVyQ29ubmVjdGlvbih3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5zaGltT25UcmFjayh3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5zaGltQWRkVHJhY2tSZW1vdmVUcmFjayh3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5zaGltR2V0U2VuZGVyc1dpdGhEdG1mKHdpbmRvdyk7XG4gICAgICBjaHJvbWVTaGltLnNoaW1HZXRTdGF0cyh3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5zaGltU2VuZGVyUmVjZWl2ZXJHZXRTdGF0cyh3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5maXhOZWdvdGlhdGlvbk5lZWRlZCh3aW5kb3cpO1xuXG4gICAgICBjb21tb25TaGltLnNoaW1SVENJY2VDYW5kaWRhdGUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbUNvbm5lY3Rpb25TdGF0ZSh3aW5kb3cpO1xuICAgICAgY29tbW9uU2hpbS5zaGltTWF4TWVzc2FnZVNpemUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbVNlbmRUaHJvd1R5cGVFcnJvcih3aW5kb3cpO1xuICAgICAgY29tbW9uU2hpbS5yZW1vdmVBbGxvd0V4dG1hcE1peGVkKHdpbmRvdyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdmaXJlZm94JzpcbiAgICAgIGlmICghZmlyZWZveFNoaW0gfHwgIWZpcmVmb3hTaGltLnNoaW1QZWVyQ29ubmVjdGlvbiB8fCAhb3B0aW9ucy5zaGltRmlyZWZveCkge1xuICAgICAgICBsb2dnaW5nKCdGaXJlZm94IHNoaW0gaXMgbm90IGluY2x1ZGVkIGluIHRoaXMgYWRhcHRlciByZWxlYXNlLicpO1xuICAgICAgICByZXR1cm4gYWRhcHRlcjtcbiAgICAgIH1cbiAgICAgIGxvZ2dpbmcoJ2FkYXB0ZXIuanMgc2hpbW1pbmcgZmlyZWZveC4nKTtcbiAgICAgIC8vIEV4cG9ydCB0byB0aGUgYWRhcHRlciBnbG9iYWwgb2JqZWN0IHZpc2libGUgaW4gdGhlIGJyb3dzZXIuXG4gICAgICBhZGFwdGVyLmJyb3dzZXJTaGltID0gZmlyZWZveFNoaW07XG5cbiAgICAgIGZpcmVmb3hTaGltLnNoaW1HZXRVc2VyTWVkaWEod2luZG93KTtcbiAgICAgIGZpcmVmb3hTaGltLnNoaW1QZWVyQ29ubmVjdGlvbih3aW5kb3cpO1xuICAgICAgZmlyZWZveFNoaW0uc2hpbU9uVHJhY2sod2luZG93KTtcbiAgICAgIGZpcmVmb3hTaGltLnNoaW1SZW1vdmVTdHJlYW0od2luZG93KTtcbiAgICAgIGZpcmVmb3hTaGltLnNoaW1TZW5kZXJHZXRTdGF0cyh3aW5kb3cpO1xuICAgICAgZmlyZWZveFNoaW0uc2hpbVJlY2VpdmVyR2V0U3RhdHMod2luZG93KTtcbiAgICAgIGZpcmVmb3hTaGltLnNoaW1SVENEYXRhQ2hhbm5lbCh3aW5kb3cpO1xuICAgICAgZmlyZWZveFNoaW0uc2hpbUFkZFRyYW5zY2VpdmVyKHdpbmRvdyk7XG4gICAgICBmaXJlZm94U2hpbS5zaGltR2V0UGFyYW1ldGVycyh3aW5kb3cpO1xuICAgICAgZmlyZWZveFNoaW0uc2hpbUNyZWF0ZU9mZmVyKHdpbmRvdyk7XG4gICAgICBmaXJlZm94U2hpbS5zaGltQ3JlYXRlQW5zd2VyKHdpbmRvdyk7XG5cbiAgICAgIGNvbW1vblNoaW0uc2hpbVJUQ0ljZUNhbmRpZGF0ZSh3aW5kb3cpO1xuICAgICAgY29tbW9uU2hpbS5zaGltQ29ubmVjdGlvblN0YXRlKHdpbmRvdyk7XG4gICAgICBjb21tb25TaGltLnNoaW1NYXhNZXNzYWdlU2l6ZSh3aW5kb3cpO1xuICAgICAgY29tbW9uU2hpbS5zaGltU2VuZFRocm93VHlwZUVycm9yKHdpbmRvdyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdlZGdlJzpcbiAgICAgIGlmICghZWRnZVNoaW0gfHwgIWVkZ2VTaGltLnNoaW1QZWVyQ29ubmVjdGlvbiB8fCAhb3B0aW9ucy5zaGltRWRnZSkge1xuICAgICAgICBsb2dnaW5nKCdNUyBlZGdlIHNoaW0gaXMgbm90IGluY2x1ZGVkIGluIHRoaXMgYWRhcHRlciByZWxlYXNlLicpO1xuICAgICAgICByZXR1cm4gYWRhcHRlcjtcbiAgICAgIH1cbiAgICAgIGxvZ2dpbmcoJ2FkYXB0ZXIuanMgc2hpbW1pbmcgZWRnZS4nKTtcbiAgICAgIC8vIEV4cG9ydCB0byB0aGUgYWRhcHRlciBnbG9iYWwgb2JqZWN0IHZpc2libGUgaW4gdGhlIGJyb3dzZXIuXG4gICAgICBhZGFwdGVyLmJyb3dzZXJTaGltID0gZWRnZVNoaW07XG5cbiAgICAgIGVkZ2VTaGltLnNoaW1HZXRVc2VyTWVkaWEod2luZG93KTtcbiAgICAgIGVkZ2VTaGltLnNoaW1HZXREaXNwbGF5TWVkaWEod2luZG93KTtcbiAgICAgIGVkZ2VTaGltLnNoaW1QZWVyQ29ubmVjdGlvbih3aW5kb3cpO1xuICAgICAgZWRnZVNoaW0uc2hpbVJlcGxhY2VUcmFjayh3aW5kb3cpO1xuXG4gICAgICAvLyB0aGUgZWRnZSBzaGltIGltcGxlbWVudHMgdGhlIGZ1bGwgUlRDSWNlQ2FuZGlkYXRlIG9iamVjdC5cblxuICAgICAgY29tbW9uU2hpbS5zaGltTWF4TWVzc2FnZVNpemUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbVNlbmRUaHJvd1R5cGVFcnJvcih3aW5kb3cpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnc2FmYXJpJzpcbiAgICAgIGlmICghc2FmYXJpU2hpbSB8fCAhb3B0aW9ucy5zaGltU2FmYXJpKSB7XG4gICAgICAgIGxvZ2dpbmcoJ1NhZmFyaSBzaGltIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGlzIGFkYXB0ZXIgcmVsZWFzZS4nKTtcbiAgICAgICAgcmV0dXJuIGFkYXB0ZXI7XG4gICAgICB9XG4gICAgICBsb2dnaW5nKCdhZGFwdGVyLmpzIHNoaW1taW5nIHNhZmFyaS4nKTtcbiAgICAgIC8vIEV4cG9ydCB0byB0aGUgYWRhcHRlciBnbG9iYWwgb2JqZWN0IHZpc2libGUgaW4gdGhlIGJyb3dzZXIuXG4gICAgICBhZGFwdGVyLmJyb3dzZXJTaGltID0gc2FmYXJpU2hpbTtcblxuICAgICAgc2FmYXJpU2hpbS5zaGltUlRDSWNlU2VydmVyVXJscyh3aW5kb3cpO1xuICAgICAgc2FmYXJpU2hpbS5zaGltQ3JlYXRlT2ZmZXJMZWdhY3kod2luZG93KTtcbiAgICAgIHNhZmFyaVNoaW0uc2hpbUNhbGxiYWNrc0FQSSh3aW5kb3cpO1xuICAgICAgc2FmYXJpU2hpbS5zaGltTG9jYWxTdHJlYW1zQVBJKHdpbmRvdyk7XG4gICAgICBzYWZhcmlTaGltLnNoaW1SZW1vdGVTdHJlYW1zQVBJKHdpbmRvdyk7XG4gICAgICBzYWZhcmlTaGltLnNoaW1UcmFja0V2ZW50VHJhbnNjZWl2ZXIod2luZG93KTtcbiAgICAgIHNhZmFyaVNoaW0uc2hpbUdldFVzZXJNZWRpYSh3aW5kb3cpO1xuICAgICAgc2FmYXJpU2hpbS5zaGltQXVkaW9Db250ZXh0KHdpbmRvdyk7XG5cbiAgICAgIGNvbW1vblNoaW0uc2hpbVJUQ0ljZUNhbmRpZGF0ZSh3aW5kb3cpO1xuICAgICAgY29tbW9uU2hpbS5zaGltTWF4TWVzc2FnZVNpemUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbVNlbmRUaHJvd1R5cGVFcnJvcih3aW5kb3cpO1xuICAgICAgY29tbW9uU2hpbS5yZW1vdmVBbGxvd0V4dG1hcE1peGVkKHdpbmRvdyk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgbG9nZ2luZygnVW5zdXBwb3J0ZWQgYnJvd3NlciEnKTtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIGFkYXB0ZXI7XG59XG5cbi8vIEJyb3dzZXIgc2hpbXMuXG4iLCIvKlxuICogIENvcHlyaWdodCAoYykgMjAxNiBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaGltR2V0RGlzcGxheU1lZGlhID0gZXhwb3J0cy5zaGltR2V0VXNlck1lZGlhID0gdW5kZWZpbmVkO1xuXG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbnZhciBfZ2V0dXNlcm1lZGlhID0gcmVxdWlyZSgnLi9nZXR1c2VybWVkaWEnKTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdzaGltR2V0VXNlck1lZGlhJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gX2dldHVzZXJtZWRpYS5zaGltR2V0VXNlck1lZGlhO1xuICB9XG59KTtcblxudmFyIF9nZXRkaXNwbGF5bWVkaWEgPSByZXF1aXJlKCcuL2dldGRpc3BsYXltZWRpYScpO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ3NoaW1HZXREaXNwbGF5TWVkaWEnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgIHJldHVybiBfZ2V0ZGlzcGxheW1lZGlhLnNoaW1HZXREaXNwbGF5TWVkaWE7XG4gIH1cbn0pO1xuZXhwb3J0cy5zaGltTWVkaWFTdHJlYW0gPSBzaGltTWVkaWFTdHJlYW07XG5leHBvcnRzLnNoaW1PblRyYWNrID0gc2hpbU9uVHJhY2s7XG5leHBvcnRzLnNoaW1HZXRTZW5kZXJzV2l0aER0bWYgPSBzaGltR2V0U2VuZGVyc1dpdGhEdG1mO1xuZXhwb3J0cy5zaGltR2V0U3RhdHMgPSBzaGltR2V0U3RhdHM7XG5leHBvcnRzLnNoaW1TZW5kZXJSZWNlaXZlckdldFN0YXRzID0gc2hpbVNlbmRlclJlY2VpdmVyR2V0U3RhdHM7XG5leHBvcnRzLnNoaW1BZGRUcmFja1JlbW92ZVRyYWNrV2l0aE5hdGl2ZSA9IHNoaW1BZGRUcmFja1JlbW92ZVRyYWNrV2l0aE5hdGl2ZTtcbmV4cG9ydHMuc2hpbUFkZFRyYWNrUmVtb3ZlVHJhY2sgPSBzaGltQWRkVHJhY2tSZW1vdmVUcmFjaztcbmV4cG9ydHMuc2hpbVBlZXJDb25uZWN0aW9uID0gc2hpbVBlZXJDb25uZWN0aW9uO1xuZXhwb3J0cy5maXhOZWdvdGlhdGlvbk5lZWRlZCA9IGZpeE5lZ290aWF0aW9uTmVlZGVkO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxudmFyIHV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3V0aWxzKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KG9iaiwga2V5LCB2YWx1ZSkgeyBpZiAoa2V5IGluIG9iaikgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHsgdmFsdWU6IHZhbHVlLCBlbnVtZXJhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIHdyaXRhYmxlOiB0cnVlIH0pOyB9IGVsc2UgeyBvYmpba2V5XSA9IHZhbHVlOyB9IHJldHVybiBvYmo7IH1cblxuZnVuY3Rpb24gc2hpbU1lZGlhU3RyZWFtKHdpbmRvdykge1xuICB3aW5kb3cuTWVkaWFTdHJlYW0gPSB3aW5kb3cuTWVkaWFTdHJlYW0gfHwgd2luZG93LndlYmtpdE1lZGlhU3RyZWFtO1xufVxuXG5mdW5jdGlvbiBzaGltT25UcmFjayh3aW5kb3cpIHtcbiAgaWYgKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uICYmICEoJ29udHJhY2snIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUsICdvbnRyYWNrJywge1xuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vbnRyYWNrO1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24gc2V0KGYpIHtcbiAgICAgICAgaWYgKHRoaXMuX29udHJhY2spIHtcbiAgICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RyYWNrJywgdGhpcy5fb250cmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0cmFjaycsIHRoaXMuX29udHJhY2sgPSBmKTtcbiAgICAgIH0sXG5cbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICB2YXIgb3JpZ1NldFJlbW90ZURlc2NyaXB0aW9uID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbjtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uID0gZnVuY3Rpb24gc2V0UmVtb3RlRGVzY3JpcHRpb24oKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICBpZiAoIXRoaXMuX29udHJhY2twb2x5KSB7XG4gICAgICAgIHRoaXMuX29udHJhY2twb2x5ID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAvLyBvbmFkZHN0cmVhbSBkb2VzIG5vdCBmaXJlIHdoZW4gYSB0cmFjayBpcyBhZGRlZCB0byBhbiBleGlzdGluZ1xuICAgICAgICAgIC8vIHN0cmVhbS4gQnV0IHN0cmVhbS5vbmFkZHRyYWNrIGlzIGltcGxlbWVudGVkIHNvIHdlIHVzZSB0aGF0LlxuICAgICAgICAgIGUuc3RyZWFtLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZHRyYWNrJywgZnVuY3Rpb24gKHRlKSB7XG4gICAgICAgICAgICB2YXIgcmVjZWl2ZXIgPSB2b2lkIDA7XG4gICAgICAgICAgICBpZiAod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRSZWNlaXZlcnMpIHtcbiAgICAgICAgICAgICAgcmVjZWl2ZXIgPSBfdGhpcy5nZXRSZWNlaXZlcnMoKS5maW5kKGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHIudHJhY2sgJiYgci50cmFjay5pZCA9PT0gdGUudHJhY2suaWQ7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVjZWl2ZXIgPSB7IHRyYWNrOiB0ZS50cmFjayB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ3RyYWNrJyk7XG4gICAgICAgICAgICBldmVudC50cmFjayA9IHRlLnRyYWNrO1xuICAgICAgICAgICAgZXZlbnQucmVjZWl2ZXIgPSByZWNlaXZlcjtcbiAgICAgICAgICAgIGV2ZW50LnRyYW5zY2VpdmVyID0geyByZWNlaXZlcjogcmVjZWl2ZXIgfTtcbiAgICAgICAgICAgIGV2ZW50LnN0cmVhbXMgPSBbZS5zdHJlYW1dO1xuICAgICAgICAgICAgX3RoaXMuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZS5zdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgICAgIHZhciByZWNlaXZlciA9IHZvaWQgMDtcbiAgICAgICAgICAgIGlmICh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFJlY2VpdmVycykge1xuICAgICAgICAgICAgICByZWNlaXZlciA9IF90aGlzLmdldFJlY2VpdmVycygpLmZpbmQoZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gci50cmFjayAmJiByLnRyYWNrLmlkID09PSB0cmFjay5pZDtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZWNlaXZlciA9IHsgdHJhY2s6IHRyYWNrIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ3RyYWNrJyk7XG4gICAgICAgICAgICBldmVudC50cmFjayA9IHRyYWNrO1xuICAgICAgICAgICAgZXZlbnQucmVjZWl2ZXIgPSByZWNlaXZlcjtcbiAgICAgICAgICAgIGV2ZW50LnRyYW5zY2VpdmVyID0geyByZWNlaXZlcjogcmVjZWl2ZXIgfTtcbiAgICAgICAgICAgIGV2ZW50LnN0cmVhbXMgPSBbZS5zdHJlYW1dO1xuICAgICAgICAgICAgX3RoaXMuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignYWRkc3RyZWFtJywgdGhpcy5fb250cmFja3BvbHkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaWdTZXRSZW1vdGVEZXNjcmlwdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgLy8gZXZlbiBpZiBSVENSdHBUcmFuc2NlaXZlciBpcyBpbiB3aW5kb3csIGl0IGlzIG9ubHkgdXNlZCBhbmRcbiAgICAvLyBlbWl0dGVkIGluIHVuaWZpZWQtcGxhbi4gVW5mb3J0dW5hdGVseSB0aGlzIG1lYW5zIHdlIG5lZWRcbiAgICAvLyB0byB1bmNvbmRpdGlvbmFsbHkgd3JhcCB0aGUgZXZlbnQuXG4gICAgdXRpbHMud3JhcFBlZXJDb25uZWN0aW9uRXZlbnQod2luZG93LCAndHJhY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgaWYgKCFlLnRyYW5zY2VpdmVyKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCAndHJhbnNjZWl2ZXInLCB7IHZhbHVlOiB7IHJlY2VpdmVyOiBlLnJlY2VpdmVyIH0gfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaGltR2V0U2VuZGVyc1dpdGhEdG1mKHdpbmRvdykge1xuICAvLyBPdmVycmlkZXMgYWRkVHJhY2svcmVtb3ZlVHJhY2ssIGRlcGVuZHMgb24gc2hpbUFkZFRyYWNrUmVtb3ZlVHJhY2suXG4gIGlmICgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgPT09ICdvYmplY3QnICYmIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJiAhKCdnZXRTZW5kZXJzJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlKSAmJiAnY3JlYXRlRFRNRlNlbmRlcicgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkge1xuICAgIHZhciBzaGltU2VuZGVyV2l0aER0bWYgPSBmdW5jdGlvbiBzaGltU2VuZGVyV2l0aER0bWYocGMsIHRyYWNrKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmFjazogdHJhY2ssXG4gICAgICAgIGdldCBkdG1mKCkge1xuICAgICAgICAgIGlmICh0aGlzLl9kdG1mID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh0cmFjay5raW5kID09PSAnYXVkaW8nKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2R0bWYgPSBwYy5jcmVhdGVEVE1GU2VuZGVyKHRyYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMuX2R0bWYgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdGhpcy5fZHRtZjtcbiAgICAgICAgfSxcbiAgICAgICAgX3BjOiBwY1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gYXVnbWVudCBhZGRUcmFjayB3aGVuIGdldFNlbmRlcnMgaXMgbm90IGF2YWlsYWJsZS5cbiAgICBpZiAoIXdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U2VuZGVycykge1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTZW5kZXJzID0gZnVuY3Rpb24gZ2V0U2VuZGVycygpIHtcbiAgICAgICAgdGhpcy5fc2VuZGVycyA9IHRoaXMuX3NlbmRlcnMgfHwgW107XG4gICAgICAgIHJldHVybiB0aGlzLl9zZW5kZXJzLnNsaWNlKCk7IC8vIHJldHVybiBhIGNvcHkgb2YgdGhlIGludGVybmFsIHN0YXRlLlxuICAgICAgfTtcbiAgICAgIHZhciBvcmlnQWRkVHJhY2sgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrO1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRUcmFjayA9IGZ1bmN0aW9uIGFkZFRyYWNrKHRyYWNrLCBzdHJlYW0pIHtcbiAgICAgICAgdmFyIHNlbmRlciA9IG9yaWdBZGRUcmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBpZiAoIXNlbmRlcikge1xuICAgICAgICAgIHNlbmRlciA9IHNoaW1TZW5kZXJXaXRoRHRtZih0aGlzLCB0cmFjayk7XG4gICAgICAgICAgdGhpcy5fc2VuZGVycy5wdXNoKHNlbmRlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbmRlcjtcbiAgICAgIH07XG5cbiAgICAgIHZhciBvcmlnUmVtb3ZlVHJhY2sgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVRyYWNrO1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVUcmFjayA9IGZ1bmN0aW9uIHJlbW92ZVRyYWNrKHNlbmRlcikge1xuICAgICAgICBvcmlnUmVtb3ZlVHJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIGlkeCA9IHRoaXMuX3NlbmRlcnMuaW5kZXhPZihzZW5kZXIpO1xuICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xuICAgICAgICAgIHRoaXMuX3NlbmRlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICAgIHZhciBvcmlnQWRkU3RyZWFtID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRTdHJlYW07XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRTdHJlYW0gPSBmdW5jdGlvbiBhZGRTdHJlYW0oc3RyZWFtKSB7XG4gICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgdGhpcy5fc2VuZGVycyA9IHRoaXMuX3NlbmRlcnMgfHwgW107XG4gICAgICBvcmlnQWRkU3RyZWFtLmFwcGx5KHRoaXMsIFtzdHJlYW1dKTtcbiAgICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICBfdGhpczIuX3NlbmRlcnMucHVzaChzaGltU2VuZGVyV2l0aER0bWYoX3RoaXMyLCB0cmFjaykpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBvcmlnUmVtb3ZlU3RyZWFtID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW07XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbiByZW1vdmVTdHJlYW0oc3RyZWFtKSB7XG4gICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgdGhpcy5fc2VuZGVycyA9IHRoaXMuX3NlbmRlcnMgfHwgW107XG4gICAgICBvcmlnUmVtb3ZlU3RyZWFtLmFwcGx5KHRoaXMsIFtzdHJlYW1dKTtcblxuICAgICAgc3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgIHZhciBzZW5kZXIgPSBfdGhpczMuX3NlbmRlcnMuZmluZChmdW5jdGlvbiAocykge1xuICAgICAgICAgIHJldHVybiBzLnRyYWNrID09PSB0cmFjaztcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzZW5kZXIpIHtcbiAgICAgICAgICAvLyByZW1vdmUgc2VuZGVyXG4gICAgICAgICAgX3RoaXMzLl9zZW5kZXJzLnNwbGljZShfdGhpczMuX3NlbmRlcnMuaW5kZXhPZihzZW5kZXIpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgPT09ICdvYmplY3QnICYmIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJiAnZ2V0U2VuZGVycycgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSAmJiAnY3JlYXRlRFRNRlNlbmRlcicgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSAmJiB3aW5kb3cuUlRDUnRwU2VuZGVyICYmICEoJ2R0bWYnIGluIHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlKSkge1xuICAgIHZhciBvcmlnR2V0U2VuZGVycyA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U2VuZGVycztcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFNlbmRlcnMgPSBmdW5jdGlvbiBnZXRTZW5kZXJzKCkge1xuICAgICAgdmFyIF90aGlzNCA9IHRoaXM7XG5cbiAgICAgIHZhciBzZW5kZXJzID0gb3JpZ0dldFNlbmRlcnMuYXBwbHkodGhpcywgW10pO1xuICAgICAgc2VuZGVycy5mb3JFYWNoKGZ1bmN0aW9uIChzZW5kZXIpIHtcbiAgICAgICAgcmV0dXJuIHNlbmRlci5fcGMgPSBfdGhpczQ7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBzZW5kZXJzO1xuICAgIH07XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LlJUQ1J0cFNlbmRlci5wcm90b3R5cGUsICdkdG1mJywge1xuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIGlmICh0aGlzLl9kdG1mID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodGhpcy50cmFjay5raW5kID09PSAnYXVkaW8nKSB7XG4gICAgICAgICAgICB0aGlzLl9kdG1mID0gdGhpcy5fcGMuY3JlYXRlRFRNRlNlbmRlcih0aGlzLnRyYWNrKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZHRtZiA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9kdG1mO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNoaW1HZXRTdGF0cyh3aW5kb3cpIHtcbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgb3JpZ0dldFN0YXRzID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTdGF0cztcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uIGdldFN0YXRzKCkge1xuICAgIHZhciBfdGhpczUgPSB0aGlzO1xuXG4gICAgdmFyIF9hcmd1bWVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgICBzZWxlY3RvciA9IF9hcmd1bWVudHNbMF0sXG4gICAgICAgIG9uU3VjYyA9IF9hcmd1bWVudHNbMV0sXG4gICAgICAgIG9uRXJyID0gX2FyZ3VtZW50c1syXTtcblxuICAgIC8vIElmIHNlbGVjdG9yIGlzIGEgZnVuY3Rpb24gdGhlbiB3ZSBhcmUgaW4gdGhlIG9sZCBzdHlsZSBzdGF0cyBzbyBqdXN0XG4gICAgLy8gcGFzcyBiYWNrIHRoZSBvcmlnaW5hbCBnZXRTdGF0cyBmb3JtYXQgdG8gYXZvaWQgYnJlYWtpbmcgb2xkIHVzZXJzLlxuXG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgdHlwZW9mIHNlbGVjdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gb3JpZ0dldFN0YXRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgLy8gV2hlbiBzcGVjLXN0eWxlIGdldFN0YXRzIGlzIHN1cHBvcnRlZCwgcmV0dXJuIHRob3NlIHdoZW4gY2FsbGVkIHdpdGhcbiAgICAvLyBlaXRoZXIgbm8gYXJndW1lbnRzIG9yIHRoZSBzZWxlY3RvciBhcmd1bWVudCBpcyBudWxsLlxuICAgIGlmIChvcmlnR2V0U3RhdHMubGVuZ3RoID09PSAwICYmIChhcmd1bWVudHMubGVuZ3RoID09PSAwIHx8IHR5cGVvZiBzZWxlY3RvciAhPT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgIHJldHVybiBvcmlnR2V0U3RhdHMuYXBwbHkodGhpcywgW10pO1xuICAgIH1cblxuICAgIHZhciBmaXhDaHJvbWVTdGF0c18gPSBmdW5jdGlvbiBmaXhDaHJvbWVTdGF0c18ocmVzcG9uc2UpIHtcbiAgICAgIHZhciBzdGFuZGFyZFJlcG9ydCA9IHt9O1xuICAgICAgdmFyIHJlcG9ydHMgPSByZXNwb25zZS5yZXN1bHQoKTtcbiAgICAgIHJlcG9ydHMuZm9yRWFjaChmdW5jdGlvbiAocmVwb3J0KSB7XG4gICAgICAgIHZhciBzdGFuZGFyZFN0YXRzID0ge1xuICAgICAgICAgIGlkOiByZXBvcnQuaWQsXG4gICAgICAgICAgdGltZXN0YW1wOiByZXBvcnQudGltZXN0YW1wLFxuICAgICAgICAgIHR5cGU6IHtcbiAgICAgICAgICAgIGxvY2FsY2FuZGlkYXRlOiAnbG9jYWwtY2FuZGlkYXRlJyxcbiAgICAgICAgICAgIHJlbW90ZWNhbmRpZGF0ZTogJ3JlbW90ZS1jYW5kaWRhdGUnXG4gICAgICAgICAgfVtyZXBvcnQudHlwZV0gfHwgcmVwb3J0LnR5cGVcbiAgICAgICAgfTtcbiAgICAgICAgcmVwb3J0Lm5hbWVzKCkuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgIHN0YW5kYXJkU3RhdHNbbmFtZV0gPSByZXBvcnQuc3RhdChuYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN0YW5kYXJkUmVwb3J0W3N0YW5kYXJkU3RhdHMuaWRdID0gc3RhbmRhcmRTdGF0cztcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gc3RhbmRhcmRSZXBvcnQ7XG4gICAgfTtcblxuICAgIC8vIHNoaW0gZ2V0U3RhdHMgd2l0aCBtYXBsaWtlIHN1cHBvcnRcbiAgICB2YXIgbWFrZU1hcFN0YXRzID0gZnVuY3Rpb24gbWFrZU1hcFN0YXRzKHN0YXRzKSB7XG4gICAgICByZXR1cm4gbmV3IE1hcChPYmplY3Qua2V5cyhzdGF0cykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIFtrZXksIHN0YXRzW2tleV1dO1xuICAgICAgfSkpO1xuICAgIH07XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAyKSB7XG4gICAgICB2YXIgc3VjY2Vzc0NhbGxiYWNrV3JhcHBlcl8gPSBmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2tXcmFwcGVyXyhyZXNwb25zZSkge1xuICAgICAgICBvblN1Y2MobWFrZU1hcFN0YXRzKGZpeENocm9tZVN0YXRzXyhyZXNwb25zZSkpKTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBvcmlnR2V0U3RhdHMuYXBwbHkodGhpcywgW3N1Y2Nlc3NDYWxsYmFja1dyYXBwZXJfLCBzZWxlY3Rvcl0pO1xuICAgIH1cblxuICAgIC8vIHByb21pc2Utc3VwcG9ydFxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBvcmlnR2V0U3RhdHMuYXBwbHkoX3RoaXM1LCBbZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIHJlc29sdmUobWFrZU1hcFN0YXRzKGZpeENocm9tZVN0YXRzXyhyZXNwb25zZSkpKTtcbiAgICAgIH0sIHJlamVjdF0pO1xuICAgIH0pLnRoZW4ob25TdWNjLCBvbkVycik7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHNoaW1TZW5kZXJSZWNlaXZlckdldFN0YXRzKHdpbmRvdykge1xuICBpZiAoISgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgPT09ICdvYmplY3QnICYmIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJiB3aW5kb3cuUlRDUnRwU2VuZGVyICYmIHdpbmRvdy5SVENSdHBSZWNlaXZlcikpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBzaGltIHNlbmRlciBzdGF0cy5cbiAgaWYgKCEoJ2dldFN0YXRzJyBpbiB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZSkpIHtcbiAgICB2YXIgb3JpZ0dldFNlbmRlcnMgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFNlbmRlcnM7XG4gICAgaWYgKG9yaWdHZXRTZW5kZXJzKSB7XG4gICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFNlbmRlcnMgPSBmdW5jdGlvbiBnZXRTZW5kZXJzKCkge1xuICAgICAgICB2YXIgX3RoaXM2ID0gdGhpcztcblxuICAgICAgICB2YXIgc2VuZGVycyA9IG9yaWdHZXRTZW5kZXJzLmFwcGx5KHRoaXMsIFtdKTtcbiAgICAgICAgc2VuZGVycy5mb3JFYWNoKGZ1bmN0aW9uIChzZW5kZXIpIHtcbiAgICAgICAgICByZXR1cm4gc2VuZGVyLl9wYyA9IF90aGlzNjtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzZW5kZXJzO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgb3JpZ0FkZFRyYWNrID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRUcmFjaztcbiAgICBpZiAob3JpZ0FkZFRyYWNrKSB7XG4gICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrID0gZnVuY3Rpb24gYWRkVHJhY2soKSB7XG4gICAgICAgIHZhciBzZW5kZXIgPSBvcmlnQWRkVHJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgc2VuZGVyLl9wYyA9IHRoaXM7XG4gICAgICAgIHJldHVybiBzZW5kZXI7XG4gICAgICB9O1xuICAgIH1cbiAgICB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uIGdldFN0YXRzKCkge1xuICAgICAgdmFyIHNlbmRlciA9IHRoaXM7XG4gICAgICByZXR1cm4gdGhpcy5fcGMuZ2V0U3RhdHMoKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAvKiBOb3RlOiB0aGlzIHdpbGwgaW5jbHVkZSBzdGF0cyBvZiBhbGwgc2VuZGVycyB0aGF0XG4gICAgICAgICAgICogICBzZW5kIGEgdHJhY2sgd2l0aCB0aGUgc2FtZSBpZCBhcyBzZW5kZXIudHJhY2sgYXNcbiAgICAgICAgICAgKiAgIGl0IGlzIG5vdCBwb3NzaWJsZSB0byBpZGVudGlmeSB0aGUgUlRDUnRwU2VuZGVyLlxuICAgICAgICAgICAqL1xuICAgICAgICAgIHV0aWxzLmZpbHRlclN0YXRzKHJlc3VsdCwgc2VuZGVyLnRyYWNrLCB0cnVlKVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIHNoaW0gcmVjZWl2ZXIgc3RhdHMuXG4gIGlmICghKCdnZXRTdGF0cycgaW4gd2luZG93LlJUQ1J0cFJlY2VpdmVyLnByb3RvdHlwZSkpIHtcbiAgICB2YXIgb3JpZ0dldFJlY2VpdmVycyA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0UmVjZWl2ZXJzO1xuICAgIGlmIChvcmlnR2V0UmVjZWl2ZXJzKSB7XG4gICAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFJlY2VpdmVycyA9IGZ1bmN0aW9uIGdldFJlY2VpdmVycygpIHtcbiAgICAgICAgdmFyIF90aGlzNyA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHJlY2VpdmVycyA9IG9yaWdHZXRSZWNlaXZlcnMuYXBwbHkodGhpcywgW10pO1xuICAgICAgICByZWNlaXZlcnMuZm9yRWFjaChmdW5jdGlvbiAocmVjZWl2ZXIpIHtcbiAgICAgICAgICByZXR1cm4gcmVjZWl2ZXIuX3BjID0gX3RoaXM3O1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlY2VpdmVycztcbiAgICAgIH07XG4gICAgfVxuICAgIHV0aWxzLndyYXBQZWVyQ29ubmVjdGlvbkV2ZW50KHdpbmRvdywgJ3RyYWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIGUucmVjZWl2ZXIuX3BjID0gZS5zcmNFbGVtZW50O1xuICAgICAgcmV0dXJuIGU7XG4gICAgfSk7XG4gICAgd2luZG93LlJUQ1J0cFJlY2VpdmVyLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uIGdldFN0YXRzKCkge1xuICAgICAgdmFyIHJlY2VpdmVyID0gdGhpcztcbiAgICAgIHJldHVybiB0aGlzLl9wYy5nZXRTdGF0cygpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICByZXR1cm4gdXRpbHMuZmlsdGVyU3RhdHMocmVzdWx0LCByZWNlaXZlci50cmFjaywgZmFsc2UpO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxuXG4gIGlmICghKCdnZXRTdGF0cycgaW4gd2luZG93LlJUQ1J0cFNlbmRlci5wcm90b3R5cGUgJiYgJ2dldFN0YXRzJyBpbiB3aW5kb3cuUlRDUnRwUmVjZWl2ZXIucHJvdG90eXBlKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIHNoaW0gUlRDUGVlckNvbm5lY3Rpb24uZ2V0U3RhdHModHJhY2spLlxuICB2YXIgb3JpZ0dldFN0YXRzID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTdGF0cztcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uIGdldFN0YXRzKCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiB3aW5kb3cuTWVkaWFTdHJlYW1UcmFjaykge1xuICAgICAgdmFyIHRyYWNrID0gYXJndW1lbnRzWzBdO1xuICAgICAgdmFyIHNlbmRlciA9IHZvaWQgMDtcbiAgICAgIHZhciByZWNlaXZlciA9IHZvaWQgMDtcbiAgICAgIHZhciBlcnIgPSB2b2lkIDA7XG4gICAgICB0aGlzLmdldFNlbmRlcnMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIGlmIChzLnRyYWNrID09PSB0cmFjaykge1xuICAgICAgICAgIGlmIChzZW5kZXIpIHtcbiAgICAgICAgICAgIGVyciA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbmRlciA9IHM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHRoaXMuZ2V0UmVjZWl2ZXJzKCkuZm9yRWFjaChmdW5jdGlvbiAocikge1xuICAgICAgICBpZiAoci50cmFjayA9PT0gdHJhY2spIHtcbiAgICAgICAgICBpZiAocmVjZWl2ZXIpIHtcbiAgICAgICAgICAgIGVyciA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlY2VpdmVyID0gcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHIudHJhY2sgPT09IHRyYWNrO1xuICAgICAgfSk7XG4gICAgICBpZiAoZXJyIHx8IHNlbmRlciAmJiByZWNlaXZlcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IERPTUV4Y2VwdGlvbignVGhlcmUgYXJlIG1vcmUgdGhhbiBvbmUgc2VuZGVyIG9yIHJlY2VpdmVyIGZvciB0aGUgdHJhY2suJywgJ0ludmFsaWRBY2Nlc3NFcnJvcicpKTtcbiAgICAgIH0gZWxzZSBpZiAoc2VuZGVyKSB7XG4gICAgICAgIHJldHVybiBzZW5kZXIuZ2V0U3RhdHMoKTtcbiAgICAgIH0gZWxzZSBpZiAocmVjZWl2ZXIpIHtcbiAgICAgICAgcmV0dXJuIHJlY2VpdmVyLmdldFN0YXRzKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IERPTUV4Y2VwdGlvbignVGhlcmUgaXMgbm8gc2VuZGVyIG9yIHJlY2VpdmVyIGZvciB0aGUgdHJhY2suJywgJ0ludmFsaWRBY2Nlc3NFcnJvcicpKTtcbiAgICB9XG4gICAgcmV0dXJuIG9yaWdHZXRTdGF0cy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzaGltQWRkVHJhY2tSZW1vdmVUcmFja1dpdGhOYXRpdmUod2luZG93KSB7XG4gIC8vIHNoaW0gYWRkVHJhY2svcmVtb3ZlVHJhY2sgd2l0aCBuYXRpdmUgdmFyaWFudHMgaW4gb3JkZXIgdG8gbWFrZVxuICAvLyB0aGUgaW50ZXJhY3Rpb25zIHdpdGggbGVnYWN5IGdldExvY2FsU3RyZWFtcyBiZWhhdmUgYXMgaW4gb3RoZXIgYnJvd3NlcnMuXG4gIC8vIEtlZXBzIGEgbWFwcGluZyBzdHJlYW0uaWQgPT4gW3N0cmVhbSwgcnRwc2VuZGVycy4uLl1cbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRMb2NhbFN0cmVhbXMgPSBmdW5jdGlvbiBnZXRMb2NhbFN0cmVhbXMoKSB7XG4gICAgdmFyIF90aGlzOCA9IHRoaXM7XG5cbiAgICB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zID0gdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcyB8fCB7fTtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcykubWFwKGZ1bmN0aW9uIChzdHJlYW1JZCkge1xuICAgICAgcmV0dXJuIF90aGlzOC5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW1JZF1bMF07XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIG9yaWdBZGRUcmFjayA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2s7XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2sgPSBmdW5jdGlvbiBhZGRUcmFjayh0cmFjaywgc3RyZWFtKSB7XG4gICAgaWYgKCFzdHJlYW0pIHtcbiAgICAgIHJldHVybiBvcmlnQWRkVHJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcyA9IHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMgfHwge307XG5cbiAgICB2YXIgc2VuZGVyID0gb3JpZ0FkZFRyYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKCF0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zW3N0cmVhbS5pZF0pIHtcbiAgICAgIHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXNbc3RyZWFtLmlkXSA9IFtzdHJlYW0sIHNlbmRlcl07XG4gICAgfSBlbHNlIGlmICh0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zW3N0cmVhbS5pZF0uaW5kZXhPZihzZW5kZXIpID09PSAtMSkge1xuICAgICAgdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW0uaWRdLnB1c2goc2VuZGVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlbmRlcjtcbiAgfTtcblxuICB2YXIgb3JpZ0FkZFN0cmVhbSA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU3RyZWFtO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbSA9IGZ1bmN0aW9uIGFkZFN0cmVhbShzdHJlYW0pIHtcbiAgICB2YXIgX3RoaXM5ID0gdGhpcztcblxuICAgIHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMgPSB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zIHx8IHt9O1xuXG4gICAgc3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICB2YXIgYWxyZWFkeUV4aXN0cyA9IF90aGlzOS5nZXRTZW5kZXJzKCkuZmluZChmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gcy50cmFjayA9PT0gdHJhY2s7XG4gICAgICB9KTtcbiAgICAgIGlmIChhbHJlYWR5RXhpc3RzKSB7XG4gICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1RyYWNrIGFscmVhZHkgZXhpc3RzLicsICdJbnZhbGlkQWNjZXNzRXJyb3InKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgZXhpc3RpbmdTZW5kZXJzID0gdGhpcy5nZXRTZW5kZXJzKCk7XG4gICAgb3JpZ0FkZFN0cmVhbS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHZhciBuZXdTZW5kZXJzID0gdGhpcy5nZXRTZW5kZXJzKCkuZmlsdGVyKGZ1bmN0aW9uIChuZXdTZW5kZXIpIHtcbiAgICAgIHJldHVybiBleGlzdGluZ1NlbmRlcnMuaW5kZXhPZihuZXdTZW5kZXIpID09PSAtMTtcbiAgICB9KTtcbiAgICB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zW3N0cmVhbS5pZF0gPSBbc3RyZWFtXS5jb25jYXQobmV3U2VuZGVycyk7XG4gIH07XG5cbiAgdmFyIG9yaWdSZW1vdmVTdHJlYW0gPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVN0cmVhbTtcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbiByZW1vdmVTdHJlYW0oc3RyZWFtKSB7XG4gICAgdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcyA9IHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMgfHwge307XG4gICAgZGVsZXRlIHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXNbc3RyZWFtLmlkXTtcbiAgICByZXR1cm4gb3JpZ1JlbW92ZVN0cmVhbS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xuXG4gIHZhciBvcmlnUmVtb3ZlVHJhY2sgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVRyYWNrO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVRyYWNrID0gZnVuY3Rpb24gcmVtb3ZlVHJhY2soc2VuZGVyKSB7XG4gICAgdmFyIF90aGlzMTAgPSB0aGlzO1xuXG4gICAgdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcyA9IHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMgfHwge307XG4gICAgaWYgKHNlbmRlcikge1xuICAgICAgT2JqZWN0LmtleXModGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcykuZm9yRWFjaChmdW5jdGlvbiAoc3RyZWFtSWQpIHtcbiAgICAgICAgdmFyIGlkeCA9IF90aGlzMTAuX3NoaW1tZWRMb2NhbFN0cmVhbXNbc3RyZWFtSWRdLmluZGV4T2Yoc2VuZGVyKTtcbiAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHtcbiAgICAgICAgICBfdGhpczEwLl9zaGltbWVkTG9jYWxTdHJlYW1zW3N0cmVhbUlkXS5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoX3RoaXMxMC5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW1JZF0ubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgZGVsZXRlIF90aGlzMTAuX3NoaW1tZWRMb2NhbFN0cmVhbXNbc3RyZWFtSWRdO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG9yaWdSZW1vdmVUcmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzaGltQWRkVHJhY2tSZW1vdmVUcmFjayh3aW5kb3cpIHtcbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuICAvLyBzaGltIGFkZFRyYWNrIGFuZCByZW1vdmVUcmFjay5cbiAgaWYgKHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2sgJiYgYnJvd3NlckRldGFpbHMudmVyc2lvbiA+PSA2NSkge1xuICAgIHJldHVybiBzaGltQWRkVHJhY2tSZW1vdmVUcmFja1dpdGhOYXRpdmUod2luZG93KTtcbiAgfVxuXG4gIC8vIGFsc28gc2hpbSBwYy5nZXRMb2NhbFN0cmVhbXMgd2hlbiBhZGRUcmFjayBpcyBzaGltbWVkXG4gIC8vIHRvIHJldHVybiB0aGUgb3JpZ2luYWwgc3RyZWFtcy5cbiAgdmFyIG9yaWdHZXRMb2NhbFN0cmVhbXMgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldExvY2FsU3RyZWFtcztcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRMb2NhbFN0cmVhbXMgPSBmdW5jdGlvbiBnZXRMb2NhbFN0cmVhbXMoKSB7XG4gICAgdmFyIF90aGlzMTEgPSB0aGlzO1xuXG4gICAgdmFyIG5hdGl2ZVN0cmVhbXMgPSBvcmlnR2V0TG9jYWxTdHJlYW1zLmFwcGx5KHRoaXMpO1xuICAgIHRoaXMuX3JldmVyc2VTdHJlYW1zID0gdGhpcy5fcmV2ZXJzZVN0cmVhbXMgfHwge307XG4gICAgcmV0dXJuIG5hdGl2ZVN0cmVhbXMubWFwKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgIHJldHVybiBfdGhpczExLl9yZXZlcnNlU3RyZWFtc1tzdHJlYW0uaWRdO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBvcmlnQWRkU3RyZWFtID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRTdHJlYW07XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU3RyZWFtID0gZnVuY3Rpb24gYWRkU3RyZWFtKHN0cmVhbSkge1xuICAgIHZhciBfdGhpczEyID0gdGhpcztcblxuICAgIHRoaXMuX3N0cmVhbXMgPSB0aGlzLl9zdHJlYW1zIHx8IHt9O1xuICAgIHRoaXMuX3JldmVyc2VTdHJlYW1zID0gdGhpcy5fcmV2ZXJzZVN0cmVhbXMgfHwge307XG5cbiAgICBzdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgIHZhciBhbHJlYWR5RXhpc3RzID0gX3RoaXMxMi5nZXRTZW5kZXJzKCkuZmluZChmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gcy50cmFjayA9PT0gdHJhY2s7XG4gICAgICB9KTtcbiAgICAgIGlmIChhbHJlYWR5RXhpc3RzKSB7XG4gICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1RyYWNrIGFscmVhZHkgZXhpc3RzLicsICdJbnZhbGlkQWNjZXNzRXJyb3InKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBBZGQgaWRlbnRpdHkgbWFwcGluZyBmb3IgY29uc2lzdGVuY3kgd2l0aCBhZGRUcmFjay5cbiAgICAvLyBVbmxlc3MgdGhpcyBpcyBiZWluZyB1c2VkIHdpdGggYSBzdHJlYW0gZnJvbSBhZGRUcmFjay5cbiAgICBpZiAoIXRoaXMuX3JldmVyc2VTdHJlYW1zW3N0cmVhbS5pZF0pIHtcbiAgICAgIHZhciBuZXdTdHJlYW0gPSBuZXcgd2luZG93Lk1lZGlhU3RyZWFtKHN0cmVhbS5nZXRUcmFja3MoKSk7XG4gICAgICB0aGlzLl9zdHJlYW1zW3N0cmVhbS5pZF0gPSBuZXdTdHJlYW07XG4gICAgICB0aGlzLl9yZXZlcnNlU3RyZWFtc1tuZXdTdHJlYW0uaWRdID0gc3RyZWFtO1xuICAgICAgc3RyZWFtID0gbmV3U3RyZWFtO1xuICAgIH1cbiAgICBvcmlnQWRkU3RyZWFtLmFwcGx5KHRoaXMsIFtzdHJlYW1dKTtcbiAgfTtcblxuICB2YXIgb3JpZ1JlbW92ZVN0cmVhbSA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlU3RyZWFtO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVN0cmVhbSA9IGZ1bmN0aW9uIHJlbW92ZVN0cmVhbShzdHJlYW0pIHtcbiAgICB0aGlzLl9zdHJlYW1zID0gdGhpcy5fc3RyZWFtcyB8fCB7fTtcbiAgICB0aGlzLl9yZXZlcnNlU3RyZWFtcyA9IHRoaXMuX3JldmVyc2VTdHJlYW1zIHx8IHt9O1xuXG4gICAgb3JpZ1JlbW92ZVN0cmVhbS5hcHBseSh0aGlzLCBbdGhpcy5fc3RyZWFtc1tzdHJlYW0uaWRdIHx8IHN0cmVhbV0pO1xuICAgIGRlbGV0ZSB0aGlzLl9yZXZlcnNlU3RyZWFtc1t0aGlzLl9zdHJlYW1zW3N0cmVhbS5pZF0gPyB0aGlzLl9zdHJlYW1zW3N0cmVhbS5pZF0uaWQgOiBzdHJlYW0uaWRdO1xuICAgIGRlbGV0ZSB0aGlzLl9zdHJlYW1zW3N0cmVhbS5pZF07XG4gIH07XG5cbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRUcmFjayA9IGZ1bmN0aW9uIGFkZFRyYWNrKHRyYWNrLCBzdHJlYW0pIHtcbiAgICB2YXIgX3RoaXMxMyA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy5zaWduYWxpbmdTdGF0ZSA9PT0gJ2Nsb3NlZCcpIHtcbiAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1RoZSBSVENQZWVyQ29ubmVjdGlvblxcJ3Mgc2lnbmFsaW5nU3RhdGUgaXMgXFwnY2xvc2VkXFwnLicsICdJbnZhbGlkU3RhdGVFcnJvcicpO1xuICAgIH1cbiAgICB2YXIgc3RyZWFtcyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBpZiAoc3RyZWFtcy5sZW5ndGggIT09IDEgfHwgIXN0cmVhbXNbMF0uZ2V0VHJhY2tzKCkuZmluZChmdW5jdGlvbiAodCkge1xuICAgICAgcmV0dXJuIHQgPT09IHRyYWNrO1xuICAgIH0pKSB7XG4gICAgICAvLyB0aGlzIGlzIG5vdCBmdWxseSBjb3JyZWN0IGJ1dCBhbGwgd2UgY2FuIG1hbmFnZSB3aXRob3V0XG4gICAgICAvLyBbW2Fzc29jaWF0ZWQgTWVkaWFTdHJlYW1zXV0gaW50ZXJuYWwgc2xvdC5cbiAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1RoZSBhZGFwdGVyLmpzIGFkZFRyYWNrIHBvbHlmaWxsIG9ubHkgc3VwcG9ydHMgYSBzaW5nbGUgJyArICcgc3RyZWFtIHdoaWNoIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgc3BlY2lmaWVkIHRyYWNrLicsICdOb3RTdXBwb3J0ZWRFcnJvcicpO1xuICAgIH1cblxuICAgIHZhciBhbHJlYWR5RXhpc3RzID0gdGhpcy5nZXRTZW5kZXJzKCkuZmluZChmdW5jdGlvbiAocykge1xuICAgICAgcmV0dXJuIHMudHJhY2sgPT09IHRyYWNrO1xuICAgIH0pO1xuICAgIGlmIChhbHJlYWR5RXhpc3RzKSB7XG4gICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdUcmFjayBhbHJlYWR5IGV4aXN0cy4nLCAnSW52YWxpZEFjY2Vzc0Vycm9yJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fc3RyZWFtcyA9IHRoaXMuX3N0cmVhbXMgfHwge307XG4gICAgdGhpcy5fcmV2ZXJzZVN0cmVhbXMgPSB0aGlzLl9yZXZlcnNlU3RyZWFtcyB8fCB7fTtcbiAgICB2YXIgb2xkU3RyZWFtID0gdGhpcy5fc3RyZWFtc1tzdHJlYW0uaWRdO1xuICAgIGlmIChvbGRTdHJlYW0pIHtcbiAgICAgIC8vIHRoaXMgaXMgdXNpbmcgb2RkIENocm9tZSBiZWhhdmlvdXIsIHVzZSB3aXRoIGNhdXRpb246XG4gICAgICAvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3Avd2VicnRjL2lzc3Vlcy9kZXRhaWw/aWQ9NzgxNVxuICAgICAgLy8gTm90ZTogd2UgcmVseSBvbiB0aGUgaGlnaC1sZXZlbCBhZGRUcmFjay9kdG1mIHNoaW0gdG9cbiAgICAgIC8vIGNyZWF0ZSB0aGUgc2VuZGVyIHdpdGggYSBkdG1mIHNlbmRlci5cbiAgICAgIG9sZFN0cmVhbS5hZGRUcmFjayh0cmFjayk7XG5cbiAgICAgIC8vIFRyaWdnZXIgT05OIGFzeW5jLlxuICAgICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIF90aGlzMTMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ25lZ290aWF0aW9ubmVlZGVkJykpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBuZXdTdHJlYW0gPSBuZXcgd2luZG93Lk1lZGlhU3RyZWFtKFt0cmFja10pO1xuICAgICAgdGhpcy5fc3RyZWFtc1tzdHJlYW0uaWRdID0gbmV3U3RyZWFtO1xuICAgICAgdGhpcy5fcmV2ZXJzZVN0cmVhbXNbbmV3U3RyZWFtLmlkXSA9IHN0cmVhbTtcbiAgICAgIHRoaXMuYWRkU3RyZWFtKG5ld1N0cmVhbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldFNlbmRlcnMoKS5maW5kKGZ1bmN0aW9uIChzKSB7XG4gICAgICByZXR1cm4gcy50cmFjayA9PT0gdHJhY2s7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gcmVwbGFjZSB0aGUgaW50ZXJuYWwgc3RyZWFtIGlkIHdpdGggdGhlIGV4dGVybmFsIG9uZSBhbmRcbiAgLy8gdmljZSB2ZXJzYS5cbiAgZnVuY3Rpb24gcmVwbGFjZUludGVybmFsU3RyZWFtSWQocGMsIGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIHNkcCA9IGRlc2NyaXB0aW9uLnNkcDtcbiAgICBPYmplY3Qua2V5cyhwYy5fcmV2ZXJzZVN0cmVhbXMgfHwgW10pLmZvckVhY2goZnVuY3Rpb24gKGludGVybmFsSWQpIHtcbiAgICAgIHZhciBleHRlcm5hbFN0cmVhbSA9IHBjLl9yZXZlcnNlU3RyZWFtc1tpbnRlcm5hbElkXTtcbiAgICAgIHZhciBpbnRlcm5hbFN0cmVhbSA9IHBjLl9zdHJlYW1zW2V4dGVybmFsU3RyZWFtLmlkXTtcbiAgICAgIHNkcCA9IHNkcC5yZXBsYWNlKG5ldyBSZWdFeHAoaW50ZXJuYWxTdHJlYW0uaWQsICdnJyksIGV4dGVybmFsU3RyZWFtLmlkKTtcbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbih7XG4gICAgICB0eXBlOiBkZXNjcmlwdGlvbi50eXBlLFxuICAgICAgc2RwOiBzZHBcbiAgICB9KTtcbiAgfVxuICBmdW5jdGlvbiByZXBsYWNlRXh0ZXJuYWxTdHJlYW1JZChwYywgZGVzY3JpcHRpb24pIHtcbiAgICB2YXIgc2RwID0gZGVzY3JpcHRpb24uc2RwO1xuICAgIE9iamVjdC5rZXlzKHBjLl9yZXZlcnNlU3RyZWFtcyB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbiAoaW50ZXJuYWxJZCkge1xuICAgICAgdmFyIGV4dGVybmFsU3RyZWFtID0gcGMuX3JldmVyc2VTdHJlYW1zW2ludGVybmFsSWRdO1xuICAgICAgdmFyIGludGVybmFsU3RyZWFtID0gcGMuX3N0cmVhbXNbZXh0ZXJuYWxTdHJlYW0uaWRdO1xuICAgICAgc2RwID0gc2RwLnJlcGxhY2UobmV3IFJlZ0V4cChleHRlcm5hbFN0cmVhbS5pZCwgJ2cnKSwgaW50ZXJuYWxTdHJlYW0uaWQpO1xuICAgIH0pO1xuICAgIHJldHVybiBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHtcbiAgICAgIHR5cGU6IGRlc2NyaXB0aW9uLnR5cGUsXG4gICAgICBzZHA6IHNkcFxuICAgIH0pO1xuICB9XG4gIFsnY3JlYXRlT2ZmZXInLCAnY3JlYXRlQW5zd2VyJ10uZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgdmFyIG5hdGl2ZU1ldGhvZCA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXTtcbiAgICB2YXIgbWV0aG9kT2JqID0gX2RlZmluZVByb3BlcnR5KHt9LCBtZXRob2QsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBfdGhpczE0ID0gdGhpcztcblxuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICB2YXIgaXNMZWdhY3lDYWxsID0gYXJndW1lbnRzLmxlbmd0aCAmJiB0eXBlb2YgYXJndW1lbnRzWzBdID09PSAnZnVuY3Rpb24nO1xuICAgICAgaWYgKGlzTGVnYWN5Q2FsbCkge1xuICAgICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIFtmdW5jdGlvbiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICB2YXIgZGVzYyA9IHJlcGxhY2VJbnRlcm5hbFN0cmVhbUlkKF90aGlzMTQsIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgICBhcmdzWzBdLmFwcGx5KG51bGwsIFtkZXNjXSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICBpZiAoYXJnc1sxXSkge1xuICAgICAgICAgICAgYXJnc1sxXS5hcHBseShudWxsLCBlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgYXJndW1lbnRzWzJdXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykudGhlbihmdW5jdGlvbiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgcmV0dXJuIHJlcGxhY2VJbnRlcm5hbFN0cmVhbUlkKF90aGlzMTQsIGRlc2NyaXB0aW9uKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXSA9IG1ldGhvZE9ialttZXRob2RdO1xuICB9KTtcblxuICB2YXIgb3JpZ1NldExvY2FsRGVzY3JpcHRpb24gPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnNldExvY2FsRGVzY3JpcHRpb247XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0TG9jYWxEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIHNldExvY2FsRGVzY3JpcHRpb24oKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoIHx8ICFhcmd1bWVudHNbMF0udHlwZSkge1xuICAgICAgcmV0dXJuIG9yaWdTZXRMb2NhbERlc2NyaXB0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGFyZ3VtZW50c1swXSA9IHJlcGxhY2VFeHRlcm5hbFN0cmVhbUlkKHRoaXMsIGFyZ3VtZW50c1swXSk7XG4gICAgcmV0dXJuIG9yaWdTZXRMb2NhbERlc2NyaXB0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG5cbiAgLy8gVE9ETzogbWFuZ2xlIGdldFN0YXRzOiBodHRwczovL3czYy5naXRodWIuaW8vd2VicnRjLXN0YXRzLyNkb20tcnRjbWVkaWFzdHJlYW1zdGF0cy1zdHJlYW1pZGVudGlmaWVyXG5cbiAgdmFyIG9yaWdMb2NhbERlc2NyaXB0aW9uID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLCAnbG9jYWxEZXNjcmlwdGlvbicpO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSwgJ2xvY2FsRGVzY3JpcHRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICB2YXIgZGVzY3JpcHRpb24gPSBvcmlnTG9jYWxEZXNjcmlwdGlvbi5nZXQuYXBwbHkodGhpcyk7XG4gICAgICBpZiAoZGVzY3JpcHRpb24udHlwZSA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0aW9uO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcGxhY2VJbnRlcm5hbFN0cmVhbUlkKHRoaXMsIGRlc2NyaXB0aW9uKTtcbiAgICB9XG4gIH0pO1xuXG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlVHJhY2sgPSBmdW5jdGlvbiByZW1vdmVUcmFjayhzZW5kZXIpIHtcbiAgICB2YXIgX3RoaXMxNSA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy5zaWduYWxpbmdTdGF0ZSA9PT0gJ2Nsb3NlZCcpIHtcbiAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1RoZSBSVENQZWVyQ29ubmVjdGlvblxcJ3Mgc2lnbmFsaW5nU3RhdGUgaXMgXFwnY2xvc2VkXFwnLicsICdJbnZhbGlkU3RhdGVFcnJvcicpO1xuICAgIH1cbiAgICAvLyBXZSBjYW4gbm90IHlldCBjaGVjayBmb3Igc2VuZGVyIGluc3RhbmNlb2YgUlRDUnRwU2VuZGVyXG4gICAgLy8gc2luY2Ugd2Ugc2hpbSBSVFBTZW5kZXIuIFNvIHdlIGNoZWNrIGlmIHNlbmRlci5fcGMgaXMgc2V0LlxuICAgIGlmICghc2VuZGVyLl9wYykge1xuICAgICAgdGhyb3cgbmV3IERPTUV4Y2VwdGlvbignQXJndW1lbnQgMSBvZiBSVENQZWVyQ29ubmVjdGlvbi5yZW1vdmVUcmFjayAnICsgJ2RvZXMgbm90IGltcGxlbWVudCBpbnRlcmZhY2UgUlRDUnRwU2VuZGVyLicsICdUeXBlRXJyb3InKTtcbiAgICB9XG4gICAgdmFyIGlzTG9jYWwgPSBzZW5kZXIuX3BjID09PSB0aGlzO1xuICAgIGlmICghaXNMb2NhbCkge1xuICAgICAgdGhyb3cgbmV3IERPTUV4Y2VwdGlvbignU2VuZGVyIHdhcyBub3QgY3JlYXRlZCBieSB0aGlzIGNvbm5lY3Rpb24uJywgJ0ludmFsaWRBY2Nlc3NFcnJvcicpO1xuICAgIH1cblxuICAgIC8vIFNlYXJjaCBmb3IgdGhlIG5hdGl2ZSBzdHJlYW0gdGhlIHNlbmRlcnMgdHJhY2sgYmVsb25ncyB0by5cbiAgICB0aGlzLl9zdHJlYW1zID0gdGhpcy5fc3RyZWFtcyB8fCB7fTtcbiAgICB2YXIgc3RyZWFtID0gdm9pZCAwO1xuICAgIE9iamVjdC5rZXlzKHRoaXMuX3N0cmVhbXMpLmZvckVhY2goZnVuY3Rpb24gKHN0cmVhbWlkKSB7XG4gICAgICB2YXIgaGFzVHJhY2sgPSBfdGhpczE1Ll9zdHJlYW1zW3N0cmVhbWlkXS5nZXRUcmFja3MoKS5maW5kKGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICByZXR1cm4gc2VuZGVyLnRyYWNrID09PSB0cmFjaztcbiAgICAgIH0pO1xuICAgICAgaWYgKGhhc1RyYWNrKSB7XG4gICAgICAgIHN0cmVhbSA9IF90aGlzMTUuX3N0cmVhbXNbc3RyZWFtaWRdO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHN0cmVhbSkge1xuICAgICAgaWYgKHN0cmVhbS5nZXRUcmFja3MoKS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy8gaWYgdGhpcyBpcyB0aGUgbGFzdCB0cmFjayBvZiB0aGUgc3RyZWFtLCByZW1vdmUgdGhlIHN0cmVhbS4gVGhpc1xuICAgICAgICAvLyB0YWtlcyBjYXJlIG9mIGFueSBzaGltbWVkIF9zZW5kZXJzLlxuICAgICAgICB0aGlzLnJlbW92ZVN0cmVhbSh0aGlzLl9yZXZlcnNlU3RyZWFtc1tzdHJlYW0uaWRdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJlbHlpbmcgb24gdGhlIHNhbWUgb2RkIGNocm9tZSBiZWhhdmlvdXIgYXMgYWJvdmUuXG4gICAgICAgIHN0cmVhbS5yZW1vdmVUcmFjayhzZW5kZXIudHJhY2spO1xuICAgICAgfVxuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgnbmVnb3RpYXRpb25uZWVkZWQnKSk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBzaGltUGVlckNvbm5lY3Rpb24od2luZG93KSB7XG4gIHZhciBicm93c2VyRGV0YWlscyA9IHV0aWxzLmRldGVjdEJyb3dzZXIod2luZG93KTtcblxuICBpZiAoIXdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJiB3aW5kb3cud2Via2l0UlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICAvLyB2ZXJ5IGJhc2ljIHN1cHBvcnQgZm9yIG9sZCB2ZXJzaW9ucy5cbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gPSB3aW5kb3cud2Via2l0UlRDUGVlckNvbm5lY3Rpb247XG4gIH1cbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgYWRkSWNlQ2FuZGlkYXRlTnVsbFN1cHBvcnRlZCA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlLmxlbmd0aCA9PT0gMDtcblxuICAvLyBzaGltIGltcGxpY2l0IGNyZWF0aW9uIG9mIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbi9SVENJY2VDYW5kaWRhdGVcbiAgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPCA1Mykge1xuICAgIFsnc2V0TG9jYWxEZXNjcmlwdGlvbicsICdzZXRSZW1vdGVEZXNjcmlwdGlvbicsICdhZGRJY2VDYW5kaWRhdGUnXS5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgIHZhciBuYXRpdmVNZXRob2QgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF07XG4gICAgICB2YXIgbWV0aG9kT2JqID0gX2RlZmluZVByb3BlcnR5KHt9LCBtZXRob2QsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgYXJndW1lbnRzWzBdID0gbmV3IChtZXRob2QgPT09ICdhZGRJY2VDYW5kaWRhdGUnID8gd2luZG93LlJUQ0ljZUNhbmRpZGF0ZSA6IHdpbmRvdy5SVENTZXNzaW9uRGVzY3JpcHRpb24pKGFyZ3VtZW50c1swXSk7XG4gICAgICAgIHJldHVybiBuYXRpdmVNZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0pO1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdID0gbWV0aG9kT2JqW21ldGhvZF07XG4gICAgfSk7XG4gIH1cblxuICAvLyBzdXBwb3J0IGZvciBhZGRJY2VDYW5kaWRhdGUobnVsbCBvciB1bmRlZmluZWQpXG4gIHZhciBuYXRpdmVBZGRJY2VDYW5kaWRhdGUgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZTtcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiBhZGRJY2VDYW5kaWRhdGUoKSB7XG4gICAgaWYgKCFhZGRJY2VDYW5kaWRhdGVOdWxsU3VwcG9ydGVkICYmICFhcmd1bWVudHNbMF0pIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0pIHtcbiAgICAgICAgYXJndW1lbnRzWzFdLmFwcGx5KG51bGwpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICAvLyBGaXJlZm94IDY4KyBlbWl0cyBhbmQgcHJvY2Vzc2VzIHtjYW5kaWRhdGU6IFwiXCIsIC4uLn0sIGlnbm9yZVxuICAgIC8vIGluIG9sZGVyIHZlcnNpb25zLiBOYXRpdmUgc3VwcG9ydCBwbGFubmVkIGZvciBDaHJvbWUgTTc3LlxuICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNzggJiYgYXJndW1lbnRzWzBdICYmIGFyZ3VtZW50c1swXS5jYW5kaWRhdGUgPT09ICcnKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIHJldHVybiBuYXRpdmVBZGRJY2VDYW5kaWRhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuLy8gQXR0ZW1wdCB0byBmaXggT05OIGluIHBsYW4tYiBtb2RlLlxuZnVuY3Rpb24gZml4TmVnb3RpYXRpb25OZWVkZWQod2luZG93KSB7XG4gIHZhciBicm93c2VyRGV0YWlscyA9IHV0aWxzLmRldGVjdEJyb3dzZXIod2luZG93KTtcbiAgdXRpbHMud3JhcFBlZXJDb25uZWN0aW9uRXZlbnQod2luZG93LCAnbmVnb3RpYXRpb25uZWVkZWQnLCBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBwYyA9IGUudGFyZ2V0O1xuICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNzIgfHwgcGMuZ2V0Q29uZmlndXJhdGlvbiAmJiBwYy5nZXRDb25maWd1cmF0aW9uKCkuc2RwU2VtYW50aWNzID09PSAncGxhbi1iJykge1xuICAgICAgaWYgKHBjLnNpZ25hbGluZ1N0YXRlICE9PSAnc3RhYmxlJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlO1xuICB9KTtcbn1cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE4IFRoZSBhZGFwdGVyLmpzIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaGltR2V0RGlzcGxheU1lZGlhID0gc2hpbUdldERpc3BsYXlNZWRpYTtcbmZ1bmN0aW9uIHNoaW1HZXREaXNwbGF5TWVkaWEod2luZG93LCBnZXRTb3VyY2VJZCkge1xuICBpZiAod2luZG93Lm5hdmlnYXRvci5tZWRpYURldmljZXMgJiYgJ2dldERpc3BsYXlNZWRpYScgaW4gd2luZG93Lm5hdmlnYXRvci5tZWRpYURldmljZXMpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCF3aW5kb3cubmF2aWdhdG9yLm1lZGlhRGV2aWNlcykge1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBnZXRTb3VyY2VJZCBpcyBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHByb21pc2UgcmVzb2x2aW5nIHdpdGhcbiAgLy8gdGhlIHNvdXJjZUlkIG9mIHRoZSBzY3JlZW4vd2luZG93L3RhYiB0byBiZSBzaGFyZWQuXG4gIGlmICh0eXBlb2YgZ2V0U291cmNlSWQgIT09ICdmdW5jdGlvbicpIHtcbiAgICBjb25zb2xlLmVycm9yKCdzaGltR2V0RGlzcGxheU1lZGlhOiBnZXRTb3VyY2VJZCBhcmd1bWVudCBpcyBub3QgJyArICdhIGZ1bmN0aW9uJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldERpc3BsYXlNZWRpYSA9IGZ1bmN0aW9uIGdldERpc3BsYXlNZWRpYShjb25zdHJhaW50cykge1xuICAgIHJldHVybiBnZXRTb3VyY2VJZChjb25zdHJhaW50cykudGhlbihmdW5jdGlvbiAoc291cmNlSWQpIHtcbiAgICAgIHZhciB3aWR0aFNwZWNpZmllZCA9IGNvbnN0cmFpbnRzLnZpZGVvICYmIGNvbnN0cmFpbnRzLnZpZGVvLndpZHRoO1xuICAgICAgdmFyIGhlaWdodFNwZWNpZmllZCA9IGNvbnN0cmFpbnRzLnZpZGVvICYmIGNvbnN0cmFpbnRzLnZpZGVvLmhlaWdodDtcbiAgICAgIHZhciBmcmFtZVJhdGVTcGVjaWZpZWQgPSBjb25zdHJhaW50cy52aWRlbyAmJiBjb25zdHJhaW50cy52aWRlby5mcmFtZVJhdGU7XG4gICAgICBjb25zdHJhaW50cy52aWRlbyA9IHtcbiAgICAgICAgbWFuZGF0b3J5OiB7XG4gICAgICAgICAgY2hyb21lTWVkaWFTb3VyY2U6ICdkZXNrdG9wJyxcbiAgICAgICAgICBjaHJvbWVNZWRpYVNvdXJjZUlkOiBzb3VyY2VJZCxcbiAgICAgICAgICBtYXhGcmFtZVJhdGU6IGZyYW1lUmF0ZVNwZWNpZmllZCB8fCAzXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBpZiAod2lkdGhTcGVjaWZpZWQpIHtcbiAgICAgICAgY29uc3RyYWludHMudmlkZW8ubWFuZGF0b3J5Lm1heFdpZHRoID0gd2lkdGhTcGVjaWZpZWQ7XG4gICAgICB9XG4gICAgICBpZiAoaGVpZ2h0U3BlY2lmaWVkKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5tYXhIZWlnaHQgPSBoZWlnaHRTcGVjaWZpZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gd2luZG93Lm5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKTtcbiAgICB9KTtcbiAgfTtcbn1cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuZXhwb3J0cy5zaGltR2V0VXNlck1lZGlhID0gc2hpbUdldFVzZXJNZWRpYTtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbnZhciB1dGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF91dGlscyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbnZhciBsb2dnaW5nID0gdXRpbHMubG9nO1xuXG5mdW5jdGlvbiBzaGltR2V0VXNlck1lZGlhKHdpbmRvdykge1xuICB2YXIgbmF2aWdhdG9yID0gd2luZG93ICYmIHdpbmRvdy5uYXZpZ2F0b3I7XG5cbiAgaWYgKCFuYXZpZ2F0b3IubWVkaWFEZXZpY2VzKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuXG4gIHZhciBjb25zdHJhaW50c1RvQ2hyb21lXyA9IGZ1bmN0aW9uIGNvbnN0cmFpbnRzVG9DaHJvbWVfKGMpIHtcbiAgICBpZiAoKHR5cGVvZiBjID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihjKSkgIT09ICdvYmplY3QnIHx8IGMubWFuZGF0b3J5IHx8IGMub3B0aW9uYWwpIHtcbiAgICAgIHJldHVybiBjO1xuICAgIH1cbiAgICB2YXIgY2MgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhjKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZXF1aXJlJyB8fCBrZXkgPT09ICdhZHZhbmNlZCcgfHwga2V5ID09PSAnbWVkaWFTb3VyY2UnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciByID0gX3R5cGVvZihjW2tleV0pID09PSAnb2JqZWN0JyA/IGNba2V5XSA6IHsgaWRlYWw6IGNba2V5XSB9O1xuICAgICAgaWYgKHIuZXhhY3QgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygci5leGFjdCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgci5taW4gPSByLm1heCA9IHIuZXhhY3Q7XG4gICAgICB9XG4gICAgICB2YXIgb2xkbmFtZV8gPSBmdW5jdGlvbiBvbGRuYW1lXyhwcmVmaXgsIG5hbWUpIHtcbiAgICAgICAgaWYgKHByZWZpeCkge1xuICAgICAgICAgIHJldHVybiBwcmVmaXggKyBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zbGljZSgxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmFtZSA9PT0gJ2RldmljZUlkJyA/ICdzb3VyY2VJZCcgOiBuYW1lO1xuICAgICAgfTtcbiAgICAgIGlmIChyLmlkZWFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY2Mub3B0aW9uYWwgPSBjYy5vcHRpb25hbCB8fCBbXTtcbiAgICAgICAgdmFyIG9jID0ge307XG4gICAgICAgIGlmICh0eXBlb2Ygci5pZGVhbCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBvY1tvbGRuYW1lXygnbWluJywga2V5KV0gPSByLmlkZWFsO1xuICAgICAgICAgIGNjLm9wdGlvbmFsLnB1c2gob2MpO1xuICAgICAgICAgIG9jID0ge307XG4gICAgICAgICAgb2Nbb2xkbmFtZV8oJ21heCcsIGtleSldID0gci5pZGVhbDtcbiAgICAgICAgICBjYy5vcHRpb25hbC5wdXNoKG9jKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvY1tvbGRuYW1lXygnJywga2V5KV0gPSByLmlkZWFsO1xuICAgICAgICAgIGNjLm9wdGlvbmFsLnB1c2gob2MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoci5leGFjdCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiByLmV4YWN0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICBjYy5tYW5kYXRvcnkgPSBjYy5tYW5kYXRvcnkgfHwge307XG4gICAgICAgIGNjLm1hbmRhdG9yeVtvbGRuYW1lXygnJywga2V5KV0gPSByLmV4YWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgWydtaW4nLCAnbWF4J10uZm9yRWFjaChmdW5jdGlvbiAobWl4KSB7XG4gICAgICAgICAgaWYgKHJbbWl4XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYy5tYW5kYXRvcnkgPSBjYy5tYW5kYXRvcnkgfHwge307XG4gICAgICAgICAgICBjYy5tYW5kYXRvcnlbb2xkbmFtZV8obWl4LCBrZXkpXSA9IHJbbWl4XTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChjLmFkdmFuY2VkKSB7XG4gICAgICBjYy5vcHRpb25hbCA9IChjYy5vcHRpb25hbCB8fCBbXSkuY29uY2F0KGMuYWR2YW5jZWQpO1xuICAgIH1cbiAgICByZXR1cm4gY2M7XG4gIH07XG5cbiAgdmFyIHNoaW1Db25zdHJhaW50c18gPSBmdW5jdGlvbiBzaGltQ29uc3RyYWludHNfKGNvbnN0cmFpbnRzLCBmdW5jKSB7XG4gICAgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPj0gNjEpIHtcbiAgICAgIHJldHVybiBmdW5jKGNvbnN0cmFpbnRzKTtcbiAgICB9XG4gICAgY29uc3RyYWludHMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGNvbnN0cmFpbnRzKSk7XG4gICAgaWYgKGNvbnN0cmFpbnRzICYmIF90eXBlb2YoY29uc3RyYWludHMuYXVkaW8pID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFyIHJlbWFwID0gZnVuY3Rpb24gcmVtYXAob2JqLCBhLCBiKSB7XG4gICAgICAgIGlmIChhIGluIG9iaiAmJiAhKGIgaW4gb2JqKSkge1xuICAgICAgICAgIG9ialtiXSA9IG9ialthXTtcbiAgICAgICAgICBkZWxldGUgb2JqW2FdO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3RyYWludHMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGNvbnN0cmFpbnRzKSk7XG4gICAgICByZW1hcChjb25zdHJhaW50cy5hdWRpbywgJ2F1dG9HYWluQ29udHJvbCcsICdnb29nQXV0b0dhaW5Db250cm9sJyk7XG4gICAgICByZW1hcChjb25zdHJhaW50cy5hdWRpbywgJ25vaXNlU3VwcHJlc3Npb24nLCAnZ29vZ05vaXNlU3VwcHJlc3Npb24nKTtcbiAgICAgIGNvbnN0cmFpbnRzLmF1ZGlvID0gY29uc3RyYWludHNUb0Nocm9tZV8oY29uc3RyYWludHMuYXVkaW8pO1xuICAgIH1cbiAgICBpZiAoY29uc3RyYWludHMgJiYgX3R5cGVvZihjb25zdHJhaW50cy52aWRlbykgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBTaGltIGZhY2luZ01vZGUgZm9yIG1vYmlsZSAmIHN1cmZhY2UgcHJvLlxuICAgICAgdmFyIGZhY2UgPSBjb25zdHJhaW50cy52aWRlby5mYWNpbmdNb2RlO1xuICAgICAgZmFjZSA9IGZhY2UgJiYgKCh0eXBlb2YgZmFjZSA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoZmFjZSkpID09PSAnb2JqZWN0JyA/IGZhY2UgOiB7IGlkZWFsOiBmYWNlIH0pO1xuICAgICAgdmFyIGdldFN1cHBvcnRlZEZhY2luZ01vZGVMaWVzID0gYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDY2O1xuXG4gICAgICBpZiAoZmFjZSAmJiAoZmFjZS5leGFjdCA9PT0gJ3VzZXInIHx8IGZhY2UuZXhhY3QgPT09ICdlbnZpcm9ubWVudCcgfHwgZmFjZS5pZGVhbCA9PT0gJ3VzZXInIHx8IGZhY2UuaWRlYWwgPT09ICdlbnZpcm9ubWVudCcpICYmICEobmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRTdXBwb3J0ZWRDb25zdHJhaW50cyAmJiBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFN1cHBvcnRlZENvbnN0cmFpbnRzKCkuZmFjaW5nTW9kZSAmJiAhZ2V0U3VwcG9ydGVkRmFjaW5nTW9kZUxpZXMpKSB7XG4gICAgICAgIGRlbGV0ZSBjb25zdHJhaW50cy52aWRlby5mYWNpbmdNb2RlO1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IHZvaWQgMDtcbiAgICAgICAgaWYgKGZhY2UuZXhhY3QgPT09ICdlbnZpcm9ubWVudCcgfHwgZmFjZS5pZGVhbCA9PT0gJ2Vudmlyb25tZW50Jykge1xuICAgICAgICAgIG1hdGNoZXMgPSBbJ2JhY2snLCAncmVhciddO1xuICAgICAgICB9IGVsc2UgaWYgKGZhY2UuZXhhY3QgPT09ICd1c2VyJyB8fCBmYWNlLmlkZWFsID09PSAndXNlcicpIHtcbiAgICAgICAgICBtYXRjaGVzID0gWydmcm9udCddO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaGVzKSB7XG4gICAgICAgICAgLy8gTG9vayBmb3IgbWF0Y2hlcyBpbiBsYWJlbCwgb3IgdXNlIGxhc3QgY2FtIGZvciBiYWNrICh0eXBpY2FsKS5cbiAgICAgICAgICByZXR1cm4gbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCkudGhlbihmdW5jdGlvbiAoZGV2aWNlcykge1xuICAgICAgICAgICAgZGV2aWNlcyA9IGRldmljZXMuZmlsdGVyKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBkLmtpbmQgPT09ICd2aWRlb2lucHV0JztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIGRldiA9IGRldmljZXMuZmluZChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hlcy5zb21lKGZ1bmN0aW9uIChtYXRjaCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkLmxhYmVsLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobWF0Y2gpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFkZXYgJiYgZGV2aWNlcy5sZW5ndGggJiYgbWF0Y2hlcy5pbmNsdWRlcygnYmFjaycpKSB7XG4gICAgICAgICAgICAgIGRldiA9IGRldmljZXNbZGV2aWNlcy5sZW5ndGggLSAxXTsgLy8gbW9yZSBsaWtlbHkgdGhlIGJhY2sgY2FtXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGV2KSB7XG4gICAgICAgICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLmRldmljZUlkID0gZmFjZS5leGFjdCA/IHsgZXhhY3Q6IGRldi5kZXZpY2VJZCB9IDogeyBpZGVhbDogZGV2LmRldmljZUlkIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdHJhaW50cy52aWRlbyA9IGNvbnN0cmFpbnRzVG9DaHJvbWVfKGNvbnN0cmFpbnRzLnZpZGVvKTtcbiAgICAgICAgICAgIGxvZ2dpbmcoJ2Nocm9tZTogJyArIEpTT04uc3RyaW5naWZ5KGNvbnN0cmFpbnRzKSk7XG4gICAgICAgICAgICByZXR1cm4gZnVuYyhjb25zdHJhaW50cyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0cmFpbnRzLnZpZGVvID0gY29uc3RyYWludHNUb0Nocm9tZV8oY29uc3RyYWludHMudmlkZW8pO1xuICAgIH1cbiAgICBsb2dnaW5nKCdjaHJvbWU6ICcgKyBKU09OLnN0cmluZ2lmeShjb25zdHJhaW50cykpO1xuICAgIHJldHVybiBmdW5jKGNvbnN0cmFpbnRzKTtcbiAgfTtcblxuICB2YXIgc2hpbUVycm9yXyA9IGZ1bmN0aW9uIHNoaW1FcnJvcl8oZSkge1xuICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uID49IDY0KSB7XG4gICAgICByZXR1cm4gZTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IHtcbiAgICAgICAgUGVybWlzc2lvbkRlbmllZEVycm9yOiAnTm90QWxsb3dlZEVycm9yJyxcbiAgICAgICAgUGVybWlzc2lvbkRpc21pc3NlZEVycm9yOiAnTm90QWxsb3dlZEVycm9yJyxcbiAgICAgICAgSW52YWxpZFN0YXRlRXJyb3I6ICdOb3RBbGxvd2VkRXJyb3InLFxuICAgICAgICBEZXZpY2VzTm90Rm91bmRFcnJvcjogJ05vdEZvdW5kRXJyb3InLFxuICAgICAgICBDb25zdHJhaW50Tm90U2F0aXNmaWVkRXJyb3I6ICdPdmVyY29uc3RyYWluZWRFcnJvcicsXG4gICAgICAgIFRyYWNrU3RhcnRFcnJvcjogJ05vdFJlYWRhYmxlRXJyb3InLFxuICAgICAgICBNZWRpYURldmljZUZhaWxlZER1ZVRvU2h1dGRvd246ICdOb3RBbGxvd2VkRXJyb3InLFxuICAgICAgICBNZWRpYURldmljZUtpbGxTd2l0Y2hPbjogJ05vdEFsbG93ZWRFcnJvcicsXG4gICAgICAgIFRhYkNhcHR1cmVFcnJvcjogJ0Fib3J0RXJyb3InLFxuICAgICAgICBTY3JlZW5DYXB0dXJlRXJyb3I6ICdBYm9ydEVycm9yJyxcbiAgICAgICAgRGV2aWNlQ2FwdHVyZUVycm9yOiAnQWJvcnRFcnJvcidcbiAgICAgIH1bZS5uYW1lXSB8fCBlLm5hbWUsXG4gICAgICBtZXNzYWdlOiBlLm1lc3NhZ2UsXG4gICAgICBjb25zdHJhaW50OiBlLmNvbnN0cmFpbnQgfHwgZS5jb25zdHJhaW50TmFtZSxcbiAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmFtZSArICh0aGlzLm1lc3NhZ2UgJiYgJzogJykgKyB0aGlzLm1lc3NhZ2U7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICB2YXIgZ2V0VXNlck1lZGlhXyA9IGZ1bmN0aW9uIGdldFVzZXJNZWRpYV8oY29uc3RyYWludHMsIG9uU3VjY2Vzcywgb25FcnJvcikge1xuICAgIHNoaW1Db25zdHJhaW50c18oY29uc3RyYWludHMsIGZ1bmN0aW9uIChjKSB7XG4gICAgICBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhKGMsIG9uU3VjY2VzcywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgaWYgKG9uRXJyb3IpIHtcbiAgICAgICAgICBvbkVycm9yKHNoaW1FcnJvcl8oZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IGdldFVzZXJNZWRpYV8uYmluZChuYXZpZ2F0b3IpO1xuXG4gIC8vIEV2ZW4gdGhvdWdoIENocm9tZSA0NSBoYXMgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcyBhbmQgYSBnZXRVc2VyTWVkaWFcbiAgLy8gZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIFByb21pc2UsIGl0IGRvZXMgbm90IGFjY2VwdCBzcGVjLXN0eWxlXG4gIC8vIGNvbnN0cmFpbnRzLlxuICBpZiAobmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEpIHtcbiAgICB2YXIgb3JpZ0dldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhLmJpbmQobmF2aWdhdG9yLm1lZGlhRGV2aWNlcyk7XG4gICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEgPSBmdW5jdGlvbiAoY3MpIHtcbiAgICAgIHJldHVybiBzaGltQ29uc3RyYWludHNfKGNzLCBmdW5jdGlvbiAoYykge1xuICAgICAgICByZXR1cm4gb3JpZ0dldFVzZXJNZWRpYShjKS50aGVuKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICBpZiAoYy5hdWRpbyAmJiAhc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCkubGVuZ3RoIHx8IGMudmlkZW8gJiYgIXN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCkge1xuICAgICAgICAgICAgc3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhyb3cgbmV3IERPTUV4Y2VwdGlvbignJywgJ05vdEZvdW5kRXJyb3InKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3Qoc2hpbUVycm9yXyhlKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuIiwiLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF90eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH0gOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9O1xuXG5leHBvcnRzLnNoaW1SVENJY2VDYW5kaWRhdGUgPSBzaGltUlRDSWNlQ2FuZGlkYXRlO1xuZXhwb3J0cy5zaGltTWF4TWVzc2FnZVNpemUgPSBzaGltTWF4TWVzc2FnZVNpemU7XG5leHBvcnRzLnNoaW1TZW5kVGhyb3dUeXBlRXJyb3IgPSBzaGltU2VuZFRocm93VHlwZUVycm9yO1xuZXhwb3J0cy5zaGltQ29ubmVjdGlvblN0YXRlID0gc2hpbUNvbm5lY3Rpb25TdGF0ZTtcbmV4cG9ydHMucmVtb3ZlQWxsb3dFeHRtYXBNaXhlZCA9IHJlbW92ZUFsbG93RXh0bWFwTWl4ZWQ7XG5cbnZhciBfc2RwID0gcmVxdWlyZSgnc2RwJyk7XG5cbnZhciBfc2RwMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3NkcCk7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciB1dGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF91dGlscyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIHNoaW1SVENJY2VDYW5kaWRhdGUod2luZG93KSB7XG4gIC8vIGZvdW5kYXRpb24gaXMgYXJiaXRyYXJpbHkgY2hvc2VuIGFzIGFuIGluZGljYXRvciBmb3IgZnVsbCBzdXBwb3J0IGZvclxuICAvLyBodHRwczovL3czYy5naXRodWIuaW8vd2VicnRjLXBjLyNydGNpY2VjYW5kaWRhdGUtaW50ZXJmYWNlXG4gIGlmICghd2luZG93LlJUQ0ljZUNhbmRpZGF0ZSB8fCB3aW5kb3cuUlRDSWNlQ2FuZGlkYXRlICYmICdmb3VuZGF0aW9uJyBpbiB3aW5kb3cuUlRDSWNlQ2FuZGlkYXRlLnByb3RvdHlwZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBOYXRpdmVSVENJY2VDYW5kaWRhdGUgPSB3aW5kb3cuUlRDSWNlQ2FuZGlkYXRlO1xuICB3aW5kb3cuUlRDSWNlQ2FuZGlkYXRlID0gZnVuY3Rpb24gUlRDSWNlQ2FuZGlkYXRlKGFyZ3MpIHtcbiAgICAvLyBSZW1vdmUgdGhlIGE9IHdoaWNoIHNob3VsZG4ndCBiZSBwYXJ0IG9mIHRoZSBjYW5kaWRhdGUgc3RyaW5nLlxuICAgIGlmICgodHlwZW9mIGFyZ3MgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGFyZ3MpKSA9PT0gJ29iamVjdCcgJiYgYXJncy5jYW5kaWRhdGUgJiYgYXJncy5jYW5kaWRhdGUuaW5kZXhPZignYT0nKSA9PT0gMCkge1xuICAgICAgYXJncyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYXJncykpO1xuICAgICAgYXJncy5jYW5kaWRhdGUgPSBhcmdzLmNhbmRpZGF0ZS5zdWJzdHIoMik7XG4gICAgfVxuXG4gICAgaWYgKGFyZ3MuY2FuZGlkYXRlICYmIGFyZ3MuY2FuZGlkYXRlLmxlbmd0aCkge1xuICAgICAgLy8gQXVnbWVudCB0aGUgbmF0aXZlIGNhbmRpZGF0ZSB3aXRoIHRoZSBwYXJzZWQgZmllbGRzLlxuICAgICAgdmFyIG5hdGl2ZUNhbmRpZGF0ZSA9IG5ldyBOYXRpdmVSVENJY2VDYW5kaWRhdGUoYXJncyk7XG4gICAgICB2YXIgcGFyc2VkQ2FuZGlkYXRlID0gX3NkcDIuZGVmYXVsdC5wYXJzZUNhbmRpZGF0ZShhcmdzLmNhbmRpZGF0ZSk7XG4gICAgICB2YXIgYXVnbWVudGVkQ2FuZGlkYXRlID0gT2JqZWN0LmFzc2lnbihuYXRpdmVDYW5kaWRhdGUsIHBhcnNlZENhbmRpZGF0ZSk7XG5cbiAgICAgIC8vIEFkZCBhIHNlcmlhbGl6ZXIgdGhhdCBkb2VzIG5vdCBzZXJpYWxpemUgdGhlIGV4dHJhIGF0dHJpYnV0ZXMuXG4gICAgICBhdWdtZW50ZWRDYW5kaWRhdGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGNhbmRpZGF0ZTogYXVnbWVudGVkQ2FuZGlkYXRlLmNhbmRpZGF0ZSxcbiAgICAgICAgICBzZHBNaWQ6IGF1Z21lbnRlZENhbmRpZGF0ZS5zZHBNaWQsXG4gICAgICAgICAgc2RwTUxpbmVJbmRleDogYXVnbWVudGVkQ2FuZGlkYXRlLnNkcE1MaW5lSW5kZXgsXG4gICAgICAgICAgdXNlcm5hbWVGcmFnbWVudDogYXVnbWVudGVkQ2FuZGlkYXRlLnVzZXJuYW1lRnJhZ21lbnRcbiAgICAgICAgfTtcbiAgICAgIH07XG4gICAgICByZXR1cm4gYXVnbWVudGVkQ2FuZGlkYXRlO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IE5hdGl2ZVJUQ0ljZUNhbmRpZGF0ZShhcmdzKTtcbiAgfTtcbiAgd2luZG93LlJUQ0ljZUNhbmRpZGF0ZS5wcm90b3R5cGUgPSBOYXRpdmVSVENJY2VDYW5kaWRhdGUucHJvdG90eXBlO1xuXG4gIC8vIEhvb2sgdXAgdGhlIGF1Z21lbnRlZCBjYW5kaWRhdGUgaW4gb25pY2VjYW5kaWRhdGUgYW5kXG4gIC8vIGFkZEV2ZW50TGlzdGVuZXIoJ2ljZWNhbmRpZGF0ZScsIC4uLilcbiAgdXRpbHMud3JhcFBlZXJDb25uZWN0aW9uRXZlbnQod2luZG93LCAnaWNlY2FuZGlkYXRlJywgZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS5jYW5kaWRhdGUpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLCAnY2FuZGlkYXRlJywge1xuICAgICAgICB2YWx1ZTogbmV3IHdpbmRvdy5SVENJY2VDYW5kaWRhdGUoZS5jYW5kaWRhdGUpLFxuICAgICAgICB3cml0YWJsZTogJ2ZhbHNlJ1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBlO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc2hpbU1heE1lc3NhZ2VTaXplKHdpbmRvdykge1xuICBpZiAoIXdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbikge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgYnJvd3NlckRldGFpbHMgPSB1dGlscy5kZXRlY3RCcm93c2VyKHdpbmRvdyk7XG5cbiAgaWYgKCEoJ3NjdHAnIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUsICdzY3RwJywge1xuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgdGhpcy5fc2N0cCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogdGhpcy5fc2N0cDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHZhciBzY3RwSW5EZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIHNjdHBJbkRlc2NyaXB0aW9uKGRlc2NyaXB0aW9uKSB7XG4gICAgaWYgKCFkZXNjcmlwdGlvbiB8fCAhZGVzY3JpcHRpb24uc2RwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBzZWN0aW9ucyA9IF9zZHAyLmRlZmF1bHQuc3BsaXRTZWN0aW9ucyhkZXNjcmlwdGlvbi5zZHApO1xuICAgIHNlY3Rpb25zLnNoaWZ0KCk7XG4gICAgcmV0dXJuIHNlY3Rpb25zLnNvbWUoZnVuY3Rpb24gKG1lZGlhU2VjdGlvbikge1xuICAgICAgdmFyIG1MaW5lID0gX3NkcDIuZGVmYXVsdC5wYXJzZU1MaW5lKG1lZGlhU2VjdGlvbik7XG4gICAgICByZXR1cm4gbUxpbmUgJiYgbUxpbmUua2luZCA9PT0gJ2FwcGxpY2F0aW9uJyAmJiBtTGluZS5wcm90b2NvbC5pbmRleE9mKCdTQ1RQJykgIT09IC0xO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBnZXRSZW1vdGVGaXJlZm94VmVyc2lvbiA9IGZ1bmN0aW9uIGdldFJlbW90ZUZpcmVmb3hWZXJzaW9uKGRlc2NyaXB0aW9uKSB7XG4gICAgLy8gVE9ETzogSXMgdGhlcmUgYSBiZXR0ZXIgc29sdXRpb24gZm9yIGRldGVjdGluZyBGaXJlZm94P1xuICAgIHZhciBtYXRjaCA9IGRlc2NyaXB0aW9uLnNkcC5tYXRjaCgvbW96aWxsYS4uLlRISVNfSVNfU0RQQVJUQS0oXFxkKykvKTtcbiAgICBpZiAobWF0Y2ggPT09IG51bGwgfHwgbWF0Y2gubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgICB2YXIgdmVyc2lvbiA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XG4gICAgLy8gVGVzdCBmb3IgTmFOICh5ZXMsIHRoaXMgaXMgdWdseSlcbiAgICByZXR1cm4gdmVyc2lvbiAhPT0gdmVyc2lvbiA/IC0xIDogdmVyc2lvbjtcbiAgfTtcblxuICB2YXIgZ2V0Q2FuU2VuZE1heE1lc3NhZ2VTaXplID0gZnVuY3Rpb24gZ2V0Q2FuU2VuZE1heE1lc3NhZ2VTaXplKHJlbW90ZUlzRmlyZWZveCkge1xuICAgIC8vIEV2ZXJ5IGltcGxlbWVudGF0aW9uIHdlIGtub3cgY2FuIHNlbmQgYXQgbGVhc3QgNjQgS2lCLlxuICAgIC8vIE5vdGU6IEFsdGhvdWdoIENocm9tZSBpcyB0ZWNobmljYWxseSBhYmxlIHRvIHNlbmQgdXAgdG8gMjU2IEtpQiwgdGhlXG4gICAgLy8gICAgICAgZGF0YSBkb2VzIG5vdCByZWFjaCB0aGUgb3RoZXIgcGVlciByZWxpYWJseS5cbiAgICAvLyAgICAgICBTZWU6IGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC93ZWJydGMvaXNzdWVzL2RldGFpbD9pZD04NDE5XG4gICAgdmFyIGNhblNlbmRNYXhNZXNzYWdlU2l6ZSA9IDY1NTM2O1xuICAgIGlmIChicm93c2VyRGV0YWlscy5icm93c2VyID09PSAnZmlyZWZveCcpIHtcbiAgICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNTcpIHtcbiAgICAgICAgaWYgKHJlbW90ZUlzRmlyZWZveCA9PT0gLTEpIHtcbiAgICAgICAgICAvLyBGRiA8IDU3IHdpbGwgc2VuZCBpbiAxNiBLaUIgY2h1bmtzIHVzaW5nIHRoZSBkZXByZWNhdGVkIFBQSURcbiAgICAgICAgICAvLyBmcmFnbWVudGF0aW9uLlxuICAgICAgICAgIGNhblNlbmRNYXhNZXNzYWdlU2l6ZSA9IDE2Mzg0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEhvd2V2ZXIsIG90aGVyIEZGIChhbmQgUkFXUlRDKSBjYW4gcmVhc3NlbWJsZSBQUElELWZyYWdtZW50ZWRcbiAgICAgICAgICAvLyBtZXNzYWdlcy4gVGh1cywgc3VwcG9ydGluZyB+MiBHaUIgd2hlbiBzZW5kaW5nLlxuICAgICAgICAgIGNhblNlbmRNYXhNZXNzYWdlU2l6ZSA9IDIxNDc0ODM2Mzc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDYwKSB7XG4gICAgICAgIC8vIEN1cnJlbnRseSwgYWxsIEZGID49IDU3IHdpbGwgcmVzZXQgdGhlIHJlbW90ZSBtYXhpbXVtIG1lc3NhZ2Ugc2l6ZVxuICAgICAgICAvLyB0byB0aGUgZGVmYXVsdCB2YWx1ZSB3aGVuIGEgZGF0YSBjaGFubmVsIGlzIGNyZWF0ZWQgYXQgYSBsYXRlclxuICAgICAgICAvLyBzdGFnZS4gOihcbiAgICAgICAgLy8gU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xNDI2ODMxXG4gICAgICAgIGNhblNlbmRNYXhNZXNzYWdlU2l6ZSA9IGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPT09IDU3ID8gNjU1MzUgOiA2NTUzNjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEZGID49IDYwIHN1cHBvcnRzIHNlbmRpbmcgfjIgR2lCXG4gICAgICAgIGNhblNlbmRNYXhNZXNzYWdlU2l6ZSA9IDIxNDc0ODM2Mzc7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjYW5TZW5kTWF4TWVzc2FnZVNpemU7XG4gIH07XG5cbiAgdmFyIGdldE1heE1lc3NhZ2VTaXplID0gZnVuY3Rpb24gZ2V0TWF4TWVzc2FnZVNpemUoZGVzY3JpcHRpb24sIHJlbW90ZUlzRmlyZWZveCkge1xuICAgIC8vIE5vdGU6IDY1NTM2IGJ5dGVzIGlzIHRoZSBkZWZhdWx0IHZhbHVlIGZyb20gdGhlIFNEUCBzcGVjLiBBbHNvLFxuICAgIC8vICAgICAgIGV2ZXJ5IGltcGxlbWVudGF0aW9uIHdlIGtub3cgc3VwcG9ydHMgcmVjZWl2aW5nIDY1NTM2IGJ5dGVzLlxuICAgIHZhciBtYXhNZXNzYWdlU2l6ZSA9IDY1NTM2O1xuXG4gICAgLy8gRkYgNTcgaGFzIGEgc2xpZ2h0bHkgaW5jb3JyZWN0IGRlZmF1bHQgcmVtb3RlIG1heCBtZXNzYWdlIHNpemUsIHNvXG4gICAgLy8gd2UgbmVlZCB0byBhZGp1c3QgaXQgaGVyZSB0byBhdm9pZCBhIGZhaWx1cmUgd2hlbiBzZW5kaW5nLlxuICAgIC8vIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTQyNTY5N1xuICAgIGlmIChicm93c2VyRGV0YWlscy5icm93c2VyID09PSAnZmlyZWZveCcgJiYgYnJvd3NlckRldGFpbHMudmVyc2lvbiA9PT0gNTcpIHtcbiAgICAgIG1heE1lc3NhZ2VTaXplID0gNjU1MzU7XG4gICAgfVxuXG4gICAgdmFyIG1hdGNoID0gX3NkcDIuZGVmYXVsdC5tYXRjaFByZWZpeChkZXNjcmlwdGlvbi5zZHAsICdhPW1heC1tZXNzYWdlLXNpemU6Jyk7XG4gICAgaWYgKG1hdGNoLmxlbmd0aCA+IDApIHtcbiAgICAgIG1heE1lc3NhZ2VTaXplID0gcGFyc2VJbnQobWF0Y2hbMF0uc3Vic3RyKDE5KSwgMTApO1xuICAgIH0gZWxzZSBpZiAoYnJvd3NlckRldGFpbHMuYnJvd3NlciA9PT0gJ2ZpcmVmb3gnICYmIHJlbW90ZUlzRmlyZWZveCAhPT0gLTEpIHtcbiAgICAgIC8vIElmIHRoZSBtYXhpbXVtIG1lc3NhZ2Ugc2l6ZSBpcyBub3QgcHJlc2VudCBpbiB0aGUgcmVtb3RlIFNEUCBhbmRcbiAgICAgIC8vIGJvdGggbG9jYWwgYW5kIHJlbW90ZSBhcmUgRmlyZWZveCwgdGhlIHJlbW90ZSBwZWVyIGNhbiByZWNlaXZlXG4gICAgICAvLyB+MiBHaUIuXG4gICAgICBtYXhNZXNzYWdlU2l6ZSA9IDIxNDc0ODM2Mzc7XG4gICAgfVxuICAgIHJldHVybiBtYXhNZXNzYWdlU2l6ZTtcbiAgfTtcblxuICB2YXIgb3JpZ1NldFJlbW90ZURlc2NyaXB0aW9uID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbjtcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIHNldFJlbW90ZURlc2NyaXB0aW9uKCkge1xuICAgIHRoaXMuX3NjdHAgPSBudWxsO1xuICAgIC8vIENocm9tZSBkZWNpZGVkIHRvIG5vdCBleHBvc2UgLnNjdHAgaW4gcGxhbi1iIG1vZGUuXG4gICAgLy8gQXMgdXN1YWwsIGFkYXB0ZXIuanMgaGFzIHRvIGRvIGFuICd1Z2x5IHdvcmFrYXJvdW5kJ1xuICAgIC8vIHRvIGNvdmVyIHVwIHRoZSBtZXNzLlxuICAgIGlmIChicm93c2VyRGV0YWlscy5icm93c2VyID09PSAnY2hyb21lJyAmJiBicm93c2VyRGV0YWlscy52ZXJzaW9uID49IDc2KSB7XG4gICAgICB2YXIgX2dldENvbmZpZ3VyYXRpb24gPSB0aGlzLmdldENvbmZpZ3VyYXRpb24oKSxcbiAgICAgICAgICBzZHBTZW1hbnRpY3MgPSBfZ2V0Q29uZmlndXJhdGlvbi5zZHBTZW1hbnRpY3M7XG5cbiAgICAgIGlmIChzZHBTZW1hbnRpY3MgPT09ICdwbGFuLWInKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc2N0cCcsIHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgdGhpcy5fc2N0cCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogdGhpcy5fc2N0cDtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNjdHBJbkRlc2NyaXB0aW9uKGFyZ3VtZW50c1swXSkpIHtcbiAgICAgIC8vIENoZWNrIGlmIHRoZSByZW1vdGUgaXMgRkYuXG4gICAgICB2YXIgaXNGaXJlZm94ID0gZ2V0UmVtb3RlRmlyZWZveFZlcnNpb24oYXJndW1lbnRzWzBdKTtcblxuICAgICAgLy8gR2V0IHRoZSBtYXhpbXVtIG1lc3NhZ2Ugc2l6ZSB0aGUgbG9jYWwgcGVlciBpcyBjYXBhYmxlIG9mIHNlbmRpbmdcbiAgICAgIHZhciBjYW5TZW5kTU1TID0gZ2V0Q2FuU2VuZE1heE1lc3NhZ2VTaXplKGlzRmlyZWZveCk7XG5cbiAgICAgIC8vIEdldCB0aGUgbWF4aW11bSBtZXNzYWdlIHNpemUgb2YgdGhlIHJlbW90ZSBwZWVyLlxuICAgICAgdmFyIHJlbW90ZU1NUyA9IGdldE1heE1lc3NhZ2VTaXplKGFyZ3VtZW50c1swXSwgaXNGaXJlZm94KTtcblxuICAgICAgLy8gRGV0ZXJtaW5lIGZpbmFsIG1heGltdW0gbWVzc2FnZSBzaXplXG4gICAgICB2YXIgbWF4TWVzc2FnZVNpemUgPSB2b2lkIDA7XG4gICAgICBpZiAoY2FuU2VuZE1NUyA9PT0gMCAmJiByZW1vdGVNTVMgPT09IDApIHtcbiAgICAgICAgbWF4TWVzc2FnZVNpemUgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgICB9IGVsc2UgaWYgKGNhblNlbmRNTVMgPT09IDAgfHwgcmVtb3RlTU1TID09PSAwKSB7XG4gICAgICAgIG1heE1lc3NhZ2VTaXplID0gTWF0aC5tYXgoY2FuU2VuZE1NUywgcmVtb3RlTU1TKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1heE1lc3NhZ2VTaXplID0gTWF0aC5taW4oY2FuU2VuZE1NUywgcmVtb3RlTU1TKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ3JlYXRlIGEgZHVtbXkgUlRDU2N0cFRyYW5zcG9ydCBvYmplY3QgYW5kIHRoZSAnbWF4TWVzc2FnZVNpemUnXG4gICAgICAvLyBhdHRyaWJ1dGUuXG4gICAgICB2YXIgc2N0cCA9IHt9O1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHNjdHAsICdtYXhNZXNzYWdlU2l6ZScsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIG1heE1lc3NhZ2VTaXplO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHRoaXMuX3NjdHAgPSBzY3RwO1xuICAgIH1cblxuICAgIHJldHVybiBvcmlnU2V0UmVtb3RlRGVzY3JpcHRpb24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2hpbVNlbmRUaHJvd1R5cGVFcnJvcih3aW5kb3cpIHtcbiAgaWYgKCEod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uICYmICdjcmVhdGVEYXRhQ2hhbm5lbCcgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBOb3RlOiBBbHRob3VnaCBGaXJlZm94ID49IDU3IGhhcyBhIG5hdGl2ZSBpbXBsZW1lbnRhdGlvbiwgdGhlIG1heGltdW1cbiAgLy8gICAgICAgbWVzc2FnZSBzaXplIGNhbiBiZSByZXNldCBmb3IgYWxsIGRhdGEgY2hhbm5lbHMgYXQgYSBsYXRlciBzdGFnZS5cbiAgLy8gICAgICAgU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xNDI2ODMxXG5cbiAgZnVuY3Rpb24gd3JhcERjU2VuZChkYywgcGMpIHtcbiAgICB2YXIgb3JpZ0RhdGFDaGFubmVsU2VuZCA9IGRjLnNlbmQ7XG4gICAgZGMuc2VuZCA9IGZ1bmN0aW9uIHNlbmQoKSB7XG4gICAgICB2YXIgZGF0YSA9IGFyZ3VtZW50c1swXTtcbiAgICAgIHZhciBsZW5ndGggPSBkYXRhLmxlbmd0aCB8fCBkYXRhLnNpemUgfHwgZGF0YS5ieXRlTGVuZ3RoO1xuICAgICAgaWYgKGRjLnJlYWR5U3RhdGUgPT09ICdvcGVuJyAmJiBwYy5zY3RwICYmIGxlbmd0aCA+IHBjLnNjdHAubWF4TWVzc2FnZVNpemUpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTWVzc2FnZSB0b28gbGFyZ2UgKGNhbiBzZW5kIGEgbWF4aW11bSBvZiAnICsgcGMuc2N0cC5tYXhNZXNzYWdlU2l6ZSArICcgYnl0ZXMpJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpZ0RhdGFDaGFubmVsU2VuZC5hcHBseShkYywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG4gIHZhciBvcmlnQ3JlYXRlRGF0YUNoYW5uZWwgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZURhdGFDaGFubmVsO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZURhdGFDaGFubmVsID0gZnVuY3Rpb24gY3JlYXRlRGF0YUNoYW5uZWwoKSB7XG4gICAgdmFyIGRhdGFDaGFubmVsID0gb3JpZ0NyZWF0ZURhdGFDaGFubmVsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgd3JhcERjU2VuZChkYXRhQ2hhbm5lbCwgdGhpcyk7XG4gICAgcmV0dXJuIGRhdGFDaGFubmVsO1xuICB9O1xuICB1dGlscy53cmFwUGVlckNvbm5lY3Rpb25FdmVudCh3aW5kb3csICdkYXRhY2hhbm5lbCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgd3JhcERjU2VuZChlLmNoYW5uZWwsIGUudGFyZ2V0KTtcbiAgICByZXR1cm4gZTtcbiAgfSk7XG59XG5cbi8qIHNoaW1zIFJUQ0Nvbm5lY3Rpb25TdGF0ZSBieSBwcmV0ZW5kaW5nIGl0IGlzIHRoZSBzYW1lIGFzIGljZUNvbm5lY3Rpb25TdGF0ZS5cbiAqIFNlZSBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3Avd2VicnRjL2lzc3Vlcy9kZXRhaWw/aWQ9NjE0NSNjMTJcbiAqIGZvciB3aHkgdGhpcyBpcyBhIHZhbGlkIGhhY2sgaW4gQ2hyb21lLiBJbiBGaXJlZm94IGl0IGlzIHNsaWdodGx5IGluY29ycmVjdFxuICogc2luY2UgRFRMUyBmYWlsdXJlcyB3b3VsZCBiZSBoaWRkZW4uIFNlZVxuICogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTI2NTgyN1xuICogZm9yIHRoZSBGaXJlZm94IHRyYWNraW5nIGJ1Zy5cbiAqL1xuZnVuY3Rpb24gc2hpbUNvbm5lY3Rpb25TdGF0ZSh3aW5kb3cpIHtcbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gfHwgJ2Nvbm5lY3Rpb25TdGF0ZScgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcHJvdG8gPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdjb25uZWN0aW9uU3RhdGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb21wbGV0ZWQ6ICdjb25uZWN0ZWQnLFxuICAgICAgICBjaGVja2luZzogJ2Nvbm5lY3RpbmcnXG4gICAgICB9W3RoaXMuaWNlQ29ubmVjdGlvblN0YXRlXSB8fCB0aGlzLmljZUNvbm5lY3Rpb25TdGF0ZTtcbiAgICB9LFxuXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ29uY29ubmVjdGlvbnN0YXRlY2hhbmdlJywge1xuICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX29uY29ubmVjdGlvbnN0YXRlY2hhbmdlIHx8IG51bGw7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uIHNldChjYikge1xuICAgICAgaWYgKHRoaXMuX29uY29ubmVjdGlvbnN0YXRlY2hhbmdlKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcignY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgdGhpcy5fb25jb25uZWN0aW9uc3RhdGVjaGFuZ2UpO1xuICAgICAgICBkZWxldGUgdGhpcy5fb25jb25uZWN0aW9uc3RhdGVjaGFuZ2U7XG4gICAgICB9XG4gICAgICBpZiAoY2IpIHtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdjb25uZWN0aW9uc3RhdGVjaGFuZ2UnLCB0aGlzLl9vbmNvbm5lY3Rpb25zdGF0ZWNoYW5nZSA9IGNiKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfSk7XG5cbiAgWydzZXRMb2NhbERlc2NyaXB0aW9uJywgJ3NldFJlbW90ZURlc2NyaXB0aW9uJ10uZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgdmFyIG9yaWdNZXRob2QgPSBwcm90b1ttZXRob2RdO1xuICAgIHByb3RvW21ldGhvZF0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoIXRoaXMuX2Nvbm5lY3Rpb25zdGF0ZWNoYW5nZXBvbHkpIHtcbiAgICAgICAgdGhpcy5fY29ubmVjdGlvbnN0YXRlY2hhbmdlcG9seSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgdmFyIHBjID0gZS50YXJnZXQ7XG4gICAgICAgICAgaWYgKHBjLl9sYXN0Q29ubmVjdGlvblN0YXRlICE9PSBwYy5jb25uZWN0aW9uU3RhdGUpIHtcbiAgICAgICAgICAgIHBjLl9sYXN0Q29ubmVjdGlvblN0YXRlID0gcGMuY29ubmVjdGlvblN0YXRlO1xuICAgICAgICAgICAgdmFyIG5ld0V2ZW50ID0gbmV3IEV2ZW50KCdjb25uZWN0aW9uc3RhdGVjaGFuZ2UnLCBlKTtcbiAgICAgICAgICAgIHBjLmRpc3BhdGNoRXZlbnQobmV3RXZlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdpY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UnLCB0aGlzLl9jb25uZWN0aW9uc3RhdGVjaGFuZ2Vwb2x5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcmlnTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUFsbG93RXh0bWFwTWl4ZWQod2luZG93KSB7XG4gIC8qIHJlbW92ZSBhPWV4dG1hcC1hbGxvdy1taXhlZCBmb3Igd2VicnRjLm9yZyA8IE03MSAqL1xuICBpZiAoIXdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbikge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgYnJvd3NlckRldGFpbHMgPSB1dGlscy5kZXRlY3RCcm93c2VyKHdpbmRvdyk7XG4gIGlmIChicm93c2VyRGV0YWlscy5icm93c2VyID09PSAnY2hyb21lJyAmJiBicm93c2VyRGV0YWlscy52ZXJzaW9uID49IDcxKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChicm93c2VyRGV0YWlscy5icm93c2VyID09PSAnc2FmYXJpJyAmJiBicm93c2VyRGV0YWlscy52ZXJzaW9uID49IDYwNSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgbmF0aXZlU1JEID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbjtcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIHNldFJlbW90ZURlc2NyaXB0aW9uKGRlc2MpIHtcbiAgICBpZiAoZGVzYyAmJiBkZXNjLnNkcCAmJiBkZXNjLnNkcC5pbmRleE9mKCdcXG5hPWV4dG1hcC1hbGxvdy1taXhlZCcpICE9PSAtMSkge1xuICAgICAgZGVzYy5zZHAgPSBkZXNjLnNkcC5zcGxpdCgnXFxuJykuZmlsdGVyKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHJldHVybiBsaW5lLnRyaW0oKSAhPT0gJ2E9ZXh0bWFwLWFsbG93LW1peGVkJztcbiAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgIH1cbiAgICByZXR1cm4gbmF0aXZlU1JELmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59XG4iLCIvKlxuICogIENvcHlyaWdodCAoYykgMjAxNiBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaGltR2V0RGlzcGxheU1lZGlhID0gZXhwb3J0cy5zaGltR2V0VXNlck1lZGlhID0gdW5kZWZpbmVkO1xuXG52YXIgX2dldHVzZXJtZWRpYSA9IHJlcXVpcmUoJy4vZ2V0dXNlcm1lZGlhJyk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnc2hpbUdldFVzZXJNZWRpYScsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIF9nZXR1c2VybWVkaWEuc2hpbUdldFVzZXJNZWRpYTtcbiAgfVxufSk7XG5cbnZhciBfZ2V0ZGlzcGxheW1lZGlhID0gcmVxdWlyZSgnLi9nZXRkaXNwbGF5bWVkaWEnKTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdzaGltR2V0RGlzcGxheU1lZGlhJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gX2dldGRpc3BsYXltZWRpYS5zaGltR2V0RGlzcGxheU1lZGlhO1xuICB9XG59KTtcbmV4cG9ydHMuc2hpbVBlZXJDb25uZWN0aW9uID0gc2hpbVBlZXJDb25uZWN0aW9uO1xuZXhwb3J0cy5zaGltUmVwbGFjZVRyYWNrID0gc2hpbVJlcGxhY2VUcmFjaztcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbnZhciB1dGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF91dGlscyk7XG5cbnZhciBfZmlsdGVyaWNlc2VydmVycyA9IHJlcXVpcmUoJy4vZmlsdGVyaWNlc2VydmVycycpO1xuXG52YXIgX3J0Y3BlZXJjb25uZWN0aW9uU2hpbSA9IHJlcXVpcmUoJ3J0Y3BlZXJjb25uZWN0aW9uLXNoaW0nKTtcblxudmFyIF9ydGNwZWVyY29ubmVjdGlvblNoaW0yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfcnRjcGVlcmNvbm5lY3Rpb25TaGltKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gc2hpbVBlZXJDb25uZWN0aW9uKHdpbmRvdykge1xuICB2YXIgYnJvd3NlckRldGFpbHMgPSB1dGlscy5kZXRlY3RCcm93c2VyKHdpbmRvdyk7XG5cbiAgaWYgKHdpbmRvdy5SVENJY2VHYXRoZXJlcikge1xuICAgIGlmICghd2luZG93LlJUQ0ljZUNhbmRpZGF0ZSkge1xuICAgICAgd2luZG93LlJUQ0ljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uIFJUQ0ljZUNhbmRpZGF0ZShhcmdzKSB7XG4gICAgICAgIHJldHVybiBhcmdzO1xuICAgICAgfTtcbiAgICB9XG4gICAgaWYgKCF3aW5kb3cuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKSB7XG4gICAgICB3aW5kb3cuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uID0gZnVuY3Rpb24gUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3M7XG4gICAgICB9O1xuICAgIH1cbiAgICAvLyB0aGlzIGFkZHMgYW4gYWRkaXRpb25hbCBldmVudCBsaXN0ZW5lciB0byBNZWRpYVN0cmFja1RyYWNrIHRoYXQgc2lnbmFsc1xuICAgIC8vIHdoZW4gYSB0cmFja3MgZW5hYmxlZCBwcm9wZXJ0eSB3YXMgY2hhbmdlZC4gV29ya2Fyb3VuZCBmb3IgYSBidWcgaW5cbiAgICAvLyBhZGRTdHJlYW0sIHNlZSBiZWxvdy4gTm8gbG9uZ2VyIHJlcXVpcmVkIGluIDE1MDI1K1xuICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgMTUwMjUpIHtcbiAgICAgIHZhciBvcmlnTVNURW5hYmxlZCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93Lk1lZGlhU3RyZWFtVHJhY2sucHJvdG90eXBlLCAnZW5hYmxlZCcpO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrLnByb3RvdHlwZSwgJ2VuYWJsZWQnLCB7XG4gICAgICAgIHNldDogZnVuY3Rpb24gc2V0KHZhbHVlKSB7XG4gICAgICAgICAgb3JpZ01TVEVuYWJsZWQuc2V0LmNhbGwodGhpcywgdmFsdWUpO1xuICAgICAgICAgIHZhciBldiA9IG5ldyBFdmVudCgnZW5hYmxlZCcpO1xuICAgICAgICAgIGV2LmVuYWJsZWQgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZXYpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBPUlRDIGRlZmluZXMgdGhlIERUTUYgc2VuZGVyIGEgYml0IGRpZmZlcmVudC5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3czYy9vcnRjL2lzc3Vlcy83MTRcbiAgaWYgKHdpbmRvdy5SVENSdHBTZW5kZXIgJiYgISgnZHRtZicgaW4gd2luZG93LlJUQ1J0cFNlbmRlci5wcm90b3R5cGUpKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlLCAnZHRtZicsIHtcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICBpZiAodGhpcy5fZHRtZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHRoaXMudHJhY2sua2luZCA9PT0gJ2F1ZGlvJykge1xuICAgICAgICAgICAgdGhpcy5fZHRtZiA9IG5ldyB3aW5kb3cuUlRDRHRtZlNlbmRlcih0aGlzKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMudHJhY2sua2luZCA9PT0gJ3ZpZGVvJykge1xuICAgICAgICAgICAgdGhpcy5fZHRtZiA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9kdG1mO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIC8vIEVkZ2UgY3VycmVudGx5IG9ubHkgaW1wbGVtZW50cyB0aGUgUlRDRHRtZlNlbmRlciwgbm90IHRoZVxuICAvLyBSVENEVE1GU2VuZGVyIGFsaWFzLiBTZWUgaHR0cDovL2RyYWZ0Lm9ydGMub3JnLyNydGNkdG1mc2VuZGVyMipcbiAgaWYgKHdpbmRvdy5SVENEdG1mU2VuZGVyICYmICF3aW5kb3cuUlRDRFRNRlNlbmRlcikge1xuICAgIHdpbmRvdy5SVENEVE1GU2VuZGVyID0gd2luZG93LlJUQ0R0bWZTZW5kZXI7XG4gIH1cblxuICB2YXIgUlRDUGVlckNvbm5lY3Rpb25TaGltID0gKDAsIF9ydGNwZWVyY29ubmVjdGlvblNoaW0yLmRlZmF1bHQpKHdpbmRvdywgYnJvd3NlckRldGFpbHMudmVyc2lvbik7XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiA9IGZ1bmN0aW9uIFJUQ1BlZXJDb25uZWN0aW9uKGNvbmZpZykge1xuICAgIGlmIChjb25maWcgJiYgY29uZmlnLmljZVNlcnZlcnMpIHtcbiAgICAgIGNvbmZpZy5pY2VTZXJ2ZXJzID0gKDAsIF9maWx0ZXJpY2VzZXJ2ZXJzLmZpbHRlckljZVNlcnZlcnMpKGNvbmZpZy5pY2VTZXJ2ZXJzLCBicm93c2VyRGV0YWlscy52ZXJzaW9uKTtcbiAgICAgIHV0aWxzLmxvZygnSUNFIHNlcnZlcnMgYWZ0ZXIgZmlsdGVyaW5nOicsIGNvbmZpZy5pY2VTZXJ2ZXJzKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBSVENQZWVyQ29ubmVjdGlvblNoaW0oY29uZmlnKTtcbiAgfTtcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSA9IFJUQ1BlZXJDb25uZWN0aW9uU2hpbS5wcm90b3R5cGU7XG59XG5cbmZ1bmN0aW9uIHNoaW1SZXBsYWNlVHJhY2sod2luZG93KSB7XG4gIC8vIE9SVEMgaGFzIHJlcGxhY2VUcmFjayAtLSBodHRwczovL2dpdGh1Yi5jb20vdzNjL29ydGMvaXNzdWVzLzYxNFxuICBpZiAod2luZG93LlJUQ1J0cFNlbmRlciAmJiAhKCdyZXBsYWNlVHJhY2snIGluIHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlKSkge1xuICAgIHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlLnJlcGxhY2VUcmFjayA9IHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlLnNldFRyYWNrO1xuICB9XG59XG4iLCIvKlxuICogIENvcHlyaWdodCAoYykgMjAxOCBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5maWx0ZXJJY2VTZXJ2ZXJzID0gZmlsdGVySWNlU2VydmVycztcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbnZhciB1dGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF91dGlscyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbi8vIEVkZ2UgZG9lcyBub3QgbGlrZVxuLy8gMSkgc3R1bjogZmlsdGVyZWQgYWZ0ZXIgMTQzOTMgdW5sZXNzID90cmFuc3BvcnQ9dWRwIGlzIHByZXNlbnRcbi8vIDIpIHR1cm46IHRoYXQgZG9lcyBub3QgaGF2ZSBhbGwgb2YgdHVybjpob3N0OnBvcnQ/dHJhbnNwb3J0PXVkcFxuLy8gMykgdHVybjogd2l0aCBpcHY2IGFkZHJlc3Nlc1xuLy8gNCkgdHVybjogb2NjdXJyaW5nIG11bGlwbGUgdGltZXNcbmZ1bmN0aW9uIGZpbHRlckljZVNlcnZlcnMoaWNlU2VydmVycywgZWRnZVZlcnNpb24pIHtcbiAgdmFyIGhhc1R1cm4gPSBmYWxzZTtcbiAgaWNlU2VydmVycyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoaWNlU2VydmVycykpO1xuICByZXR1cm4gaWNlU2VydmVycy5maWx0ZXIoZnVuY3Rpb24gKHNlcnZlcikge1xuICAgIGlmIChzZXJ2ZXIgJiYgKHNlcnZlci51cmxzIHx8IHNlcnZlci51cmwpKSB7XG4gICAgICB2YXIgdXJscyA9IHNlcnZlci51cmxzIHx8IHNlcnZlci51cmw7XG4gICAgICBpZiAoc2VydmVyLnVybCAmJiAhc2VydmVyLnVybHMpIHtcbiAgICAgICAgdXRpbHMuZGVwcmVjYXRlZCgnUlRDSWNlU2VydmVyLnVybCcsICdSVENJY2VTZXJ2ZXIudXJscycpO1xuICAgICAgfVxuICAgICAgdmFyIGlzU3RyaW5nID0gdHlwZW9mIHVybHMgPT09ICdzdHJpbmcnO1xuICAgICAgaWYgKGlzU3RyaW5nKSB7XG4gICAgICAgIHVybHMgPSBbdXJsc107XG4gICAgICB9XG4gICAgICB1cmxzID0gdXJscy5maWx0ZXIoZnVuY3Rpb24gKHVybCkge1xuICAgICAgICAvLyBmaWx0ZXIgU1RVTiB1bmNvbmRpdGlvbmFsbHkuXG4gICAgICAgIGlmICh1cmwuaW5kZXhPZignc3R1bjonKSA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2YWxpZFR1cm4gPSB1cmwuc3RhcnRzV2l0aCgndHVybicpICYmICF1cmwuc3RhcnRzV2l0aCgndHVybjpbJykgJiYgdXJsLmluY2x1ZGVzKCd0cmFuc3BvcnQ9dWRwJyk7XG4gICAgICAgIGlmICh2YWxpZFR1cm4gJiYgIWhhc1R1cm4pIHtcbiAgICAgICAgICBoYXNUdXJuID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsaWRUdXJuICYmICFoYXNUdXJuO1xuICAgICAgfSk7XG5cbiAgICAgIGRlbGV0ZSBzZXJ2ZXIudXJsO1xuICAgICAgc2VydmVyLnVybHMgPSBpc1N0cmluZyA/IHVybHNbMF0gOiB1cmxzO1xuICAgICAgcmV0dXJuICEhdXJscy5sZW5ndGg7XG4gICAgfVxuICB9KTtcbn1cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE4IFRoZSBhZGFwdGVyLmpzIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaGltR2V0RGlzcGxheU1lZGlhID0gc2hpbUdldERpc3BsYXlNZWRpYTtcbmZ1bmN0aW9uIHNoaW1HZXREaXNwbGF5TWVkaWEod2luZG93KSB7XG4gIGlmICghKCdnZXREaXNwbGF5TWVkaWEnIGluIHdpbmRvdy5uYXZpZ2F0b3IpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghd2luZG93Lm5hdmlnYXRvci5tZWRpYURldmljZXMpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzICYmICdnZXREaXNwbGF5TWVkaWEnIGluIHdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldERpc3BsYXlNZWRpYSA9IHdpbmRvdy5uYXZpZ2F0b3IuZ2V0RGlzcGxheU1lZGlhLmJpbmQod2luZG93Lm5hdmlnYXRvcik7XG59XG4iLCIvKlxuICogIENvcHlyaWdodCAoYykgMjAxNiBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaGltR2V0VXNlck1lZGlhID0gc2hpbUdldFVzZXJNZWRpYTtcbmZ1bmN0aW9uIHNoaW1HZXRVc2VyTWVkaWEod2luZG93KSB7XG4gIHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cgJiYgd2luZG93Lm5hdmlnYXRvcjtcblxuICB2YXIgc2hpbUVycm9yXyA9IGZ1bmN0aW9uIHNoaW1FcnJvcl8oZSkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiB7IFBlcm1pc3Npb25EZW5pZWRFcnJvcjogJ05vdEFsbG93ZWRFcnJvcicgfVtlLm5hbWVdIHx8IGUubmFtZSxcbiAgICAgIG1lc3NhZ2U6IGUubWVzc2FnZSxcbiAgICAgIGNvbnN0cmFpbnQ6IGUuY29uc3RyYWludCxcbiAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubmFtZTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8vIGdldFVzZXJNZWRpYSBlcnJvciBzaGltLlxuICB2YXIgb3JpZ0dldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhLmJpbmQobmF2aWdhdG9yLm1lZGlhRGV2aWNlcyk7XG4gIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhID0gZnVuY3Rpb24gKGMpIHtcbiAgICByZXR1cm4gb3JpZ0dldFVzZXJNZWRpYShjKS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHNoaW1FcnJvcl8oZSkpO1xuICAgIH0pO1xuICB9O1xufVxuIiwiLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTYgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2hpbUdldERpc3BsYXlNZWRpYSA9IGV4cG9ydHMuc2hpbUdldFVzZXJNZWRpYSA9IHVuZGVmaW5lZDtcblxudmFyIF90eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH0gOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9O1xuXG52YXIgX2dldHVzZXJtZWRpYSA9IHJlcXVpcmUoJy4vZ2V0dXNlcm1lZGlhJyk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnc2hpbUdldFVzZXJNZWRpYScsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIF9nZXR1c2VybWVkaWEuc2hpbUdldFVzZXJNZWRpYTtcbiAgfVxufSk7XG5cbnZhciBfZ2V0ZGlzcGxheW1lZGlhID0gcmVxdWlyZSgnLi9nZXRkaXNwbGF5bWVkaWEnKTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdzaGltR2V0RGlzcGxheU1lZGlhJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gX2dldGRpc3BsYXltZWRpYS5zaGltR2V0RGlzcGxheU1lZGlhO1xuICB9XG59KTtcbmV4cG9ydHMuc2hpbU9uVHJhY2sgPSBzaGltT25UcmFjaztcbmV4cG9ydHMuc2hpbVBlZXJDb25uZWN0aW9uID0gc2hpbVBlZXJDb25uZWN0aW9uO1xuZXhwb3J0cy5zaGltU2VuZGVyR2V0U3RhdHMgPSBzaGltU2VuZGVyR2V0U3RhdHM7XG5leHBvcnRzLnNoaW1SZWNlaXZlckdldFN0YXRzID0gc2hpbVJlY2VpdmVyR2V0U3RhdHM7XG5leHBvcnRzLnNoaW1SZW1vdmVTdHJlYW0gPSBzaGltUmVtb3ZlU3RyZWFtO1xuZXhwb3J0cy5zaGltUlRDRGF0YUNoYW5uZWwgPSBzaGltUlRDRGF0YUNoYW5uZWw7XG5leHBvcnRzLnNoaW1BZGRUcmFuc2NlaXZlciA9IHNoaW1BZGRUcmFuc2NlaXZlcjtcbmV4cG9ydHMuc2hpbUdldFBhcmFtZXRlcnMgPSBzaGltR2V0UGFyYW1ldGVycztcbmV4cG9ydHMuc2hpbUNyZWF0ZU9mZmVyID0gc2hpbUNyZWF0ZU9mZmVyO1xuZXhwb3J0cy5zaGltQ3JlYXRlQW5zd2VyID0gc2hpbUNyZWF0ZUFuc3dlcjtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbnZhciB1dGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF91dGlscyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbmZ1bmN0aW9uIHNoaW1PblRyYWNrKHdpbmRvdykge1xuICBpZiAoKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHdpbmRvdykpID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDVHJhY2tFdmVudCAmJiAncmVjZWl2ZXInIGluIHdpbmRvdy5SVENUcmFja0V2ZW50LnByb3RvdHlwZSAmJiAhKCd0cmFuc2NlaXZlcicgaW4gd2luZG93LlJUQ1RyYWNrRXZlbnQucHJvdG90eXBlKSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDVHJhY2tFdmVudC5wcm90b3R5cGUsICd0cmFuc2NlaXZlcicsIHtcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4geyByZWNlaXZlcjogdGhpcy5yZWNlaXZlciB9O1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNoaW1QZWVyQ29ubmVjdGlvbih3aW5kb3cpIHtcbiAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuXG4gIGlmICgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgIT09ICdvYmplY3QnIHx8ICEod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uIHx8IHdpbmRvdy5tb3pSVENQZWVyQ29ubmVjdGlvbikpIHtcbiAgICByZXR1cm47IC8vIHByb2JhYmx5IG1lZGlhLnBlZXJjb25uZWN0aW9uLmVuYWJsZWQ9ZmFsc2UgaW4gYWJvdXQ6Y29uZmlnXG4gIH1cbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gJiYgd2luZG93Lm1velJUQ1BlZXJDb25uZWN0aW9uKSB7XG4gICAgLy8gdmVyeSBiYXNpYyBzdXBwb3J0IGZvciBvbGQgdmVyc2lvbnMuXG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uID0gd2luZG93Lm1velJUQ1BlZXJDb25uZWN0aW9uO1xuICB9XG5cbiAgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPCA1Mykge1xuICAgIC8vIHNoaW0gYXdheSBuZWVkIGZvciBvYnNvbGV0ZSBSVENJY2VDYW5kaWRhdGUvUlRDU2Vzc2lvbkRlc2NyaXB0aW9uLlxuICAgIFsnc2V0TG9jYWxEZXNjcmlwdGlvbicsICdzZXRSZW1vdGVEZXNjcmlwdGlvbicsICdhZGRJY2VDYW5kaWRhdGUnXS5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgIHZhciBuYXRpdmVNZXRob2QgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF07XG4gICAgICB2YXIgbWV0aG9kT2JqID0gX2RlZmluZVByb3BlcnR5KHt9LCBtZXRob2QsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgYXJndW1lbnRzWzBdID0gbmV3IChtZXRob2QgPT09ICdhZGRJY2VDYW5kaWRhdGUnID8gd2luZG93LlJUQ0ljZUNhbmRpZGF0ZSA6IHdpbmRvdy5SVENTZXNzaW9uRGVzY3JpcHRpb24pKGFyZ3VtZW50c1swXSk7XG4gICAgICAgIHJldHVybiBuYXRpdmVNZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0pO1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdID0gbWV0aG9kT2JqW21ldGhvZF07XG4gICAgfSk7XG4gIH1cblxuICAvLyBzdXBwb3J0IGZvciBhZGRJY2VDYW5kaWRhdGUobnVsbCBvciB1bmRlZmluZWQpXG4gIC8vIGFzIHdlbGwgYXMgaWdub3Jpbmcge3NkcE1pZCwgY2FuZGlkYXRlOiBcIlwifVxuICBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDY4KSB7XG4gICAgdmFyIG5hdGl2ZUFkZEljZUNhbmRpZGF0ZSA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlID0gZnVuY3Rpb24gYWRkSWNlQ2FuZGlkYXRlKCkge1xuICAgICAgaWYgKCFhcmd1bWVudHNbMF0pIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50c1sxXSkge1xuICAgICAgICAgIGFyZ3VtZW50c1sxXS5hcHBseShudWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgICAvLyBGaXJlZm94IDY4KyBlbWl0cyBhbmQgcHJvY2Vzc2VzIHtjYW5kaWRhdGU6IFwiXCIsIC4uLn0sIGlnbm9yZVxuICAgICAgLy8gaW4gb2xkZXIgdmVyc2lvbnMuXG4gICAgICBpZiAoYXJndW1lbnRzWzBdICYmIGFyZ3VtZW50c1swXS5jYW5kaWRhdGUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYXRpdmVBZGRJY2VDYW5kaWRhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgdmFyIG1vZGVyblN0YXRzVHlwZXMgPSB7XG4gICAgaW5ib3VuZHJ0cDogJ2luYm91bmQtcnRwJyxcbiAgICBvdXRib3VuZHJ0cDogJ291dGJvdW5kLXJ0cCcsXG4gICAgY2FuZGlkYXRlcGFpcjogJ2NhbmRpZGF0ZS1wYWlyJyxcbiAgICBsb2NhbGNhbmRpZGF0ZTogJ2xvY2FsLWNhbmRpZGF0ZScsXG4gICAgcmVtb3RlY2FuZGlkYXRlOiAncmVtb3RlLWNhbmRpZGF0ZSdcbiAgfTtcblxuICB2YXIgbmF0aXZlR2V0U3RhdHMgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFN0YXRzO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFN0YXRzID0gZnVuY3Rpb24gZ2V0U3RhdHMoKSB7XG4gICAgdmFyIF9hcmd1bWVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgICBzZWxlY3RvciA9IF9hcmd1bWVudHNbMF0sXG4gICAgICAgIG9uU3VjYyA9IF9hcmd1bWVudHNbMV0sXG4gICAgICAgIG9uRXJyID0gX2FyZ3VtZW50c1syXTtcblxuICAgIHJldHVybiBuYXRpdmVHZXRTdGF0cy5hcHBseSh0aGlzLCBbc2VsZWN0b3IgfHwgbnVsbF0pLnRoZW4oZnVuY3Rpb24gKHN0YXRzKSB7XG4gICAgICBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDUzICYmICFvblN1Y2MpIHtcbiAgICAgICAgLy8gU2hpbSBvbmx5IHByb21pc2UgZ2V0U3RhdHMgd2l0aCBzcGVjLWh5cGhlbnMgaW4gdHlwZSBuYW1lc1xuICAgICAgICAvLyBMZWF2ZSBjYWxsYmFjayB2ZXJzaW9uIGFsb25lOyBtaXNjIG9sZCB1c2VzIG9mIGZvckVhY2ggYmVmb3JlIE1hcFxuICAgICAgICB0cnkge1xuICAgICAgICAgIHN0YXRzLmZvckVhY2goZnVuY3Rpb24gKHN0YXQpIHtcbiAgICAgICAgICAgIHN0YXQudHlwZSA9IG1vZGVyblN0YXRzVHlwZXNbc3RhdC50eXBlXSB8fCBzdGF0LnR5cGU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5uYW1lICE9PSAnVHlwZUVycm9yJykge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQXZvaWQgVHlwZUVycm9yOiBcInR5cGVcIiBpcyByZWFkLW9ubHksIGluIG9sZCB2ZXJzaW9ucy4gMzQtNDNpc2hcbiAgICAgICAgICBzdGF0cy5mb3JFYWNoKGZ1bmN0aW9uIChzdGF0LCBpKSB7XG4gICAgICAgICAgICBzdGF0cy5zZXQoaSwgT2JqZWN0LmFzc2lnbih7fSwgc3RhdCwge1xuICAgICAgICAgICAgICB0eXBlOiBtb2Rlcm5TdGF0c1R5cGVzW3N0YXQudHlwZV0gfHwgc3RhdC50eXBlXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzdGF0cztcbiAgICB9KS50aGVuKG9uU3VjYywgb25FcnIpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzaGltU2VuZGVyR2V0U3RhdHMod2luZG93KSB7XG4gIGlmICghKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uICYmIHdpbmRvdy5SVENSdHBTZW5kZXIpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh3aW5kb3cuUlRDUnRwU2VuZGVyICYmICdnZXRTdGF0cycgaW4gd2luZG93LlJUQ1J0cFNlbmRlci5wcm90b3R5cGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG9yaWdHZXRTZW5kZXJzID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTZW5kZXJzO1xuICBpZiAob3JpZ0dldFNlbmRlcnMpIHtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFNlbmRlcnMgPSBmdW5jdGlvbiBnZXRTZW5kZXJzKCkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdmFyIHNlbmRlcnMgPSBvcmlnR2V0U2VuZGVycy5hcHBseSh0aGlzLCBbXSk7XG4gICAgICBzZW5kZXJzLmZvckVhY2goZnVuY3Rpb24gKHNlbmRlcikge1xuICAgICAgICByZXR1cm4gc2VuZGVyLl9wYyA9IF90aGlzO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gc2VuZGVycztcbiAgICB9O1xuICB9XG5cbiAgdmFyIG9yaWdBZGRUcmFjayA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2s7XG4gIGlmIChvcmlnQWRkVHJhY2spIHtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrID0gZnVuY3Rpb24gYWRkVHJhY2soKSB7XG4gICAgICB2YXIgc2VuZGVyID0gb3JpZ0FkZFRyYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBzZW5kZXIuX3BjID0gdGhpcztcbiAgICAgIHJldHVybiBzZW5kZXI7XG4gICAgfTtcbiAgfVxuICB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uIGdldFN0YXRzKCkge1xuICAgIHJldHVybiB0aGlzLnRyYWNrID8gdGhpcy5fcGMuZ2V0U3RhdHModGhpcy50cmFjaykgOiBQcm9taXNlLnJlc29sdmUobmV3IE1hcCgpKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2hpbVJlY2VpdmVyR2V0U3RhdHMod2luZG93KSB7XG4gIGlmICghKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uICYmIHdpbmRvdy5SVENSdHBTZW5kZXIpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh3aW5kb3cuUlRDUnRwU2VuZGVyICYmICdnZXRTdGF0cycgaW4gd2luZG93LlJUQ1J0cFJlY2VpdmVyLnByb3RvdHlwZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgb3JpZ0dldFJlY2VpdmVycyA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0UmVjZWl2ZXJzO1xuICBpZiAob3JpZ0dldFJlY2VpdmVycykge1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0UmVjZWl2ZXJzID0gZnVuY3Rpb24gZ2V0UmVjZWl2ZXJzKCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHZhciByZWNlaXZlcnMgPSBvcmlnR2V0UmVjZWl2ZXJzLmFwcGx5KHRoaXMsIFtdKTtcbiAgICAgIHJlY2VpdmVycy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNlaXZlcikge1xuICAgICAgICByZXR1cm4gcmVjZWl2ZXIuX3BjID0gX3RoaXMyO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVjZWl2ZXJzO1xuICAgIH07XG4gIH1cbiAgdXRpbHMud3JhcFBlZXJDb25uZWN0aW9uRXZlbnQod2luZG93LCAndHJhY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGUucmVjZWl2ZXIuX3BjID0gZS5zcmNFbGVtZW50O1xuICAgIHJldHVybiBlO1xuICB9KTtcbiAgd2luZG93LlJUQ1J0cFJlY2VpdmVyLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uIGdldFN0YXRzKCkge1xuICAgIHJldHVybiB0aGlzLl9wYy5nZXRTdGF0cyh0aGlzLnRyYWNrKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2hpbVJlbW92ZVN0cmVhbSh3aW5kb3cpIHtcbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gfHwgJ3JlbW92ZVN0cmVhbScgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVN0cmVhbSA9IGZ1bmN0aW9uIHJlbW92ZVN0cmVhbShzdHJlYW0pIHtcbiAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgIHV0aWxzLmRlcHJlY2F0ZWQoJ3JlbW92ZVN0cmVhbScsICdyZW1vdmVUcmFjaycpO1xuICAgIHRoaXMuZ2V0U2VuZGVycygpLmZvckVhY2goZnVuY3Rpb24gKHNlbmRlcikge1xuICAgICAgaWYgKHNlbmRlci50cmFjayAmJiBzdHJlYW0uZ2V0VHJhY2tzKCkuaW5jbHVkZXMoc2VuZGVyLnRyYWNrKSkge1xuICAgICAgICBfdGhpczMucmVtb3ZlVHJhY2soc2VuZGVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2hpbVJUQ0RhdGFDaGFubmVsKHdpbmRvdykge1xuICAvLyByZW5hbWUgRGF0YUNoYW5uZWwgdG8gUlRDRGF0YUNoYW5uZWwgKG5hdGl2ZSBmaXggaW4gRkY2MCk6XG4gIC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTExNzM4NTFcbiAgaWYgKHdpbmRvdy5EYXRhQ2hhbm5lbCAmJiAhd2luZG93LlJUQ0RhdGFDaGFubmVsKSB7XG4gICAgd2luZG93LlJUQ0RhdGFDaGFubmVsID0gd2luZG93LkRhdGFDaGFubmVsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNoaW1BZGRUcmFuc2NlaXZlcih3aW5kb3cpIHtcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3dlYnJ0Y0hhY2tzL2FkYXB0ZXIvaXNzdWVzLzk5OCNpc3N1ZWNvbW1lbnQtNTE2OTIxNjQ3XG4gIC8vIEZpcmVmb3ggaWdub3JlcyB0aGUgaW5pdCBzZW5kRW5jb2RpbmdzIG9wdGlvbnMgcGFzc2VkIHRvIGFkZFRyYW5zY2VpdmVyXG4gIC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTEzOTY5MThcbiAgaWYgKCEoKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHdpbmRvdykpID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBvcmlnQWRkVHJhbnNjZWl2ZXIgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYW5zY2VpdmVyO1xuICBpZiAob3JpZ0FkZFRyYW5zY2VpdmVyKSB7XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRUcmFuc2NlaXZlciA9IGZ1bmN0aW9uIGFkZFRyYW5zY2VpdmVyKCkge1xuICAgICAgdGhpcy5zZXRQYXJhbWV0ZXJzUHJvbWlzZXMgPSBbXTtcbiAgICAgIHZhciBpbml0UGFyYW1ldGVycyA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIHZhciBzaG91bGRQZXJmb3JtQ2hlY2sgPSBpbml0UGFyYW1ldGVycyAmJiAnc2VuZEVuY29kaW5ncycgaW4gaW5pdFBhcmFtZXRlcnM7XG4gICAgICBpZiAoc2hvdWxkUGVyZm9ybUNoZWNrKSB7XG4gICAgICAgIC8vIElmIHNlbmRFbmNvZGluZ3MgcGFyYW1zIGFyZSBwcm92aWRlZCwgdmFsaWRhdGUgZ3JhbW1hclxuICAgICAgICBpbml0UGFyYW1ldGVycy5zZW5kRW5jb2RpbmdzLmZvckVhY2goZnVuY3Rpb24gKGVuY29kaW5nUGFyYW0pIHtcbiAgICAgICAgICBpZiAoJ3JpZCcgaW4gZW5jb2RpbmdQYXJhbSkge1xuICAgICAgICAgICAgdmFyIHJpZFJlZ2V4ID0gL15bYS16MC05XXswLDE2fSQvaTtcbiAgICAgICAgICAgIGlmICghcmlkUmVnZXgudGVzdChlbmNvZGluZ1BhcmFtLnJpZCkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBSSUQgdmFsdWUgcHJvdmlkZWQuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgnc2NhbGVSZXNvbHV0aW9uRG93bkJ5JyBpbiBlbmNvZGluZ1BhcmFtKSB7XG4gICAgICAgICAgICBpZiAoIShwYXJzZUZsb2F0KGVuY29kaW5nUGFyYW0uc2NhbGVSZXNvbHV0aW9uRG93bkJ5KSA+PSAxLjApKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdzY2FsZV9yZXNvbHV0aW9uX2Rvd25fYnkgbXVzdCBiZSA+PSAxLjAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCdtYXhGcmFtZXJhdGUnIGluIGVuY29kaW5nUGFyYW0pIHtcbiAgICAgICAgICAgIGlmICghKHBhcnNlRmxvYXQoZW5jb2RpbmdQYXJhbS5tYXhGcmFtZXJhdGUpID49IDApKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdtYXhfZnJhbWVyYXRlIG11c3QgYmUgPj0gMC4wJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHZhciB0cmFuc2NlaXZlciA9IG9yaWdBZGRUcmFuc2NlaXZlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKHNob3VsZFBlcmZvcm1DaGVjaykge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGUgaW5pdCBvcHRpb25zIHdlcmUgYXBwbGllZC4gSWYgbm90IHdlIGRvIHRoaXMgaW4gYW5cbiAgICAgICAgLy8gYXN5bmNocm9ub3VzIHdheSBhbmQgc2F2ZSB0aGUgcHJvbWlzZSByZWZlcmVuY2UgaW4gYSBnbG9iYWwgb2JqZWN0LlxuICAgICAgICAvLyBUaGlzIGlzIGFuIHVnbHkgaGFjaywgYnV0IGF0IHRoZSBzYW1lIHRpbWUgaXMgd2F5IG1vcmUgcm9idXN0IHRoYW5cbiAgICAgICAgLy8gY2hlY2tpbmcgdGhlIHNlbmRlciBwYXJhbWV0ZXJzIGJlZm9yZSBhbmQgYWZ0ZXIgdGhlIGNyZWF0ZU9mZmVyXG4gICAgICAgIC8vIEFsc28gbm90ZSB0aGF0IGFmdGVyIHRoZSBjcmVhdGVvZmZlciB3ZSBhcmUgbm90IDEwMCUgc3VyZSB0aGF0XG4gICAgICAgIC8vIHRoZSBwYXJhbXMgd2VyZSBhc3luY2hyb25vdXNseSBhcHBsaWVkIHNvIHdlIG1pZ2h0IG1pc3MgdGhlXG4gICAgICAgIC8vIG9wcG9ydHVuaXR5IHRvIHJlY3JlYXRlIG9mZmVyLlxuICAgICAgICB2YXIgc2VuZGVyID0gdHJhbnNjZWl2ZXIuc2VuZGVyO1xuXG4gICAgICAgIHZhciBwYXJhbXMgPSBzZW5kZXIuZ2V0UGFyYW1ldGVycygpO1xuICAgICAgICBpZiAoISgnZW5jb2RpbmdzJyBpbiBwYXJhbXMpIHx8XG4gICAgICAgIC8vIEF2b2lkIGJlaW5nIGZvb2xlZCBieSBwYXRjaGVkIGdldFBhcmFtZXRlcnMoKSBiZWxvdy5cbiAgICAgICAgcGFyYW1zLmVuY29kaW5ncy5sZW5ndGggPT09IDEgJiYgT2JqZWN0LmtleXMocGFyYW1zLmVuY29kaW5nc1swXSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgcGFyYW1zLmVuY29kaW5ncyA9IGluaXRQYXJhbWV0ZXJzLnNlbmRFbmNvZGluZ3M7XG4gICAgICAgICAgc2VuZGVyLnNlbmRFbmNvZGluZ3MgPSBpbml0UGFyYW1ldGVycy5zZW5kRW5jb2RpbmdzO1xuICAgICAgICAgIHRoaXMuc2V0UGFyYW1ldGVyc1Byb21pc2VzLnB1c2goc2VuZGVyLnNldFBhcmFtZXRlcnMocGFyYW1zKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzZW5kZXIuc2VuZEVuY29kaW5ncztcbiAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkZWxldGUgc2VuZGVyLnNlbmRFbmNvZGluZ3M7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJhbnNjZWl2ZXI7XG4gICAgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaGltR2V0UGFyYW1ldGVycyh3aW5kb3cpIHtcbiAgaWYgKCEoKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHdpbmRvdykpID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDUnRwU2VuZGVyKSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgb3JpZ0dldFBhcmFtZXRlcnMgPSB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZS5nZXRQYXJhbWV0ZXJzO1xuICBpZiAob3JpZ0dldFBhcmFtZXRlcnMpIHtcbiAgICB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZS5nZXRQYXJhbWV0ZXJzID0gZnVuY3Rpb24gZ2V0UGFyYW1ldGVycygpIHtcbiAgICAgIHZhciBwYXJhbXMgPSBvcmlnR2V0UGFyYW1ldGVycy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKCEoJ2VuY29kaW5ncycgaW4gcGFyYW1zKSkge1xuICAgICAgICBwYXJhbXMuZW5jb2RpbmdzID0gW10uY29uY2F0KHRoaXMuc2VuZEVuY29kaW5ncyB8fCBbe31dKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaGltQ3JlYXRlT2ZmZXIod2luZG93KSB7XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJydGNIYWNrcy9hZGFwdGVyL2lzc3Vlcy85OTgjaXNzdWVjb21tZW50LTUxNjkyMTY0N1xuICAvLyBGaXJlZm94IGlnbm9yZXMgdGhlIGluaXQgc2VuZEVuY29kaW5ncyBvcHRpb25zIHBhc3NlZCB0byBhZGRUcmFuc2NlaXZlclxuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xMzk2OTE4XG4gIGlmICghKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgb3JpZ0NyZWF0ZU9mZmVyID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVPZmZlcjtcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVPZmZlciA9IGZ1bmN0aW9uIGNyZWF0ZU9mZmVyKCkge1xuICAgIHZhciBfdGhpczQgPSB0aGlzLFxuICAgICAgICBfYXJndW1lbnRzMiA9IGFyZ3VtZW50cztcblxuICAgIGlmICh0aGlzLnNldFBhcmFtZXRlcnNQcm9taXNlcyAmJiB0aGlzLnNldFBhcmFtZXRlcnNQcm9taXNlcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbCh0aGlzLnNldFBhcmFtZXRlcnNQcm9taXNlcykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBvcmlnQ3JlYXRlT2ZmZXIuYXBwbHkoX3RoaXM0LCBfYXJndW1lbnRzMik7XG4gICAgICB9KS5maW5hbGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX3RoaXM0LnNldFBhcmFtZXRlcnNQcm9taXNlcyA9IFtdO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBvcmlnQ3JlYXRlT2ZmZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2hpbUNyZWF0ZUFuc3dlcih3aW5kb3cpIHtcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3dlYnJ0Y0hhY2tzL2FkYXB0ZXIvaXNzdWVzLzk5OCNpc3N1ZWNvbW1lbnQtNTE2OTIxNjQ3XG4gIC8vIEZpcmVmb3ggaWdub3JlcyB0aGUgaW5pdCBzZW5kRW5jb2RpbmdzIG9wdGlvbnMgcGFzc2VkIHRvIGFkZFRyYW5zY2VpdmVyXG4gIC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTEzOTY5MThcbiAgaWYgKCEoKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHdpbmRvdykpID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBvcmlnQ3JlYXRlQW5zd2VyID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVBbnN3ZXI7XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlQW5zd2VyID0gZnVuY3Rpb24gY3JlYXRlQW5zd2VyKCkge1xuICAgIHZhciBfdGhpczUgPSB0aGlzLFxuICAgICAgICBfYXJndW1lbnRzMyA9IGFyZ3VtZW50cztcblxuICAgIGlmICh0aGlzLnNldFBhcmFtZXRlcnNQcm9taXNlcyAmJiB0aGlzLnNldFBhcmFtZXRlcnNQcm9taXNlcy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbCh0aGlzLnNldFBhcmFtZXRlcnNQcm9taXNlcykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBvcmlnQ3JlYXRlQW5zd2VyLmFwcGx5KF90aGlzNSwgX2FyZ3VtZW50czMpO1xuICAgICAgfSkuZmluYWxseShmdW5jdGlvbiAoKSB7XG4gICAgICAgIF90aGlzNS5zZXRQYXJhbWV0ZXJzUHJvbWlzZXMgPSBbXTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gb3JpZ0NyZWF0ZUFuc3dlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xufVxuIiwiLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTggVGhlIGFkYXB0ZXIuanMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNoaW1HZXREaXNwbGF5TWVkaWEgPSBzaGltR2V0RGlzcGxheU1lZGlhO1xuZnVuY3Rpb24gc2hpbUdldERpc3BsYXlNZWRpYSh3aW5kb3csIHByZWZlcnJlZE1lZGlhU291cmNlKSB7XG4gIGlmICh3aW5kb3cubmF2aWdhdG9yLm1lZGlhRGV2aWNlcyAmJiAnZ2V0RGlzcGxheU1lZGlhJyBpbiB3aW5kb3cubmF2aWdhdG9yLm1lZGlhRGV2aWNlcykge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIXdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldERpc3BsYXlNZWRpYSA9IGZ1bmN0aW9uIGdldERpc3BsYXlNZWRpYShjb25zdHJhaW50cykge1xuICAgIGlmICghKGNvbnN0cmFpbnRzICYmIGNvbnN0cmFpbnRzLnZpZGVvKSkge1xuICAgICAgdmFyIGVyciA9IG5ldyBET01FeGNlcHRpb24oJ2dldERpc3BsYXlNZWRpYSB3aXRob3V0IHZpZGVvICcgKyAnY29uc3RyYWludHMgaXMgdW5kZWZpbmVkJyk7XG4gICAgICBlcnIubmFtZSA9ICdOb3RGb3VuZEVycm9yJztcbiAgICAgIC8vIGZyb20gaHR0cHM6Ly9oZXljYW0uZ2l0aHViLmlvL3dlYmlkbC8jaWRsLURPTUV4Y2VwdGlvbi1lcnJvci1uYW1lc1xuICAgICAgZXJyLmNvZGUgPSA4O1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gICAgfVxuICAgIGlmIChjb25zdHJhaW50cy52aWRlbyA9PT0gdHJ1ZSkge1xuICAgICAgY29uc3RyYWludHMudmlkZW8gPSB7IG1lZGlhU291cmNlOiBwcmVmZXJyZWRNZWRpYVNvdXJjZSB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdHJhaW50cy52aWRlby5tZWRpYVNvdXJjZSA9IHByZWZlcnJlZE1lZGlhU291cmNlO1xuICAgIH1cbiAgICByZXR1cm4gd2luZG93Lm5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKTtcbiAgfTtcbn1cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuZXhwb3J0cy5zaGltR2V0VXNlck1lZGlhID0gc2hpbUdldFVzZXJNZWRpYTtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbnZhciB1dGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF91dGlscyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIHNoaW1HZXRVc2VyTWVkaWEod2luZG93KSB7XG4gIHZhciBicm93c2VyRGV0YWlscyA9IHV0aWxzLmRldGVjdEJyb3dzZXIod2luZG93KTtcbiAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdyAmJiB3aW5kb3cubmF2aWdhdG9yO1xuICB2YXIgTWVkaWFTdHJlYW1UcmFjayA9IHdpbmRvdyAmJiB3aW5kb3cuTWVkaWFTdHJlYW1UcmFjaztcblxuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gZnVuY3Rpb24gKGNvbnN0cmFpbnRzLCBvblN1Y2Nlc3MsIG9uRXJyb3IpIHtcbiAgICAvLyBSZXBsYWNlIEZpcmVmb3ggNDQrJ3MgZGVwcmVjYXRpb24gd2FybmluZyB3aXRoIHVucHJlZml4ZWQgdmVyc2lvbi5cbiAgICB1dGlscy5kZXByZWNhdGVkKCduYXZpZ2F0b3IuZ2V0VXNlck1lZGlhJywgJ25hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhJyk7XG4gICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMpLnRoZW4ob25TdWNjZXNzLCBvbkVycm9yKTtcbiAgfTtcblxuICBpZiAoIShicm93c2VyRGV0YWlscy52ZXJzaW9uID4gNTUgJiYgJ2F1dG9HYWluQ29udHJvbCcgaW4gbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRTdXBwb3J0ZWRDb25zdHJhaW50cygpKSkge1xuICAgIHZhciByZW1hcCA9IGZ1bmN0aW9uIHJlbWFwKG9iaiwgYSwgYikge1xuICAgICAgaWYgKGEgaW4gb2JqICYmICEoYiBpbiBvYmopKSB7XG4gICAgICAgIG9ialtiXSA9IG9ialthXTtcbiAgICAgICAgZGVsZXRlIG9ialthXTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIG5hdGl2ZUdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhLmJpbmQobmF2aWdhdG9yLm1lZGlhRGV2aWNlcyk7XG4gICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEgPSBmdW5jdGlvbiAoYykge1xuICAgICAgaWYgKCh0eXBlb2YgYyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoYykpID09PSAnb2JqZWN0JyAmJiBfdHlwZW9mKGMuYXVkaW8pID09PSAnb2JqZWN0Jykge1xuICAgICAgICBjID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjKSk7XG4gICAgICAgIHJlbWFwKGMuYXVkaW8sICdhdXRvR2FpbkNvbnRyb2wnLCAnbW96QXV0b0dhaW5Db250cm9sJyk7XG4gICAgICAgIHJlbWFwKGMuYXVkaW8sICdub2lzZVN1cHByZXNzaW9uJywgJ21vek5vaXNlU3VwcHJlc3Npb24nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYXRpdmVHZXRVc2VyTWVkaWEoYyk7XG4gICAgfTtcblxuICAgIGlmIChNZWRpYVN0cmVhbVRyYWNrICYmIE1lZGlhU3RyZWFtVHJhY2sucHJvdG90eXBlLmdldFNldHRpbmdzKSB7XG4gICAgICB2YXIgbmF0aXZlR2V0U2V0dGluZ3MgPSBNZWRpYVN0cmVhbVRyYWNrLnByb3RvdHlwZS5nZXRTZXR0aW5ncztcbiAgICAgIE1lZGlhU3RyZWFtVHJhY2sucHJvdG90eXBlLmdldFNldHRpbmdzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2JqID0gbmF0aXZlR2V0U2V0dGluZ3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgcmVtYXAob2JqLCAnbW96QXV0b0dhaW5Db250cm9sJywgJ2F1dG9HYWluQ29udHJvbCcpO1xuICAgICAgICByZW1hcChvYmosICdtb3pOb2lzZVN1cHByZXNzaW9uJywgJ25vaXNlU3VwcHJlc3Npb24nKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKE1lZGlhU3RyZWFtVHJhY2sgJiYgTWVkaWFTdHJlYW1UcmFjay5wcm90b3R5cGUuYXBwbHlDb25zdHJhaW50cykge1xuICAgICAgdmFyIG5hdGl2ZUFwcGx5Q29uc3RyYWludHMgPSBNZWRpYVN0cmVhbVRyYWNrLnByb3RvdHlwZS5hcHBseUNvbnN0cmFpbnRzO1xuICAgICAgTWVkaWFTdHJlYW1UcmFjay5wcm90b3R5cGUuYXBwbHlDb25zdHJhaW50cyA9IGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIGlmICh0aGlzLmtpbmQgPT09ICdhdWRpbycgJiYgKHR5cGVvZiBjID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihjKSkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgYyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYykpO1xuICAgICAgICAgIHJlbWFwKGMsICdhdXRvR2FpbkNvbnRyb2wnLCAnbW96QXV0b0dhaW5Db250cm9sJyk7XG4gICAgICAgICAgcmVtYXAoYywgJ25vaXNlU3VwcHJlc3Npb24nLCAnbW96Tm9pc2VTdXBwcmVzc2lvbicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuYXRpdmVBcHBseUNvbnN0cmFpbnRzLmFwcGx5KHRoaXMsIFtjXSk7XG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuIiwiLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTYgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4ndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuZXhwb3J0cy5zaGltTG9jYWxTdHJlYW1zQVBJID0gc2hpbUxvY2FsU3RyZWFtc0FQSTtcbmV4cG9ydHMuc2hpbVJlbW90ZVN0cmVhbXNBUEkgPSBzaGltUmVtb3RlU3RyZWFtc0FQSTtcbmV4cG9ydHMuc2hpbUNhbGxiYWNrc0FQSSA9IHNoaW1DYWxsYmFja3NBUEk7XG5leHBvcnRzLnNoaW1HZXRVc2VyTWVkaWEgPSBzaGltR2V0VXNlck1lZGlhO1xuZXhwb3J0cy5zaGltQ29uc3RyYWludHMgPSBzaGltQ29uc3RyYWludHM7XG5leHBvcnRzLnNoaW1SVENJY2VTZXJ2ZXJVcmxzID0gc2hpbVJUQ0ljZVNlcnZlclVybHM7XG5leHBvcnRzLnNoaW1UcmFja0V2ZW50VHJhbnNjZWl2ZXIgPSBzaGltVHJhY2tFdmVudFRyYW5zY2VpdmVyO1xuZXhwb3J0cy5zaGltQ3JlYXRlT2ZmZXJMZWdhY3kgPSBzaGltQ3JlYXRlT2ZmZXJMZWdhY3k7XG5leHBvcnRzLnNoaW1BdWRpb0NvbnRleHQgPSBzaGltQXVkaW9Db250ZXh0O1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxudmFyIHV0aWxzID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3V0aWxzKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBlbHNlIHsgdmFyIG5ld09iaiA9IHt9OyBpZiAob2JqICE9IG51bGwpIHsgZm9yICh2YXIga2V5IGluIG9iaikgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IG5ld09iai5kZWZhdWx0ID0gb2JqOyByZXR1cm4gbmV3T2JqOyB9IH1cblxuZnVuY3Rpb24gc2hpbUxvY2FsU3RyZWFtc0FQSSh3aW5kb3cpIHtcbiAgaWYgKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSAhPT0gJ29iamVjdCcgfHwgIXdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbikge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoISgnZ2V0TG9jYWxTdHJlYW1zJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlKSkge1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0TG9jYWxTdHJlYW1zID0gZnVuY3Rpb24gZ2V0TG9jYWxTdHJlYW1zKCkge1xuICAgICAgaWYgKCF0aGlzLl9sb2NhbFN0cmVhbXMpIHtcbiAgICAgICAgdGhpcy5fbG9jYWxTdHJlYW1zID0gW107XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fbG9jYWxTdHJlYW1zO1xuICAgIH07XG4gIH1cbiAgaWYgKCEoJ2FkZFN0cmVhbScgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkpIHtcbiAgICB2YXIgX2FkZFRyYWNrID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRUcmFjaztcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbSA9IGZ1bmN0aW9uIGFkZFN0cmVhbShzdHJlYW0pIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIGlmICghdGhpcy5fbG9jYWxTdHJlYW1zKSB7XG4gICAgICAgIHRoaXMuX2xvY2FsU3RyZWFtcyA9IFtdO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLl9sb2NhbFN0cmVhbXMuaW5jbHVkZXMoc3RyZWFtKSkge1xuICAgICAgICB0aGlzLl9sb2NhbFN0cmVhbXMucHVzaChzdHJlYW0pO1xuICAgICAgfVxuICAgICAgLy8gVHJ5IHRvIGVtdWxhdGUgQ2hyb21lJ3MgYmVoYXZpb3VyIG9mIGFkZGluZyBpbiBhdWRpby12aWRlbyBvcmRlci5cbiAgICAgIC8vIFNhZmFyaSBvcmRlcnMgYnkgdHJhY2sgaWQuXG4gICAgICBzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICByZXR1cm4gX2FkZFRyYWNrLmNhbGwoX3RoaXMsIHRyYWNrLCBzdHJlYW0pO1xuICAgICAgfSk7XG4gICAgICBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICByZXR1cm4gX2FkZFRyYWNrLmNhbGwoX3RoaXMsIHRyYWNrLCBzdHJlYW0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2sgPSBmdW5jdGlvbiBhZGRUcmFjayh0cmFjaykge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBzdHJlYW1zID0gQXJyYXkoX2xlbiA+IDEgPyBfbGVuIC0gMSA6IDApLCBfa2V5ID0gMTsgX2tleSA8IF9sZW47IF9rZXkrKykge1xuICAgICAgICBzdHJlYW1zW19rZXkgLSAxXSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN0cmVhbXMpIHtcbiAgICAgICAgc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICBpZiAoIV90aGlzMi5fbG9jYWxTdHJlYW1zKSB7XG4gICAgICAgICAgICBfdGhpczIuX2xvY2FsU3RyZWFtcyA9IFtzdHJlYW1dO1xuICAgICAgICAgIH0gZWxzZSBpZiAoIV90aGlzMi5fbG9jYWxTdHJlYW1zLmluY2x1ZGVzKHN0cmVhbSkpIHtcbiAgICAgICAgICAgIF90aGlzMi5fbG9jYWxTdHJlYW1zLnB1c2goc3RyZWFtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIF9hZGRUcmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cbiAgaWYgKCEoJ3JlbW92ZVN0cmVhbScgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkpIHtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVN0cmVhbSA9IGZ1bmN0aW9uIHJlbW92ZVN0cmVhbShzdHJlYW0pIHtcbiAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICBpZiAoIXRoaXMuX2xvY2FsU3RyZWFtcykge1xuICAgICAgICB0aGlzLl9sb2NhbFN0cmVhbXMgPSBbXTtcbiAgICAgIH1cbiAgICAgIHZhciBpbmRleCA9IHRoaXMuX2xvY2FsU3RyZWFtcy5pbmRleE9mKHN0cmVhbSk7XG4gICAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2xvY2FsU3RyZWFtcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgdmFyIHRyYWNrcyA9IHN0cmVhbS5nZXRUcmFja3MoKTtcbiAgICAgIHRoaXMuZ2V0U2VuZGVycygpLmZvckVhY2goZnVuY3Rpb24gKHNlbmRlcikge1xuICAgICAgICBpZiAodHJhY2tzLmluY2x1ZGVzKHNlbmRlci50cmFjaykpIHtcbiAgICAgICAgICBfdGhpczMucmVtb3ZlVHJhY2soc2VuZGVyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaGltUmVtb3RlU3RyZWFtc0FQSSh3aW5kb3cpIHtcbiAgaWYgKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSAhPT0gJ29iamVjdCcgfHwgIXdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbikge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoISgnZ2V0UmVtb3RlU3RyZWFtcycgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkpIHtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFJlbW90ZVN0cmVhbXMgPSBmdW5jdGlvbiBnZXRSZW1vdGVTdHJlYW1zKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3JlbW90ZVN0cmVhbXMgPyB0aGlzLl9yZW1vdGVTdHJlYW1zIDogW107XG4gICAgfTtcbiAgfVxuICBpZiAoISgnb25hZGRzdHJlYW0nIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUsICdvbmFkZHN0cmVhbScsIHtcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb25hZGRzdHJlYW07XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbiBzZXQoZikge1xuICAgICAgICB2YXIgX3RoaXM0ID0gdGhpcztcblxuICAgICAgICBpZiAodGhpcy5fb25hZGRzdHJlYW0pIHtcbiAgICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2FkZHN0cmVhbScsIHRoaXMuX29uYWRkc3RyZWFtKTtcbiAgICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RyYWNrJywgdGhpcy5fb25hZGRzdHJlYW1wb2x5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZHN0cmVhbScsIHRoaXMuX29uYWRkc3RyZWFtID0gZik7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndHJhY2snLCB0aGlzLl9vbmFkZHN0cmVhbXBvbHkgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIGUuc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgIGlmICghX3RoaXM0Ll9yZW1vdGVTdHJlYW1zKSB7XG4gICAgICAgICAgICAgIF90aGlzNC5fcmVtb3RlU3RyZWFtcyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKF90aGlzNC5fcmVtb3RlU3RyZWFtcy5pbmNsdWRlcyhzdHJlYW0pKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF90aGlzNC5fcmVtb3RlU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2FkZHN0cmVhbScpO1xuICAgICAgICAgICAgZXZlbnQuc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICAgICAgX3RoaXM0LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgb3JpZ1NldFJlbW90ZURlc2NyaXB0aW9uID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbjtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uID0gZnVuY3Rpb24gc2V0UmVtb3RlRGVzY3JpcHRpb24oKSB7XG4gICAgICB2YXIgcGMgPSB0aGlzO1xuICAgICAgaWYgKCF0aGlzLl9vbmFkZHN0cmVhbXBvbHkpIHtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0cmFjaycsIHRoaXMuX29uYWRkc3RyZWFtcG9seSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgZS5zdHJlYW1zLmZvckVhY2goZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICAgICAgaWYgKCFwYy5fcmVtb3RlU3RyZWFtcykge1xuICAgICAgICAgICAgICBwYy5fcmVtb3RlU3RyZWFtcyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHBjLl9yZW1vdGVTdHJlYW1zLmluZGV4T2Yoc3RyZWFtKSA+PSAwKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBjLl9yZW1vdGVTdHJlYW1zLnB1c2goc3RyZWFtKTtcbiAgICAgICAgICAgIHZhciBldmVudCA9IG5ldyBFdmVudCgnYWRkc3RyZWFtJyk7XG4gICAgICAgICAgICBldmVudC5zdHJlYW0gPSBzdHJlYW07XG4gICAgICAgICAgICBwYy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpZ1NldFJlbW90ZURlc2NyaXB0aW9uLmFwcGx5KHBjLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gc2hpbUNhbGxiYWNrc0FQSSh3aW5kb3cpIHtcbiAgaWYgKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSAhPT0gJ29iamVjdCcgfHwgIXdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbikge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcHJvdG90eXBlID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZTtcbiAgdmFyIG9yaWdDcmVhdGVPZmZlciA9IHByb3RvdHlwZS5jcmVhdGVPZmZlcjtcbiAgdmFyIG9yaWdDcmVhdGVBbnN3ZXIgPSBwcm90b3R5cGUuY3JlYXRlQW5zd2VyO1xuICB2YXIgc2V0TG9jYWxEZXNjcmlwdGlvbiA9IHByb3RvdHlwZS5zZXRMb2NhbERlc2NyaXB0aW9uO1xuICB2YXIgc2V0UmVtb3RlRGVzY3JpcHRpb24gPSBwcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb247XG4gIHZhciBhZGRJY2VDYW5kaWRhdGUgPSBwcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlO1xuXG4gIHByb3RvdHlwZS5jcmVhdGVPZmZlciA9IGZ1bmN0aW9uIGNyZWF0ZU9mZmVyKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID49IDIgPyBhcmd1bWVudHNbMl0gOiBhcmd1bWVudHNbMF07XG4gICAgdmFyIHByb21pc2UgPSBvcmlnQ3JlYXRlT2ZmZXIuYXBwbHkodGhpcywgW29wdGlvbnNdKTtcbiAgICBpZiAoIWZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIHByb21pc2UudGhlbihzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjayk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9O1xuXG4gIHByb3RvdHlwZS5jcmVhdGVBbnN3ZXIgPSBmdW5jdGlvbiBjcmVhdGVBbnN3ZXIoc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3VtZW50cy5sZW5ndGggPj0gMiA/IGFyZ3VtZW50c1syXSA6IGFyZ3VtZW50c1swXTtcbiAgICB2YXIgcHJvbWlzZSA9IG9yaWdDcmVhdGVBbnN3ZXIuYXBwbHkodGhpcywgW29wdGlvbnNdKTtcbiAgICBpZiAoIWZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIHByb21pc2UudGhlbihzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjayk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9O1xuXG4gIHZhciB3aXRoQ2FsbGJhY2sgPSBmdW5jdGlvbiB3aXRoQ2FsbGJhY2soZGVzY3JpcHRpb24sIHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgdmFyIHByb21pc2UgPSBzZXRMb2NhbERlc2NyaXB0aW9uLmFwcGx5KHRoaXMsIFtkZXNjcmlwdGlvbl0pO1xuICAgIGlmICghZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gICAgcHJvbWlzZS50aGVuKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKTtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH07XG4gIHByb3RvdHlwZS5zZXRMb2NhbERlc2NyaXB0aW9uID0gd2l0aENhbGxiYWNrO1xuXG4gIHdpdGhDYWxsYmFjayA9IGZ1bmN0aW9uIHdpdGhDYWxsYmFjayhkZXNjcmlwdGlvbiwgc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICB2YXIgcHJvbWlzZSA9IHNldFJlbW90ZURlc2NyaXB0aW9uLmFwcGx5KHRoaXMsIFtkZXNjcmlwdGlvbl0pO1xuICAgIGlmICghZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gICAgcHJvbWlzZS50aGVuKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKTtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH07XG4gIHByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IHdpdGhDYWxsYmFjaztcblxuICB3aXRoQ2FsbGJhY2sgPSBmdW5jdGlvbiB3aXRoQ2FsbGJhY2soY2FuZGlkYXRlLCBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gYWRkSWNlQ2FuZGlkYXRlLmFwcGx5KHRoaXMsIFtjYW5kaWRhdGVdKTtcbiAgICBpZiAoIWZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIHByb21pc2UudGhlbihzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjayk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9O1xuICBwcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlID0gd2l0aENhbGxiYWNrO1xufVxuXG5mdW5jdGlvbiBzaGltR2V0VXNlck1lZGlhKHdpbmRvdykge1xuICB2YXIgbmF2aWdhdG9yID0gd2luZG93ICYmIHdpbmRvdy5uYXZpZ2F0b3I7XG5cbiAgaWYgKG5hdmlnYXRvci5tZWRpYURldmljZXMgJiYgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEpIHtcbiAgICAvLyBzaGltIG5vdCBuZWVkZWQgaW4gU2FmYXJpIDEyLjFcbiAgICB2YXIgbWVkaWFEZXZpY2VzID0gbmF2aWdhdG9yLm1lZGlhRGV2aWNlcztcbiAgICB2YXIgX2dldFVzZXJNZWRpYSA9IG1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEuYmluZChtZWRpYURldmljZXMpO1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhID0gZnVuY3Rpb24gKGNvbnN0cmFpbnRzKSB7XG4gICAgICByZXR1cm4gX2dldFVzZXJNZWRpYShzaGltQ29uc3RyYWludHMoY29uc3RyYWludHMpKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKCFuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhICYmIG5hdmlnYXRvci5tZWRpYURldmljZXMgJiYgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEpIHtcbiAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gZnVuY3Rpb24gZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzLCBjYiwgZXJyY2IpIHtcbiAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKS50aGVuKGNiLCBlcnJjYik7XG4gICAgfS5iaW5kKG5hdmlnYXRvcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2hpbUNvbnN0cmFpbnRzKGNvbnN0cmFpbnRzKSB7XG4gIGlmIChjb25zdHJhaW50cyAmJiBjb25zdHJhaW50cy52aWRlbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGNvbnN0cmFpbnRzLCB7IHZpZGVvOiB1dGlscy5jb21wYWN0T2JqZWN0KGNvbnN0cmFpbnRzLnZpZGVvKSB9KTtcbiAgfVxuXG4gIHJldHVybiBjb25zdHJhaW50cztcbn1cblxuZnVuY3Rpb24gc2hpbVJUQ0ljZVNlcnZlclVybHMod2luZG93KSB7XG4gIGlmICghd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIG1pZ3JhdGUgZnJvbSBub24tc3BlYyBSVENJY2VTZXJ2ZXIudXJsIHRvIFJUQ0ljZVNlcnZlci51cmxzXG4gIHZhciBPcmlnUGVlckNvbm5lY3Rpb24gPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb247XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiA9IGZ1bmN0aW9uIFJUQ1BlZXJDb25uZWN0aW9uKHBjQ29uZmlnLCBwY0NvbnN0cmFpbnRzKSB7XG4gICAgaWYgKHBjQ29uZmlnICYmIHBjQ29uZmlnLmljZVNlcnZlcnMpIHtcbiAgICAgIHZhciBuZXdJY2VTZXJ2ZXJzID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBjQ29uZmlnLmljZVNlcnZlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNlcnZlciA9IHBjQ29uZmlnLmljZVNlcnZlcnNbaV07XG4gICAgICAgIGlmICghc2VydmVyLmhhc093blByb3BlcnR5KCd1cmxzJykgJiYgc2VydmVyLmhhc093blByb3BlcnR5KCd1cmwnKSkge1xuICAgICAgICAgIHV0aWxzLmRlcHJlY2F0ZWQoJ1JUQ0ljZVNlcnZlci51cmwnLCAnUlRDSWNlU2VydmVyLnVybHMnKTtcbiAgICAgICAgICBzZXJ2ZXIgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHNlcnZlcikpO1xuICAgICAgICAgIHNlcnZlci51cmxzID0gc2VydmVyLnVybDtcbiAgICAgICAgICBkZWxldGUgc2VydmVyLnVybDtcbiAgICAgICAgICBuZXdJY2VTZXJ2ZXJzLnB1c2goc2VydmVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXdJY2VTZXJ2ZXJzLnB1c2gocGNDb25maWcuaWNlU2VydmVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHBjQ29uZmlnLmljZVNlcnZlcnMgPSBuZXdJY2VTZXJ2ZXJzO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IE9yaWdQZWVyQ29ubmVjdGlvbihwY0NvbmZpZywgcGNDb25zdHJhaW50cyk7XG4gIH07XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUgPSBPcmlnUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlO1xuICAvLyB3cmFwIHN0YXRpYyBtZXRob2RzLiBDdXJyZW50bHkganVzdCBnZW5lcmF0ZUNlcnRpZmljYXRlLlxuICBpZiAoJ2dlbmVyYXRlQ2VydGlmaWNhdGUnIGluIE9yaWdQZWVyQ29ubmVjdGlvbikge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24sICdnZW5lcmF0ZUNlcnRpZmljYXRlJywge1xuICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgIHJldHVybiBPcmlnUGVlckNvbm5lY3Rpb24uZ2VuZXJhdGVDZXJ0aWZpY2F0ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaGltVHJhY2tFdmVudFRyYW5zY2VpdmVyKHdpbmRvdykge1xuICAvLyBBZGQgZXZlbnQudHJhbnNjZWl2ZXIgbWVtYmVyIG92ZXIgZGVwcmVjYXRlZCBldmVudC5yZWNlaXZlclxuICBpZiAoKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHdpbmRvdykpID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDVHJhY2tFdmVudCAmJiAncmVjZWl2ZXInIGluIHdpbmRvdy5SVENUcmFja0V2ZW50LnByb3RvdHlwZSAmJiAhKCd0cmFuc2NlaXZlcicgaW4gd2luZG93LlJUQ1RyYWNrRXZlbnQucHJvdG90eXBlKSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDVHJhY2tFdmVudC5wcm90b3R5cGUsICd0cmFuc2NlaXZlcicsIHtcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4geyByZWNlaXZlcjogdGhpcy5yZWNlaXZlciB9O1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNoaW1DcmVhdGVPZmZlckxlZ2FjeSh3aW5kb3cpIHtcbiAgdmFyIG9yaWdDcmVhdGVPZmZlciA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlT2ZmZXI7XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlT2ZmZXIgPSBmdW5jdGlvbiBjcmVhdGVPZmZlcihvZmZlck9wdGlvbnMpIHtcbiAgICBpZiAob2ZmZXJPcHRpb25zKSB7XG4gICAgICBpZiAodHlwZW9mIG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZUF1ZGlvICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBzdXBwb3J0IGJpdCB2YWx1ZXNcbiAgICAgICAgb2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gPSAhIW9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZUF1ZGlvO1xuICAgICAgfVxuICAgICAgdmFyIGF1ZGlvVHJhbnNjZWl2ZXIgPSB0aGlzLmdldFRyYW5zY2VpdmVycygpLmZpbmQoZnVuY3Rpb24gKHRyYW5zY2VpdmVyKSB7XG4gICAgICAgIHJldHVybiB0cmFuc2NlaXZlci5yZWNlaXZlci50cmFjay5raW5kID09PSAnYXVkaW8nO1xuICAgICAgfSk7XG4gICAgICBpZiAob2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gPT09IGZhbHNlICYmIGF1ZGlvVHJhbnNjZWl2ZXIpIHtcbiAgICAgICAgaWYgKGF1ZGlvVHJhbnNjZWl2ZXIuZGlyZWN0aW9uID09PSAnc2VuZHJlY3YnKSB7XG4gICAgICAgICAgaWYgKGF1ZGlvVHJhbnNjZWl2ZXIuc2V0RGlyZWN0aW9uKSB7XG4gICAgICAgICAgICBhdWRpb1RyYW5zY2VpdmVyLnNldERpcmVjdGlvbignc2VuZG9ubHknKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXVkaW9UcmFuc2NlaXZlci5kaXJlY3Rpb24gPSAnc2VuZG9ubHknO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChhdWRpb1RyYW5zY2VpdmVyLmRpcmVjdGlvbiA9PT0gJ3JlY3Zvbmx5Jykge1xuICAgICAgICAgIGlmIChhdWRpb1RyYW5zY2VpdmVyLnNldERpcmVjdGlvbikge1xuICAgICAgICAgICAgYXVkaW9UcmFuc2NlaXZlci5zZXREaXJlY3Rpb24oJ2luYWN0aXZlJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF1ZGlvVHJhbnNjZWl2ZXIuZGlyZWN0aW9uID0gJ2luYWN0aXZlJztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAob2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gPT09IHRydWUgJiYgIWF1ZGlvVHJhbnNjZWl2ZXIpIHtcbiAgICAgICAgdGhpcy5hZGRUcmFuc2NlaXZlcignYXVkaW8nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gc3VwcG9ydCBiaXQgdmFsdWVzXG4gICAgICAgIG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZVZpZGVvID0gISFvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbztcbiAgICAgIH1cbiAgICAgIHZhciB2aWRlb1RyYW5zY2VpdmVyID0gdGhpcy5nZXRUcmFuc2NlaXZlcnMoKS5maW5kKGZ1bmN0aW9uICh0cmFuc2NlaXZlcikge1xuICAgICAgICByZXR1cm4gdHJhbnNjZWl2ZXIucmVjZWl2ZXIudHJhY2sua2luZCA9PT0gJ3ZpZGVvJztcbiAgICAgIH0pO1xuICAgICAgaWYgKG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZVZpZGVvID09PSBmYWxzZSAmJiB2aWRlb1RyYW5zY2VpdmVyKSB7XG4gICAgICAgIGlmICh2aWRlb1RyYW5zY2VpdmVyLmRpcmVjdGlvbiA9PT0gJ3NlbmRyZWN2Jykge1xuICAgICAgICAgIGlmICh2aWRlb1RyYW5zY2VpdmVyLnNldERpcmVjdGlvbikge1xuICAgICAgICAgICAgdmlkZW9UcmFuc2NlaXZlci5zZXREaXJlY3Rpb24oJ3NlbmRvbmx5Jyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZpZGVvVHJhbnNjZWl2ZXIuZGlyZWN0aW9uID0gJ3NlbmRvbmx5JztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodmlkZW9UcmFuc2NlaXZlci5kaXJlY3Rpb24gPT09ICdyZWN2b25seScpIHtcbiAgICAgICAgICBpZiAodmlkZW9UcmFuc2NlaXZlci5zZXREaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIHZpZGVvVHJhbnNjZWl2ZXIuc2V0RGlyZWN0aW9uKCdpbmFjdGl2ZScpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2aWRlb1RyYW5zY2VpdmVyLmRpcmVjdGlvbiA9ICdpbmFjdGl2ZSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZVZpZGVvID09PSB0cnVlICYmICF2aWRlb1RyYW5zY2VpdmVyKSB7XG4gICAgICAgIHRoaXMuYWRkVHJhbnNjZWl2ZXIoJ3ZpZGVvJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvcmlnQ3JlYXRlT2ZmZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2hpbUF1ZGlvQ29udGV4dCh3aW5kb3cpIHtcbiAgaWYgKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSAhPT0gJ29iamVjdCcgfHwgd2luZG93LkF1ZGlvQ29udGV4dCkge1xuICAgIHJldHVybjtcbiAgfVxuICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbn1cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuZXhwb3J0cy5leHRyYWN0VmVyc2lvbiA9IGV4dHJhY3RWZXJzaW9uO1xuZXhwb3J0cy53cmFwUGVlckNvbm5lY3Rpb25FdmVudCA9IHdyYXBQZWVyQ29ubmVjdGlvbkV2ZW50O1xuZXhwb3J0cy5kaXNhYmxlTG9nID0gZGlzYWJsZUxvZztcbmV4cG9ydHMuZGlzYWJsZVdhcm5pbmdzID0gZGlzYWJsZVdhcm5pbmdzO1xuZXhwb3J0cy5sb2cgPSBsb2c7XG5leHBvcnRzLmRlcHJlY2F0ZWQgPSBkZXByZWNhdGVkO1xuZXhwb3J0cy5kZXRlY3RCcm93c2VyID0gZGV0ZWN0QnJvd3NlcjtcbmV4cG9ydHMuY29tcGFjdE9iamVjdCA9IGNvbXBhY3RPYmplY3Q7XG5leHBvcnRzLndhbGtTdGF0cyA9IHdhbGtTdGF0cztcbmV4cG9ydHMuZmlsdGVyU3RhdHMgPSBmaWx0ZXJTdGF0cztcblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KG9iaiwga2V5LCB2YWx1ZSkgeyBpZiAoa2V5IGluIG9iaikgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHsgdmFsdWU6IHZhbHVlLCBlbnVtZXJhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIHdyaXRhYmxlOiB0cnVlIH0pOyB9IGVsc2UgeyBvYmpba2V5XSA9IHZhbHVlOyB9IHJldHVybiBvYmo7IH1cblxudmFyIGxvZ0Rpc2FibGVkXyA9IHRydWU7XG52YXIgZGVwcmVjYXRpb25XYXJuaW5nc18gPSB0cnVlO1xuXG4vKipcbiAqIEV4dHJhY3QgYnJvd3NlciB2ZXJzaW9uIG91dCBvZiB0aGUgcHJvdmlkZWQgdXNlciBhZ2VudCBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHshc3RyaW5nfSB1YXN0cmluZyB1c2VyQWdlbnQgc3RyaW5nLlxuICogQHBhcmFtIHshc3RyaW5nfSBleHByIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIGFzIG1hdGNoIGNyaXRlcmlhLlxuICogQHBhcmFtIHshbnVtYmVyfSBwb3MgcG9zaXRpb24gaW4gdGhlIHZlcnNpb24gc3RyaW5nIHRvIGJlIHJldHVybmVkLlxuICogQHJldHVybiB7IW51bWJlcn0gYnJvd3NlciB2ZXJzaW9uLlxuICovXG5mdW5jdGlvbiBleHRyYWN0VmVyc2lvbih1YXN0cmluZywgZXhwciwgcG9zKSB7XG4gIHZhciBtYXRjaCA9IHVhc3RyaW5nLm1hdGNoKGV4cHIpO1xuICByZXR1cm4gbWF0Y2ggJiYgbWF0Y2gubGVuZ3RoID49IHBvcyAmJiBwYXJzZUludChtYXRjaFtwb3NdLCAxMCk7XG59XG5cbi8vIFdyYXBzIHRoZSBwZWVyY29ubmVjdGlvbiBldmVudCBldmVudE5hbWVUb1dyYXAgaW4gYSBmdW5jdGlvblxuLy8gd2hpY2ggcmV0dXJucyB0aGUgbW9kaWZpZWQgZXZlbnQgb2JqZWN0IChvciBmYWxzZSB0byBwcmV2ZW50XG4vLyB0aGUgZXZlbnQpLlxuZnVuY3Rpb24gd3JhcFBlZXJDb25uZWN0aW9uRXZlbnQod2luZG93LCBldmVudE5hbWVUb1dyYXAsIHdyYXBwZXIpIHtcbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHByb3RvID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZTtcbiAgdmFyIG5hdGl2ZUFkZEV2ZW50TGlzdGVuZXIgPSBwcm90by5hZGRFdmVudExpc3RlbmVyO1xuICBwcm90by5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gKG5hdGl2ZUV2ZW50TmFtZSwgY2IpIHtcbiAgICBpZiAobmF0aXZlRXZlbnROYW1lICE9PSBldmVudE5hbWVUb1dyYXApIHtcbiAgICAgIHJldHVybiBuYXRpdmVBZGRFdmVudExpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIHZhciB3cmFwcGVkQ2FsbGJhY2sgPSBmdW5jdGlvbiB3cmFwcGVkQ2FsbGJhY2soZSkge1xuICAgICAgdmFyIG1vZGlmaWVkRXZlbnQgPSB3cmFwcGVyKGUpO1xuICAgICAgaWYgKG1vZGlmaWVkRXZlbnQpIHtcbiAgICAgICAgaWYgKGNiLmhhbmRsZUV2ZW50KSB7XG4gICAgICAgICAgY2IuaGFuZGxlRXZlbnQobW9kaWZpZWRFdmVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2IobW9kaWZpZWRFdmVudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuX2V2ZW50TWFwID0gdGhpcy5fZXZlbnRNYXAgfHwge307XG4gICAgaWYgKCF0aGlzLl9ldmVudE1hcFtldmVudE5hbWVUb1dyYXBdKSB7XG4gICAgICB0aGlzLl9ldmVudE1hcFtldmVudE5hbWVUb1dyYXBdID0gbmV3IE1hcCgpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudE1hcFtldmVudE5hbWVUb1dyYXBdLnNldChjYiwgd3JhcHBlZENhbGxiYWNrKTtcbiAgICByZXR1cm4gbmF0aXZlQWRkRXZlbnRMaXN0ZW5lci5hcHBseSh0aGlzLCBbbmF0aXZlRXZlbnROYW1lLCB3cmFwcGVkQ2FsbGJhY2tdKTtcbiAgfTtcblxuICB2YXIgbmF0aXZlUmVtb3ZlRXZlbnRMaXN0ZW5lciA9IHByb3RvLnJlbW92ZUV2ZW50TGlzdGVuZXI7XG4gIHByb3RvLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiAobmF0aXZlRXZlbnROYW1lLCBjYikge1xuICAgIGlmIChuYXRpdmVFdmVudE5hbWUgIT09IGV2ZW50TmFtZVRvV3JhcCB8fCAhdGhpcy5fZXZlbnRNYXAgfHwgIXRoaXMuX2V2ZW50TWFwW2V2ZW50TmFtZVRvV3JhcF0pIHtcbiAgICAgIHJldHVybiBuYXRpdmVSZW1vdmVFdmVudExpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGlmICghdGhpcy5fZXZlbnRNYXBbZXZlbnROYW1lVG9XcmFwXS5oYXMoY2IpKSB7XG4gICAgICByZXR1cm4gbmF0aXZlUmVtb3ZlRXZlbnRMaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICB2YXIgdW53cmFwcGVkQ2IgPSB0aGlzLl9ldmVudE1hcFtldmVudE5hbWVUb1dyYXBdLmdldChjYik7XG4gICAgdGhpcy5fZXZlbnRNYXBbZXZlbnROYW1lVG9XcmFwXS5kZWxldGUoY2IpO1xuICAgIGlmICh0aGlzLl9ldmVudE1hcFtldmVudE5hbWVUb1dyYXBdLnNpemUgPT09IDApIHtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudE1hcFtldmVudE5hbWVUb1dyYXBdO1xuICAgIH1cbiAgICBpZiAoT2JqZWN0LmtleXModGhpcy5fZXZlbnRNYXApLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50TWFwO1xuICAgIH1cbiAgICByZXR1cm4gbmF0aXZlUmVtb3ZlRXZlbnRMaXN0ZW5lci5hcHBseSh0aGlzLCBbbmF0aXZlRXZlbnROYW1lLCB1bndyYXBwZWRDYl0pO1xuICB9O1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ29uJyArIGV2ZW50TmFtZVRvV3JhcCwge1xuICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgcmV0dXJuIHRoaXNbJ19vbicgKyBldmVudE5hbWVUb1dyYXBdO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbiBzZXQoY2IpIHtcbiAgICAgIGlmICh0aGlzWydfb24nICsgZXZlbnROYW1lVG9XcmFwXSkge1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lVG9XcmFwLCB0aGlzWydfb24nICsgZXZlbnROYW1lVG9XcmFwXSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzWydfb24nICsgZXZlbnROYW1lVG9XcmFwXTtcbiAgICAgIH1cbiAgICAgIGlmIChjYikge1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lVG9XcmFwLCB0aGlzWydfb24nICsgZXZlbnROYW1lVG9XcmFwXSA9IGNiKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGRpc2FibGVMb2coYm9vbCkge1xuICBpZiAodHlwZW9mIGJvb2wgIT09ICdib29sZWFuJykge1xuICAgIHJldHVybiBuZXcgRXJyb3IoJ0FyZ3VtZW50IHR5cGU6ICcgKyAodHlwZW9mIGJvb2wgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGJvb2wpKSArICcuIFBsZWFzZSB1c2UgYSBib29sZWFuLicpO1xuICB9XG4gIGxvZ0Rpc2FibGVkXyA9IGJvb2w7XG4gIHJldHVybiBib29sID8gJ2FkYXB0ZXIuanMgbG9nZ2luZyBkaXNhYmxlZCcgOiAnYWRhcHRlci5qcyBsb2dnaW5nIGVuYWJsZWQnO1xufVxuXG4vKipcbiAqIERpc2FibGUgb3IgZW5hYmxlIGRlcHJlY2F0aW9uIHdhcm5pbmdzXG4gKiBAcGFyYW0geyFib29sZWFufSBib29sIHNldCB0byB0cnVlIHRvIGRpc2FibGUgd2FybmluZ3MuXG4gKi9cbmZ1bmN0aW9uIGRpc2FibGVXYXJuaW5ncyhib29sKSB7XG4gIGlmICh0eXBlb2YgYm9vbCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgcmV0dXJuIG5ldyBFcnJvcignQXJndW1lbnQgdHlwZTogJyArICh0eXBlb2YgYm9vbCA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoYm9vbCkpICsgJy4gUGxlYXNlIHVzZSBhIGJvb2xlYW4uJyk7XG4gIH1cbiAgZGVwcmVjYXRpb25XYXJuaW5nc18gPSAhYm9vbDtcbiAgcmV0dXJuICdhZGFwdGVyLmpzIGRlcHJlY2F0aW9uIHdhcm5pbmdzICcgKyAoYm9vbCA/ICdkaXNhYmxlZCcgOiAnZW5hYmxlZCcpO1xufVxuXG5mdW5jdGlvbiBsb2coKSB7XG4gIGlmICgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgPT09ICdvYmplY3QnKSB7XG4gICAgaWYgKGxvZ0Rpc2FibGVkXykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBjb25zb2xlLmxvZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBTaG93cyBhIGRlcHJlY2F0aW9uIHdhcm5pbmcgc3VnZ2VzdGluZyB0aGUgbW9kZXJuIGFuZCBzcGVjLWNvbXBhdGlibGUgQVBJLlxuICovXG5mdW5jdGlvbiBkZXByZWNhdGVkKG9sZE1ldGhvZCwgbmV3TWV0aG9kKSB7XG4gIGlmICghZGVwcmVjYXRpb25XYXJuaW5nc18pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc29sZS53YXJuKG9sZE1ldGhvZCArICcgaXMgZGVwcmVjYXRlZCwgcGxlYXNlIHVzZSAnICsgbmV3TWV0aG9kICsgJyBpbnN0ZWFkLicpO1xufVxuXG4vKipcbiAqIEJyb3dzZXIgZGV0ZWN0b3IuXG4gKlxuICogQHJldHVybiB7b2JqZWN0fSByZXN1bHQgY29udGFpbmluZyBicm93c2VyIGFuZCB2ZXJzaW9uXG4gKiAgICAgcHJvcGVydGllcy5cbiAqL1xuZnVuY3Rpb24gZGV0ZWN0QnJvd3Nlcih3aW5kb3cpIHtcbiAgLy8gUmV0dXJuZWQgcmVzdWx0IG9iamVjdC5cbiAgdmFyIHJlc3VsdCA9IHsgYnJvd3NlcjogbnVsbCwgdmVyc2lvbjogbnVsbCB9O1xuXG4gIC8vIEZhaWwgZWFybHkgaWYgaXQncyBub3QgYSBicm93c2VyXG4gIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyB8fCAhd2luZG93Lm5hdmlnYXRvcikge1xuICAgIHJlc3VsdC5icm93c2VyID0gJ05vdCBhIGJyb3dzZXIuJztcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XG5cblxuICBpZiAobmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSkge1xuICAgIC8vIEZpcmVmb3guXG4gICAgcmVzdWx0LmJyb3dzZXIgPSAnZmlyZWZveCc7XG4gICAgcmVzdWx0LnZlcnNpb24gPSBleHRyYWN0VmVyc2lvbihuYXZpZ2F0b3IudXNlckFnZW50LCAvRmlyZWZveFxcLyhcXGQrKVxcLi8sIDEpO1xuICB9IGVsc2UgaWYgKG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHwgd2luZG93LmlzU2VjdXJlQ29udGV4dCA9PT0gZmFsc2UgJiYgd2luZG93LndlYmtpdFJUQ1BlZXJDb25uZWN0aW9uICYmICF3aW5kb3cuUlRDSWNlR2F0aGVyZXIpIHtcbiAgICAvLyBDaHJvbWUsIENocm9taXVtLCBXZWJ2aWV3LCBPcGVyYS5cbiAgICAvLyBWZXJzaW9uIG1hdGNoZXMgQ2hyb21lL1dlYlJUQyB2ZXJzaW9uLlxuICAgIC8vIENocm9tZSA3NCByZW1vdmVkIHdlYmtpdEdldFVzZXJNZWRpYSBvbiBodHRwIGFzIHdlbGwgc28gd2UgbmVlZCB0aGVcbiAgICAvLyBtb3JlIGNvbXBsaWNhdGVkIGZhbGxiYWNrIHRvIHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uLlxuICAgIHJlc3VsdC5icm93c2VyID0gJ2Nocm9tZSc7XG4gICAgcmVzdWx0LnZlcnNpb24gPSBleHRyYWN0VmVyc2lvbihuYXZpZ2F0b3IudXNlckFnZW50LCAvQ2hyb20oZXxpdW0pXFwvKFxcZCspXFwuLywgMik7XG4gIH0gZWxzZSBpZiAobmF2aWdhdG9yLm1lZGlhRGV2aWNlcyAmJiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9FZGdlXFwvKFxcZCspLihcXGQrKSQvKSkge1xuICAgIC8vIEVkZ2UuXG4gICAgcmVzdWx0LmJyb3dzZXIgPSAnZWRnZSc7XG4gICAgcmVzdWx0LnZlcnNpb24gPSBleHRyYWN0VmVyc2lvbihuYXZpZ2F0b3IudXNlckFnZW50LCAvRWRnZVxcLyhcXGQrKS4oXFxkKykkLywgMik7XG4gIH0gZWxzZSBpZiAod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uICYmIG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0FwcGxlV2ViS2l0XFwvKFxcZCspXFwuLykpIHtcbiAgICAvLyBTYWZhcmkuXG4gICAgcmVzdWx0LmJyb3dzZXIgPSAnc2FmYXJpJztcbiAgICByZXN1bHQudmVyc2lvbiA9IGV4dHJhY3RWZXJzaW9uKG5hdmlnYXRvci51c2VyQWdlbnQsIC9BcHBsZVdlYktpdFxcLyhcXGQrKVxcLi8sIDEpO1xuICAgIHJlc3VsdC5zdXBwb3J0c1VuaWZpZWRQbGFuID0gd2luZG93LlJUQ1J0cFRyYW5zY2VpdmVyICYmICdjdXJyZW50RGlyZWN0aW9uJyBpbiB3aW5kb3cuUlRDUnRwVHJhbnNjZWl2ZXIucHJvdG90eXBlO1xuICB9IGVsc2Uge1xuICAgIC8vIERlZmF1bHQgZmFsbHRocm91Z2g6IG5vdCBzdXBwb3J0ZWQuXG4gICAgcmVzdWx0LmJyb3dzZXIgPSAnTm90IGEgc3VwcG9ydGVkIGJyb3dzZXIuJztcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgc29tZXRoaW5nIGlzIGFuIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbCBUaGUgc29tZXRoaW5nIHlvdSB3YW50IHRvIGNoZWNrLlxuICogQHJldHVybiB0cnVlIGlmIHZhbCBpcyBhbiBvYmplY3QsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgT2JqZWN0XSc7XG59XG5cbi8qKlxuICogUmVtb3ZlIGFsbCBlbXB0eSBvYmplY3RzIGFuZCB1bmRlZmluZWQgdmFsdWVzXG4gKiBmcm9tIGEgbmVzdGVkIG9iamVjdCAtLSBhbiBlbmhhbmNlZCBhbmQgdmFuaWxsYSB2ZXJzaW9uXG4gKiBvZiBMb2Rhc2gncyBgY29tcGFjdGAuXG4gKi9cbmZ1bmN0aW9uIGNvbXBhY3RPYmplY3QoZGF0YSkge1xuICBpZiAoIWlzT2JqZWN0KGRhdGEpKSB7XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkucmVkdWNlKGZ1bmN0aW9uIChhY2N1bXVsYXRvciwga2V5KSB7XG4gICAgdmFyIGlzT2JqID0gaXNPYmplY3QoZGF0YVtrZXldKTtcbiAgICB2YXIgdmFsdWUgPSBpc09iaiA/IGNvbXBhY3RPYmplY3QoZGF0YVtrZXldKSA6IGRhdGFba2V5XTtcbiAgICB2YXIgaXNFbXB0eU9iamVjdCA9IGlzT2JqICYmICFPYmplY3Qua2V5cyh2YWx1ZSkubGVuZ3RoO1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IGlzRW1wdHlPYmplY3QpIHtcbiAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oYWNjdW11bGF0b3IsIF9kZWZpbmVQcm9wZXJ0eSh7fSwga2V5LCB2YWx1ZSkpO1xuICB9LCB7fSk7XG59XG5cbi8qIGl0ZXJhdGVzIHRoZSBzdGF0cyBncmFwaCByZWN1cnNpdmVseS4gKi9cbmZ1bmN0aW9uIHdhbGtTdGF0cyhzdGF0cywgYmFzZSwgcmVzdWx0U2V0KSB7XG4gIGlmICghYmFzZSB8fCByZXN1bHRTZXQuaGFzKGJhc2UuaWQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHJlc3VsdFNldC5zZXQoYmFzZS5pZCwgYmFzZSk7XG4gIE9iamVjdC5rZXlzKGJhc2UpLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAobmFtZS5lbmRzV2l0aCgnSWQnKSkge1xuICAgICAgd2Fsa1N0YXRzKHN0YXRzLCBzdGF0cy5nZXQoYmFzZVtuYW1lXSksIHJlc3VsdFNldCk7XG4gICAgfSBlbHNlIGlmIChuYW1lLmVuZHNXaXRoKCdJZHMnKSkge1xuICAgICAgYmFzZVtuYW1lXS5mb3JFYWNoKGZ1bmN0aW9uIChpZCkge1xuICAgICAgICB3YWxrU3RhdHMoc3RhdHMsIHN0YXRzLmdldChpZCksIHJlc3VsdFNldCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKiBmaWx0ZXIgZ2V0U3RhdHMgZm9yIGEgc2VuZGVyL3JlY2VpdmVyIHRyYWNrLiAqL1xuZnVuY3Rpb24gZmlsdGVyU3RhdHMocmVzdWx0LCB0cmFjaywgb3V0Ym91bmQpIHtcbiAgdmFyIHN0cmVhbVN0YXRzVHlwZSA9IG91dGJvdW5kID8gJ291dGJvdW5kLXJ0cCcgOiAnaW5ib3VuZC1ydHAnO1xuICB2YXIgZmlsdGVyZWRSZXN1bHQgPSBuZXcgTWFwKCk7XG4gIGlmICh0cmFjayA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmaWx0ZXJlZFJlc3VsdDtcbiAgfVxuICB2YXIgdHJhY2tTdGF0cyA9IFtdO1xuICByZXN1bHQuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodmFsdWUudHlwZSA9PT0gJ3RyYWNrJyAmJiB2YWx1ZS50cmFja0lkZW50aWZpZXIgPT09IHRyYWNrLmlkKSB7XG4gICAgICB0cmFja1N0YXRzLnB1c2godmFsdWUpO1xuICAgIH1cbiAgfSk7XG4gIHRyYWNrU3RhdHMuZm9yRWFjaChmdW5jdGlvbiAodHJhY2tTdGF0KSB7XG4gICAgcmVzdWx0LmZvckVhY2goZnVuY3Rpb24gKHN0YXRzKSB7XG4gICAgICBpZiAoc3RhdHMudHlwZSA9PT0gc3RyZWFtU3RhdHNUeXBlICYmIHN0YXRzLnRyYWNrSWQgPT09IHRyYWNrU3RhdC5pZCkge1xuICAgICAgICB3YWxrU3RhdHMocmVzdWx0LCBzdGF0cywgZmlsdGVyZWRSZXN1bHQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIGZpbHRlcmVkUmVzdWx0O1xufVxuIiwiY29uc3QgYXBpID0gcmVxdWlyZSgnamFudXMtdmlkZW9yb29tLWFwaScpO1xyXG5cclxuY29uc3QgSkFOVVNfQ09ORklHID0ge1xyXG4gIHVybDogJyVKQU5VU19VUkwlJyxcclxuICBrZWVwQWxpdmVJbnRlcnZhbE1zOiAzMDAwMCxcclxuICBvcHRpb25zOiB7XHJcbiAgICByZWplY3RVbmF1dGhvcml6ZWQ6IGZhbHNlXHJcbiAgfSxcclxuXHJcbiAgY29kZWM6ICd2cDgsdnA5LGgyNjQnLFxyXG4gIHZpZGVvT3JpZW50RXh0OiBmYWxzZSxcclxuXHJcbiAgYml0cmF0ZTogNzc0MTQ0LCAgLy9tYXggdmlkZW8gYml0cmF0ZSBmb3Igc2VuZGVycyAoZS5nLjEyODAwMClcclxuICBmaXJTZWNvbmRzOiAxMCxcclxuICBwdWJsaXNoZXJzOiAyMCwgICAvL21heCBudW1iZXIgb2YgY29uY3VycmVudCBzZW5kZXJzIChlLmcuLCA2IGZvciBhIHZpZGVvIGNvbmZlcmVuY2Ugb3IgMSBmb3IgYSB3ZWJpbmFyKVxyXG4gIHJlY29yZERpcmVjdG9yeTogJyVSRUNPUkRTX0RJUkVDVE9SWSUnLFxyXG5cclxuICBmaWx0ZXJEaXJlY3RDYW5kaWRhdGVzOiB0cnVlLFxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgamFudXM6IG5ldyBhcGkuSmFudXNDb25maWcoSkFOVVNfQ09ORklHKSxcclxuICByb29tOiBuZXcgYXBpLkphbnVzUm9vbUNvbmZpZyhKQU5VU19DT05GSUcpLFxyXG5cclxuICBpY2U6IHtcclxuICAgIGljZVNlcnZlcnM6IFtcclxuICAgICAgeyB1cmxzOiAnc3R1bjolQ09UVVJOX1VSTCUnIH0sXHJcbiAgICAgIHtcclxuICAgICAgICAgdXJsczogJ3R1cm46JUNPVFVSTl9VUkwlJyxcclxuICAgICAgICAgdXNlcm5hbWU6ICclQ09UVVJOX1VTRVJOQU1FJScsXHJcbiAgICAgICAgIGNyZWRlbnRpYWw6ICclQ09UVVJOX1BBU1NXT1JEJSdcclxuICAgICAgfSxcclxuICAgIF1cclxuICB9LFxyXG5cclxuICBnYXRoZXJlcjoge1xyXG4gICAgdXJsOiAnJUdBVEhFUkVSX1VSTCUnLFxyXG4gICAgcmVwb3J0aW5nSW50ZXJ2YWw6ICclU0VORF9NRVRSSUNTX0lOVEVSVkFMJScsICAgICAgLy91bml0ID0gMC4xc1xyXG4gICAgY29ubmVjdGlvbkludGVydmFsOiAnJUNPTk5FQ1RfR0FUSEVSRVJfSU5URVJWQUwlJywgLy91bml0ID0gMS4wc1xyXG4gIH0sXHJcblxyXG4gIG1vZGVyYXRvcjoge1xyXG4gICAgdXJsOiAnJU1PREVSQVRPUl9VUkwlJyxcclxuICAgIGNvbm5lY3Rpb25JbnRlcnZhbDogJyVDT05ORUNUX01PREVSQVRPUl9JTlRFUlZBTCUnLCAvL3VuaXQgPSAxLjBzXHJcbiAgfVxyXG59OyIsImNvbnN0IGFwaSA9IHJlcXVpcmUoJ2phbnVzLXZpZGVvcm9vbS1hcGknKTtcclxuY29uc3QgbW9kZXJhdG9yID0gcmVxdWlyZSgnLi4vc2VydmljZS9tb2RlcmF0b3InKTtcclxuY29uc3QgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XHJcbmNvbnN0IGxpbmtzID0gcmVxdWlyZSgnLi4vbGlua3MnKTtcclxuXHJcbmNvbnN0IGFkYXB0ZXIgPSByZXF1aXJlKCd3ZWJydGMtYWRhcHRlcicpO1xyXG5cclxubGV0IHJvb21BZG1pbkFwaSA9IHVuZGVmaW5lZDtcclxuXHJcbndpbmRvdy5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICBjb25zdCB2aWV3Q3JlYXRlUm9vbURlc2NyaXB0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjcmVhdGVSb29tRGVzY3JpcHRpb25cIik7XHJcbiAgICBjb25zdCB2aWV3Q3JlYXRlUm9vbVJlY29yZGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlUm9vbVJlY29yZGluZ1wiKTtcclxuICAgIGNvbnN0IHZpZXdDcmVhdGVSb29tSGlkZGVuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjcmVhdGVSb29tSGlkZGVuXCIpO1xyXG4gICAgY29uc3Qgdmlld0NyZWF0ZVJvb21IaWRlUGluID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjcmVhdGVSb29tSGlkZVBpblwiKTtcclxuICAgIGNvbnN0IHZpZXdDcmVhdGVSb29tU2VjcmV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjcmVhdGVSb29tU2VjcmV0XCIpO1xyXG4gICAgY29uc3Qgdmlld0NyZWF0ZVJvb21QaW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNyZWF0ZVJvb21QaW5cIik7XHJcbiAgICBjb25zdCB2aWV3Q3JlYXRlQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjcmVhdGVcIik7XHJcbiAgICBjb25zdCB2aWV3Q3JlYXRlZE1lc3NhZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNyZWF0ZWRNZXNzYWdlXCIpO1xyXG5cclxuICAgIGNvbnN0IHZpZXdEZWxldGVSb29tSWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRlbGV0ZVJvb21JZFwiKTtcclxuICAgIGNvbnN0IHZpZXdEZWxldGVSb29tU2VjcmV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkZWxldGVSb29tU2VjcmV0XCIpO1xyXG4gICAgY29uc3Qgdmlld0RlbGV0ZWRNZXNzYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkZWxldGVkTWVzc2FnZVwiKTtcclxuICAgIGNvbnN0IHZpZXdEZWxldGVCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRlbGV0ZVwiKTtcclxuXHJcbiAgICB2aWV3Q3JlYXRlQnV0dG9uLm9uY2xpY2sgPSBjcmVhdGU7XHJcbiAgICB2aWV3RGVsZXRlQnV0dG9uLm9uY2xpY2sgPSBkZXN0cm95O1xyXG5cclxuICAgIChuZXcgYXBpLkphbnVzKGNvbmZpZy5qYW51cywgY29uc29sZSkpLmNvbm5lY3QoKVxyXG4gICAgICAgIC50aGVuKChqYW51cykgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkphbnVzIGNvbm5lY3RlZDpcIiwgamFudXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gamFudXMuYWRkUGx1Z2luKG5ldyBhcGkuVmlkZW9Sb29tQWRtaW4oY29uZmlnLnJvb20sIGNvbnNvbGUpKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oKGF0dGFjaGVkQXBpKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcm9vbUFkbWluQXBpID0gYXR0YWNoZWRBcGk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJWaWRlb1Jvb21BZG1pbiBwbHVnaW4gYXR0YWNoZWQ6XCIsIHJvb21BZG1pbkFwaSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBjcmVhdGUoKSB7XHJcbiAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSB2aWV3Q3JlYXRlUm9vbURlc2NyaXB0aW9uLnZhbHVlO1xyXG4gICAgICAgIGNvbnN0IHJlY29yZGluZyA9IHZpZXdDcmVhdGVSb29tUmVjb3JkaW5nLmNoZWNrZWQ7XHJcbiAgICAgICAgY29uc3QgaGlkZGVuID0gdmlld0NyZWF0ZVJvb21IaWRkZW4uY2hlY2tlZDtcclxuICAgICAgICBjb25zdCBzZWNyZXQgPSB2aWV3Q3JlYXRlUm9vbVNlY3JldC52YWx1ZTtcclxuICAgICAgICBjb25zdCBwaW4gPSB2aWV3Q3JlYXRlUm9vbVBpbi52YWx1ZTtcclxuXHJcbiAgICAgICAgY29uc3Qgcm9vbUlkID0gYXdhaXQgcm9vbUFkbWluQXBpLmNyZWF0ZVJvb20oZGVzY3JpcHRpb24sIGhpZGRlbiwgcmVjb3JkaW5nLCBwaW4sIHNlY3JldCk7XHJcbiAgICAgICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xyXG4gICAgICAgIGxpbmsuaW5uZXJUZXh0ID0gYFJvb20gJHtyb29tSWR9YDtcclxuXHJcbiAgICAgICAgaWYgKHZpZXdDcmVhdGVSb29tSGlkZVBpbi5jaGVja2VkKSB7XHJcbiAgICAgICAgICAgIGxpbmsuaHJlZiA9IGxpbmtzLnJvb21Vcmwocm9vbUlkKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsaW5rLmhyZWYgPSBsaW5rcy5yb29tVXJsKHJvb21JZCwgcGluKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZpZXdDcmVhdGVkTWVzc2FnZS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgICAgIHZpZXdDcmVhdGVkTWVzc2FnZS5hcHBlbmRDaGlsZChsaW5rKTtcclxuICAgICAgICB2aWV3Q3JlYXRlZE1lc3NhZ2UuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJSb29tIGNyZWF0ZWRcIiwgcm9vbUlkKTtcclxuXHJcbiAgICAgICAgbW9kZXJhdG9yLm9uZXNob3QoKHNvY2tldCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjb21tYW5kID0ge1xyXG4gICAgICAgICAgICAgICAgXCJyb29tSWRcIjogcm9vbUlkLFxyXG4gICAgICAgICAgICAgICAgXCJvcGVyYXRpb25cIjoge1xyXG4gICAgICAgICAgICAgICAgICAgIFwicmVnaXN0ZXJTZWNyZXRcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcInNlY3JldFwiOiBzZWNyZXRcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeShjb21tYW5kKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gZGVzdHJveSgpIHtcclxuICAgICAgICBjb25zdCBpZCA9IE51bWJlcih2aWV3RGVsZXRlUm9vbUlkLnZhbHVlKTtcclxuICAgICAgICBjb25zdCBzZWNyZXQgPSB2aWV3RGVsZXRlUm9vbVNlY3JldC52YWx1ZTtcclxuICAgICAgICBjb25zdCBkZWxldGVkID0gYXdhaXQgcm9vbUFkbWluQXBpLmRlc3Ryb3lSb29tKGlkLCBzZWNyZXQpO1xyXG4gICAgICAgIHZpZXdEZWxldGVkTWVzc2FnZS5pbm5lclRleHQgPSBgRGVsZXRlZCByb29tICR7aWR9YDtcclxuICAgICAgICB2aWV3RGVsZXRlZE1lc3NhZ2UuaGlkZGVuID0gZmFsc2U7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJSb29tIGRlbGV0ZWRcIiwgZGVsZXRlZCk7XHJcblxyXG4gICAgICAgIC8vdG9kbzogZGVzdHJveSBzdWItcm9vbXNcclxuICAgIH1cclxufTtcclxuIiwiY29uc3Qgcm9vbUlkUGFyYW0gPSBcImlkXCI7XHJcbmNvbnN0IHJvb21QaW5QYXJhbSA9IFwicGluXCI7XHJcbmNvbnN0IHJvb21TZWNyZXRQYXJhbSA9IFwic2VjcmV0XCI7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIHJvb21VcmwsXHJcbiAgICByb29tSWRQYXJhbSxcclxuICAgIHJvb21QaW5QYXJhbSxcclxuICAgIHJvb21TZWNyZXRQYXJhbSxcclxufTtcclxuXHJcbmZ1bmN0aW9uIGJhc2VVcmwoKSB7XHJcbiAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uLnRvU3RyaW5nKClcclxuICAgICAgICAucmVwbGFjZSgvYWRtaW4uKi8sIFwiXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByb29tVXJsKGlkLCBwaW4pIHtcclxuICAgIGxldCBsaW5rID0gYmFzZVVybCgpICsgXCI/XCI7XHJcblxyXG4gICAgaWYgKCFpZCB8fCBpZCA9PT0gXCJcIikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJDYW4ndCBjb25zdHJ1Y3QgbGluayBmb3IgYSByb29tIHdpdGhvdXQgaWRcIik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgbGluayA9IGxpbmsgKyBgaWQ9JHtpZH1gO1xyXG5cclxuICAgIGlmICghcGluIHx8IHBpbiA9PT0gXCJcIikge1xyXG4gICAgICAgIHJldHVybiBsaW5rO1xyXG4gICAgfVxyXG4gICAgbGluayA9IGxpbmsgKyBgJnBpbj0ke3Bpbn1gO1xyXG5cclxuICAgIHJldHVybiBsaW5rO1xyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdGlhbGl6ZSxcclxuICAgIGFwcGVuZE1lc3NhZ2UsXHJcbn07XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplKHB1Ymxpc2hlcikge1xyXG4gICAgY29uc29sZS5sb2coXCJJbml0aWFsaXppbmcgdGhlIGNoYXRcIik7XHJcblxyXG4gICAgbGV0IG1lc3NhZ2VJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidGV4dE1lc3NhZ2VJbnB1dFwiKTtcclxuICAgIGxldCBzZW5kQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzZW5kVGV4dE1lc3NhZ2VcIik7XHJcblxyXG4gICAgbGV0IGlucHV0RmluaXNoZWQgPSAoKSA9PiB7XHJcbiAgICAgICAgc2VuZFRleHRNZXNzYWdlKHB1Ymxpc2hlciwgbWVzc2FnZUlucHV0LnZhbHVlKTtcclxuICAgICAgICBtZXNzYWdlSW5wdXQudmFsdWUgPSAnJztcclxuICAgIH07XHJcblxyXG4gICAgc2VuZEJ1dHRvbi5vbmNsaWNrID0gaW5wdXRGaW5pc2hlZDtcclxuICAgIG1lc3NhZ2VJbnB1dC5vbmtleXByZXNzID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gXCJFbnRlclwiKSB7XHJcbiAgICAgICAgICAgIGlucHV0RmluaXNoZWQoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBhcHBlbmRNZXNzYWdlKG1lc3NhZ2UpIHtcclxuICAgIGxldCBtZXNzYWdlc0hpc3RvcnkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1lc3NhZ2VzSGlzdG9yeVwiKTtcclxuICAgIGxldCB0ZXh0ID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobWVzc2FnZSk7XHJcbiAgICBsZXQgbGlzdEl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgbGlzdEl0ZW0uYXBwZW5kQ2hpbGQodGV4dCk7XHJcbiAgICBtZXNzYWdlc0hpc3RvcnkuYXBwZW5kQ2hpbGQobGlzdEl0ZW0pO1xyXG4gICAgbWVzc2FnZXNIaXN0b3J5LnNjcm9sbFRvcCA9IG1lc3NhZ2VzSGlzdG9yeS5zY3JvbGxIZWlnaHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlbmRUZXh0TWVzc2FnZShwdWJsaXNoZXIsIHRleHQpIHtcclxuICAgIGlmICh0ZXh0ID09PSBcIlwiKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBtZXNzYWdlID0gd3JhcFdpdGhEYXRlKHB1Ymxpc2hlci5kaXNwbGF5TmFtZSwgdGV4dCk7XHJcbiAgICBwdWJsaXNoZXIuc2VuZERhdGEobWVzc2FnZSk7XHJcbiAgICBhcHBlbmRNZXNzYWdlKG1lc3NhZ2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB3cmFwV2l0aERhdGUoZGlzcGxheU5hbWUsIHRleHQpIHtcclxuICAgIGxldCBkYXRlID0gbmV3IERhdGUoKTtcclxuICAgIGxldCBob3VycyA9IGRhdGUuZ2V0SG91cnMoKTtcclxuICAgIGxldCBtaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCcwJyk7XHJcbiAgICBsZXQgc2Vjb25kcyA9IGRhdGUuZ2V0U2Vjb25kcygpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwnMCcpO1xyXG5cclxuICAgIHJldHVybiBgJHtob3Vyc306JHttaW51dGVzfToke3NlY29uZHN9IDwke2Rpc3BsYXlOYW1lfT46ICR7dGV4dH1gO1xyXG59IiwiY29uc3QgbWVkaWEgPSByZXF1aXJlKCcuL21lZGlhJyk7XHJcbmNvbnN0IGluYm91bmQgPSByZXF1aXJlKCcuL2luYm91bmQnKTtcclxuY29uc3QgaG9zdCA9IHJlcXVpcmUoJy4vaG9zdC9ob3N0Jyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIGluaXRpYWxpemUsXHJcbiAgICB1cGRhdGVPdXRib3VuZCxcclxuICAgIHVwZGF0ZUluYm91bmQsXHJcbiAgICByZW1vdmVJbmJvdW5kLFxyXG4gICAgY2xlYXJJbmJvdW5kLFxyXG4gICAgbWVtYmVyRGlzcGxheWVkXHJcbn07XHJcblxyXG5jb25zdCBpbmJvdW5kRGlzcGxheUJ5TWVtYmVyID0gbmV3IE1hcCgpO1xyXG5cclxubGV0IGluYm91bmREaXNwbGF5c0dyaWQ7XHJcbmxldCBvdXRib3VuZERpc3BsYXk7XHJcbmxldCBwdWJsaXNoZXI7XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplKG91dGJvdW5kUHVibGlzaGVyKSB7XHJcbiAgICBwdWJsaXNoZXIgPSBvdXRib3VuZFB1Ymxpc2hlcjtcclxuICAgIG91dGJvdW5kRGlzcGxheSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwib3V0Ym91bmREaXNwbGF5XCIpO1xyXG4gICAgaW5ib3VuZERpc3BsYXlzR3JpZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5ib3VuZERpc3BsYXlzR3JpZFwiKTtcclxuXHJcbiAgICBzZXRHcmlkV2lkdGgoMik7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdyaWRXaWRlclwiKS5vbmNsaWNrID0gbWFrZUdyaWRXaWRlcjtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ3JpZE5hcnJvd2VyXCIpLm9uY2xpY2sgPSBtYWtlR3JpZE5hcnJvd2VyO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVPdXRib3VuZChzdHJlYW0pIHtcclxuICAgIGNvbnNvbGUubG9nKGBEaXNwbGF5aW5nIGxvY2FsIHBhcnRpY2lwYW50YCk7XHJcbiAgICBjb25zdCBsYWJlbCA9IHB1Ymxpc2hlci5kaXNwbGF5TmFtZSArIFwiIChtZSlcIjtcclxuXHJcbiAgICBvdXRib3VuZERpc3BsYXkuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgIHJldHVybiBkaXNwbGF5KG91dGJvdW5kRGlzcGxheSwgc3RyZWFtLCBsYWJlbCwgdHJ1ZSwgdHJ1ZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUluYm91bmQoc3RyZWFtLCBtZW1iZXJJZCwgZGlzcGxheU5hbWUsIGNvbnRhaW5lciA9IG51bGwpIHtcclxuICAgIGNvbnNvbGUubG9nKGBEaXNwbGF5aW5nIHJlbW90ZSBwYXJ0aWNpcGFudCAke21lbWJlcklkfSBhbHNvIGtub3duIGFzICR7ZGlzcGxheU5hbWV9YCk7XHJcbiAgICBjb25zdCBjZWxsID0gcHJvdmlkZUNlbGxJbkdyaWQobWVtYmVySWQsIGNvbnRhaW5lcik7XHJcbiAgICBjZWxsLmlubmVySFRNTCA9IFwiXCI7XHJcblxyXG4gICAgaW5ib3VuZERpc3BsYXlCeU1lbWJlci5zZXQobWVtYmVySWQsIGNlbGwpO1xyXG5cclxuICAgIGxldCBpc1N1YnJvb20gPSAhIWNvbnRhaW5lcjtcclxuICAgIGNvbnN0IHZpZGVvID0gZGlzcGxheShjZWxsLCBzdHJlYW0sIGRpc3BsYXlOYW1lLCBpc1N1YnJvb20sIGlzU3Vicm9vbSk7XHJcblxyXG4gICAgaWYgKCFpc1N1YnJvb20pIHtcclxuICAgICAgICBpbmJvdW5kLmFwcGVuZENvbnRyb2xzKGNlbGwsIHZpZGVvLCBtZW1iZXJJZCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGhvc3RDb250cm9scyA9IGhvc3QuY3JlYXRlQ29udHJvbHMobWVtYmVySWQpO1xyXG4gICAgICAgIGlmIChob3N0Q29udHJvbHMpIHtcclxuICAgICAgICAgICAgY2VsbC5hcHBlbmRDaGlsZChob3N0Q29udHJvbHMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlSW5ib3VuZChtZW1iZXJJZCkge1xyXG4gICAgY29uc3QgaW5ib3VuZERpc3BsYXkgPSBpbmJvdW5kRGlzcGxheUJ5TWVtYmVyLmdldChtZW1iZXJJZCk7XHJcbiAgICBpZiAoaW5ib3VuZERpc3BsYXkpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlJlbW92aW5nIGRpc3BsYXkgZm9yXCIsIG1lbWJlcklkKTtcclxuICAgICAgICBpbmJvdW5kRGlzcGxheUJ5TWVtYmVyLmRlbGV0ZShtZW1iZXJJZCk7XHJcbiAgICAgICAgaW5ib3VuZERpc3BsYXkucmVtb3ZlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFySW5ib3VuZCgpIHtcclxuICAgIGluYm91bmREaXNwbGF5QnlNZW1iZXIuZm9yRWFjaCgoY2VsbCkgPT4ge1xyXG4gICAgICAgIGNlbGwucmVtb3ZlKCk7XHJcbiAgICB9KTtcclxuICAgIGluYm91bmREaXNwbGF5QnlNZW1iZXIuY2xlYXIoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbWVtYmVyRGlzcGxheWVkKG1lbWJlcklkKSB7XHJcbiAgICByZXR1cm4gISFpbmJvdW5kRGlzcGxheUJ5TWVtYmVyW21lbWJlcklkXTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZGlzcGxheShjb250YWluZXIsIHN0cmVhbSwgbGFiZWwsIG1pbmltaXplZCwgaXNMb2NhbCkge1xyXG4gICAgY29uc3QgY2FwdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwXCIpO1xyXG4gICAgY2FwdGlvbi5zZXRBdHRyaWJ1dGUoXCJhbGlnblwiLCBcImNlbnRlclwiKTtcclxuICAgIGNhcHRpb24uaW5uZXJUZXh0ID0gbGFiZWw7XHJcblxyXG4gICAgY29uc3QgdmlkZW9UcmFja3MgPSBtZWRpYS5zdHJlYW1UcmFja3Moc3RyZWFtLCBcInZpZGVvXCIpO1xyXG4gICAgY29uc3QgYXVkaW9UcmFja3MgPSBtZWRpYS5zdHJlYW1UcmFja3Moc3RyZWFtLCBcImF1ZGlvXCIpO1xyXG5cclxuICAgIGNvbnN0IHZpZGVvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInZpZGVvXCIpO1xyXG4gICAgdmlkZW8uc3JjT2JqZWN0ID0gc3RyZWFtO1xyXG4gICAgaWYgKGlzTG9jYWwpIHtcclxuICAgICAgICB2aWRlby5tdXRlZCA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc2l6ZSA9IFNJWkVTW21pbmltaXplZF07XHJcblxyXG4gICAgaWYgKHZpZGVvVHJhY2tzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICB2aWRlby53aWR0aCA9IHNpemUud2lkdGg7XHJcbiAgICAgICAgdmlkZW8uaGVpZ2h0ID0gc2l6ZS5oZWlnaHQ7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZpZGVvLndpZHRoID0gMDtcclxuICAgICAgICB2aWRlby5oZWlnaHQgPSAwO1xyXG5cclxuICAgICAgICBjb25zdCBzcGVha2VyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcclxuICAgICAgICBpZiAoYXVkaW9UcmFja3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBzcGVha2VyLnNyYyA9IFwic3BlYWtlci5qcGdcIjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzcGVha2VyLnNyYyA9IFwibXV0ZWQuanBnXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNwZWFrZXIud2lkdGggPSBzaXplLndpZHRoO1xyXG4gICAgICAgIHNwZWFrZXIuaGVpZ2h0ID0gc2l6ZS5oZWlnaHQ7XHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHNwZWFrZXIpO1xyXG4gICAgfVxyXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHZpZGVvKTtcclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicFwiKSk7XHJcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY2FwdGlvbik7XHJcblxyXG4gICAgYXdhaXQgdmlkZW8ucGxheSgpO1xyXG4gICAgcmV0dXJuIHZpZGVvO1xyXG59XHJcblxyXG5sZXQgZ3JpZFdpZHRoO1xyXG5cclxuZnVuY3Rpb24gbWFrZUdyaWRXaWRlcigpIHtcclxuICAgIHNldEdyaWRXaWR0aChncmlkV2lkdGggKyAxKTtcclxufVxyXG5mdW5jdGlvbiBtYWtlR3JpZE5hcnJvd2VyKCkge1xyXG4gICAgaWYgKGdyaWRXaWR0aCA+IDEpIHtcclxuICAgICAgICBzZXRHcmlkV2lkdGgoZ3JpZFdpZHRoIC0gMSk7XHJcbiAgICB9XHJcbn1cclxuZnVuY3Rpb24gc2V0R3JpZFdpZHRoKHdpZHRoKSB7XHJcbiAgICBncmlkV2lkdGggPSB3aWR0aDtcclxuICAgIGluYm91bmREaXNwbGF5c0dyaWQuc3R5bGUuZ3JpZFRlbXBsYXRlQ29sdW1ucyA9IFwiYXV0byBcIi5yZXBlYXQod2lkdGgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwcm92aWRlQ2VsbEluR3JpZChtZW1iZXJJZCwgY29udGFpbmVyID0gbnVsbCkge1xyXG4gICAgbGV0IGNlbGwgPSBpbmJvdW5kRGlzcGxheUJ5TWVtYmVyW21lbWJlcklkXTtcclxuICAgIGlmICghY2VsbCkge1xyXG4gICAgICAgIGNlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgICAgIGxldCBncmlkID0gY29udGFpbmVyID8gY29udGFpbmVyIDogaW5ib3VuZERpc3BsYXlzR3JpZDtcclxuICAgICAgICBncmlkLmFwcGVuZENoaWxkKGNlbGwpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNlbGw7XHJcbn1cclxuXHJcbmNvbnN0IFNJWkVTID0ge1xyXG4gICAgdHJ1ZTogeyB3aWR0aDogMzIwLCBoZWlnaHQ6IDI0MCB9LCAvL21pbmltaXplZFxyXG4gICAgZmFsc2U6IHsgd2lkdGg6IDY0MCwgaGVpZ2h0OiA0ODAgfSwgLy9mdWxsLXNpemVcclxufTtcclxuIiwiY29uc3QgYXBpID0gcmVxdWlyZSgnamFudXMtdmlkZW9yb29tLWFwaScpO1xyXG5jb25zdCBzdWJyb29tID0gcmVxdWlyZSgnLi4vc3Vicm9vbScpO1xyXG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi8uLi9jb25maWcnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdGlhbGl6ZSxcclxuICAgIGFwcGVuZENvbnRyb2xzXHJcbn07XHJcblxyXG5sZXQgcm9vbUFkbWluQXBpID0gdW5kZWZpbmVkO1xyXG5cclxubGV0IG1vbml0b3JGbjtcclxuXHJcbmxldCBjcmVhdGVTdWJSb29tQnV0dG9uO1xyXG5jb25zdCBjaGVja2JveGVzID0gQXJyYXkoKTtcclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemUobW9kZXJhdG9yLCBfbW9uaXRvckZuLCBqYW51cywgcm9vbUlkLCByb29tU2VjcmV0KSB7XHJcbiAgICBpZiAocm9vbUFkbWluQXBpKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJCcmVhay1vdXQgY2FwYWJpbGl0eSBpcyBhbHJlYWR5IGluaXRpYWxpemVkXCIpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIG1vbml0b3JGbiA9IF9tb25pdG9yRm47XHJcblxyXG4gICAgamFudXMuYWRkUGx1Z2luKG5ldyBhcGkuVmlkZW9Sb29tQWRtaW4oY29uZmlnLnJvb20sIGNvbnNvbGUpKVxyXG4gICAgICAgIC50aGVuKChhdHRhY2hlZEFwaSkgPT4ge1xyXG4gICAgICAgICAgICByb29tQWRtaW5BcGkgPSBhdHRhY2hlZEFwaTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJWaWRlb1Jvb21BZG1pbiBwbHVnaW4gYXR0YWNoZWQ6XCIsIHJvb21BZG1pbkFwaSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgY3JlYXRlU3ViUm9vbUJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3JlYXRlU3ViUm9vbVwiKTtcclxuICAgIGNyZWF0ZVN1YlJvb21CdXR0b24ub25jbGljayA9IGZvcmtSb29tKG1vZGVyYXRvciwgcm9vbUlkLCByb29tU2VjcmV0KTtcclxuICAgIGNyZWF0ZVN1YlJvb21CdXR0b24uaGlkZGVuID0gZmFsc2U7XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZvcmtSb29tKG1vZGVyYXRvciwgcm9vbUlkLCByb29tU2VjcmV0KSB7XHJcbiAgICByZXR1cm4gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgbmV3IGJyZWFrLW91dCByb29tXCIpO1xyXG5cclxuICAgICAgICBjb25zdCBzZWxlY3RlZCA9IGNoZWNrYm94ZXNcclxuICAgICAgICAgICAgLmZpbHRlcigoY2hlY2tib3gpID0+IGNoZWNrYm94LmNoZWNrZWQpXHJcbiAgICAgICAgICAgIC5tYXAoKGNoZWNrYm94KSA9PiBjaGVja2JveC5tZW1iZXJJZCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJTZWxlY3RlZCBtZW1iZXJzXCIsIHNlbGVjdGVkKTtcclxuXHJcbiAgICAgICAgY29uc3QgcmVjb3JkaW5nID0gZmFsc2U7IC8vdG9kb1xyXG4gICAgICAgIGNvbnN0IHN1YnJvb21QaW4gPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgICAgICAgY29uc3Qgc3Vicm9vbUlkID0gYXdhaXQgcm9vbUFkbWluQXBpLmNyZWF0ZVJvb20oXCJbQnJlYWstb3V0IHJvb21dXCIsIHRydWUsIHJlY29yZGluZywgc3Vicm9vbVBpbiwgcm9vbVNlY3JldCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSB7XHJcbiAgICAgICAgICAgIFwicm9vbUlkXCI6IHJvb21JZCxcclxuICAgICAgICAgICAgXCJvcGVyYXRpb25cIjoge1xyXG4gICAgICAgICAgICAgICAgXCJmb3JrUm9vbVwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgXCJ0YXJnZXRfaWRcIjogc3Vicm9vbUlkLFxyXG4gICAgICAgICAgICAgICAgICAgIFwidGFyZ2V0X3BpblwiOiBzdWJyb29tUGluLFxyXG4gICAgICAgICAgICAgICAgICAgIFwibWVtYmVyX2lkc1wiOiBzZWxlY3RlZFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJCcmVhay1vdXQgcmVxdWVzdCBjb25zdHJ1Y3RlZFwiLCBjb21tYW5kKTtcclxuICAgICAgICBtb2RlcmF0b3Iuc2VuZFJlcXVlc3QoY29tbWFuZCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGRpc3BsYXkgPSBzdWJyb29tLmNyZWF0ZU1vbml0b3Ioc3Vicm9vbUlkLCBzdWJyb29tUGluLCBbXHJcbiAgICAgICAgICAgIG1lcmdlUm9vbShtb2RlcmF0b3IsIHJvb21JZCwgc3Vicm9vbUlkKSxcclxuICAgICAgICAgICAgcHJlc2VudFJvb20obW9kZXJhdG9yLCByb29tSWQsIHN1YnJvb21JZClcclxuICAgICAgICBdKTtcclxuICAgICAgICBtb25pdG9yRm4oc3Vicm9vbUlkLCBzdWJyb29tUGluLCBkaXNwbGF5LCB0cnVlKTtcclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1lcmdlUm9vbShtb2RlcmF0b3IsIHJvb21JZCwgc3Vicm9vbUlkKSB7XHJcbiAgICByZXR1cm4gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTWVyZ2luZyBzdWJyb29tIGJhY2tcIiwgc3Vicm9vbUlkKTtcclxuXHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHtcclxuICAgICAgICAgICAgXCJyb29tSWRcIjogcm9vbUlkLFxyXG4gICAgICAgICAgICBcIm9wZXJhdGlvblwiOiB7XHJcbiAgICAgICAgICAgICAgICBcIm1lcmdlUm9vbVwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgXCJ0YXJnZXRfaWRcIjogc3Vicm9vbUlkLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJNZXJnZS1iYWNrIHJlcXVlc3QgY29uc3RydWN0ZWRcIiwgY29tbWFuZCk7XHJcbiAgICAgICAgbW9kZXJhdG9yLnNlbmRSZXF1ZXN0KGNvbW1hbmQpO1xyXG5cclxuICAgICAgICBzdWJyb29tLnJlbW92ZU1vbml0b3Ioc3Vicm9vbUlkKTtcclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByZXNlbnRSb29tKG1vZGVyYXRvciwgcm9vbUlkLCBzdWJyb29tSWQpIHtcclxuICAgIHJldHVybiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJQcmVzZW50aW5nIHN1YnJvb20gdG8gdGhlIGNsYXNzcm9vbVwiLCBzdWJyb29tSWQpO1xyXG5cclxuICAgICAgICBjb25zdCBjb21tYW5kID0ge1xyXG4gICAgICAgICAgICBcInJvb21JZFwiOiByb29tSWQsXHJcbiAgICAgICAgICAgIFwib3BlcmF0aW9uXCI6IHtcclxuICAgICAgICAgICAgICAgIFwicHJlc2VudFJvb21cIjoge1xyXG4gICAgICAgICAgICAgICAgICAgIFwidGFyZ2V0X2lkXCI6IHN1YnJvb21JZCxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiUHJlc2VudGluZyByZXF1ZXN0IGNvbnN0cnVjdGVkIFwiLCBjb21tYW5kKTtcclxuICAgICAgICBtb2RlcmF0b3Iuc2VuZFJlcXVlc3QoY29tbWFuZCk7XHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBhcHBlbmRDb250cm9scyhjb250YWluZXIsIG1lbWJlcklkKSB7XHJcbiAgICBjb25zdCBjaGVja2JveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcclxuICAgIGNoZWNrYm94LnR5cGUgPSBcImNoZWNrYm94XCI7XHJcbiAgICBjaGVja2JveC5tZW1iZXJJZCA9IG1lbWJlcklkO1xyXG5cclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChjaGVja2JveCk7XHJcbiAgICBjaGVja2JveGVzLnB1c2goY2hlY2tib3gpO1xyXG59XHJcbiIsImNvbnN0IHJlc3RyaWN0aW9ucyA9IHJlcXVpcmUoJy4vcmVzdHJpY3Rpb25zJyk7XHJcbmNvbnN0IGJyZWFrb3V0ID0gcmVxdWlyZSgnLi9icmVha291dCcpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBpbml0aWFsaXplLFxyXG4gICAgY3JlYXRlQ29udHJvbHMsXHJcbn07XHJcblxyXG5sZXQgaW5pdGlhbGl6ZWQgPSBmYWxzZTtcclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemUobW9kZXJhdG9yLCBqYW51cywgcm9vbUlkLCByb29tU2VjcmV0LCBtb25pdG9yRm4pIHtcclxuICAgIGluaXRpYWxpemVkID0gaW5pdGlhbGl6ZWQgfHwgcmVzdHJpY3Rpb25zLmluaXRpYWxpemUobW9kZXJhdG9yLCByb29tSWQpICYmXHJcbiAgICAgICAgICAgICAgICAgIGJyZWFrb3V0LmluaXRpYWxpemUobW9kZXJhdG9yLCBtb25pdG9yRm4sIGphbnVzLCByb29tSWQsIHJvb21TZWNyZXQpO1xyXG4gICAgY29uc29sZS5sb2coXCJIb3N0IGNhcGFiaWxpdGllcyBpbml0aWFsaXplZD9cIiwgaW5pdGlhbGl6ZWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDb250cm9scyhtZW1iZXJJZCkge1xyXG4gICAgaWYgKCFpbml0aWFsaXplZCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgcmVzdHJpY3Rpb25zLmFwcGVuZENvbnRyb2xzKGNvbnRhaW5lciwgbWVtYmVySWQpO1xyXG4gICAgYnJlYWtvdXQuYXBwZW5kQ29udHJvbHMoY29udGFpbmVyLCBtZW1iZXJJZCk7XHJcblxyXG4gICAgcmV0dXJuIGNvbnRhaW5lcjtcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIGluaXRpYWxpemUsXHJcbiAgICBhcHBlbmRDb250cm9sc1xyXG59O1xyXG5cclxubGV0IHJlc3RyaWN0aW9uc0FwaTtcclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemUobW9kZXJhdG9yLCByb29tSWQpIHtcclxuICAgIGlmIChyZXN0cmljdGlvbnNBcGkpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlJlc3RyaWN0aW5nIGNhcGFiaWxpdHkgaXMgYWxyZWFkeSBpbml0aWFsaXplZFwiKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29uc3RydWN0UmVxdWVzdChtZW1iZXJJZCwga2luZCwgcmVzdHJpY3RlZCkge1xyXG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSB7XHJcbiAgICAgICAgICAgIFwicm9vbUlkXCI6IHJvb21JZCxcclxuICAgICAgICAgICAgXCJvcGVyYXRpb25cIjoge1xyXG4gICAgICAgICAgICAgICAgXCJzZXRSZXN0cmljdGlvblwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgXCJtZW1iZXJfaWRcIjogbWVtYmVySWQsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJraW5kXCI6IGtpbmQsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJyZXN0cmljdGVkXCI6IHJlc3RyaWN0ZWRcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVzdHJpY3Rpb24gcmVxdWVzdCBjb25zdHJ1Y3RlZCBcIiwgY29tbWFuZCk7XHJcbiAgICAgICAgcmV0dXJuIGNvbW1hbmQ7XHJcbiAgICB9XHJcblxyXG4gICAgcmVzdHJpY3Rpb25zQXBpID0ge1xyXG4gICAgICAgIHJlc3RyaWN0UGFydGljaXBhbnQ6IChtZW1iZXJJZCwga2luZCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVzdHJpY3RpbmcgJHtraW5kfSB0cmFjayBvZiAke21lbWJlcklkfWApO1xyXG4gICAgICAgICAgICBjb25zdCBjb21tYW5kID0gY29uc3RydWN0UmVxdWVzdChtZW1iZXJJZCwga2luZCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIG1vZGVyYXRvci5zZW5kUmVxdWVzdChjb21tYW5kKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVucmVzdHJpY3RQYXJ0aWNpcGFudDogKG1lbWJlcklkLCBraW5kKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBVbnJlc3RyaWN0aW5nICR7a2luZH0gdHJhY2sgb2YgJHttZW1iZXJJZH1gKTtcclxuICAgICAgICAgICAgY29uc3QgY29tbWFuZCA9IGNvbnN0cnVjdFJlcXVlc3QobWVtYmVySWQsIGtpbmQsIGZhbHNlKTtcclxuICAgICAgICAgICAgbW9kZXJhdG9yLnNlbmRSZXF1ZXN0KGNvbW1hbmQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFwcGVuZENvbnRyb2xzKGNvbnRhaW5lciwgbWVtYmVySWQpIHtcclxuICAgIGNvbnN0IG11dGVGb3JBbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgbXV0ZUZvckFsbC5pbm5lclRleHQgPSBNVVRFX0FVRElPX0ZPUl9BTEw7XHJcbiAgICBtdXRlRm9yQWxsLm9uY2xpY2sgPSBtdXRlQXVkaW9Gb3JBbGwobWVtYmVySWQsIG11dGVGb3JBbGwpO1xyXG5cclxuICAgIGNvbnN0IGhpZGVGb3JBbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgaGlkZUZvckFsbC5pbm5lclRleHQgPSBNVVRFX1ZJREVPX0ZPUl9BTEw7XHJcbiAgICBoaWRlRm9yQWxsLm9uY2xpY2sgPSBtdXRlVmlkZW9Gb3JBbGwobWVtYmVySWQsIGhpZGVGb3JBbGwpO1xyXG5cclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChtdXRlRm9yQWxsKTtcclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChoaWRlRm9yQWxsKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbXV0ZUF1ZGlvRm9yQWxsKG1lbWJlcklkLCBidXR0b24pIHtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgcmVzdHJpY3Rpb25zQXBpLnJlc3RyaWN0UGFydGljaXBhbnQobWVtYmVySWQsIFwiYXVkaW9cIik7XHJcblxyXG4gICAgICAgIGJ1dHRvbi5pbm5lclRleHQgPSBVTk1VVEVfQVVESU9fRk9SX0FMTDtcclxuICAgICAgICBidXR0b24ub25jbGljayA9IHVubXV0ZUF1ZGlvRm9yQWxsKG1lbWJlcklkLCBidXR0b24pO1xyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gbXV0ZVZpZGVvRm9yQWxsKG1lbWJlcklkLCBidXR0b24pIHtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgcmVzdHJpY3Rpb25zQXBpLnJlc3RyaWN0UGFydGljaXBhbnQobWVtYmVySWQsIFwidmlkZW9cIik7XHJcblxyXG4gICAgICAgIGJ1dHRvbi5pbm5lclRleHQgPSBVTk1VVEVfVklERU9fRk9SX0FMTDtcclxuICAgICAgICBidXR0b24ub25jbGljayA9IHVubXV0ZVZpZGVvRm9yQWxsKG1lbWJlcklkLCBidXR0b24pO1xyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gdW5tdXRlQXVkaW9Gb3JBbGwobWVtYmVySWQsIGJ1dHRvbikge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICByZXN0cmljdGlvbnNBcGkudW5yZXN0cmljdFBhcnRpY2lwYW50KG1lbWJlcklkLCBcImF1ZGlvXCIpO1xyXG5cclxuICAgICAgICBidXR0b24uaW5uZXJUZXh0ID0gTVVURV9BVURJT19GT1JfQUxMO1xyXG4gICAgICAgIGJ1dHRvbi5vbmNsaWNrID0gbXV0ZUF1ZGlvRm9yQWxsKG1lbWJlcklkLCBidXR0b24pO1xyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gdW5tdXRlVmlkZW9Gb3JBbGwobWVtYmVySWQsIGJ1dHRvbikge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICByZXN0cmljdGlvbnNBcGkudW5yZXN0cmljdFBhcnRpY2lwYW50KG1lbWJlcklkLCBcInZpZGVvXCIpO1xyXG5cclxuICAgICAgICBidXR0b24uaW5uZXJUZXh0ID0gTVVURV9WSURFT19GT1JfQUxMO1xyXG4gICAgICAgIGJ1dHRvbi5vbmNsaWNrID0gbXV0ZVZpZGVvRm9yQWxsKG1lbWJlcklkLCBidXR0b24pO1xyXG4gICAgfTtcclxufVxyXG5cclxuY29uc3QgTVVURV9BVURJT19GT1JfQUxMID0gXCJNdXRlIGZvciBhbGxcIjtcclxuY29uc3QgVU5NVVRFX0FVRElPX0ZPUl9BTEwgPSBcIlVubXV0ZSBmb3IgYWxsXCI7XHJcbmNvbnN0IE1VVEVfVklERU9fRk9SX0FMTCA9IFwiVW53YXRjaCBmb3IgYWxsXCI7XHJcbmNvbnN0IFVOTVVURV9WSURFT19GT1JfQUxMID0gXCJXYXRjaCBmb3IgYWxsXCI7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdGlhbGl6ZSxcclxuICAgIGFwcGVuZENvbnRyb2xzLFxyXG59O1xyXG5cclxubGV0IHN1YnNjcmlwdGlvbnM7XHJcbi8vIE1hcFtNZW1iZXJJZCwgU3Vic2NyaWJlcl1cclxuXHJcbmxldCBzdWJyb29tU3Vic2NyaXB0aW9ucztcclxuLy8gTWFwW1Jvb21JZCwgTWFwW01lbWJlcklkLCBTdWJzY3JpYmVyXV1cclxuXHJcbmxldCByZW1vdmVGb2N1c0J1dHRvbjtcclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemUoX3N1YnNjcmlwdGlvbnMsIF9zdWJyb29tU3Vic2NyaXB0aW9ucykge1xyXG4gICAgc3Vic2NyaXB0aW9ucyA9IF9zdWJzY3JpcHRpb25zO1xyXG4gICAgc3Vicm9vbVN1YnNjcmlwdGlvbnMgPSBfc3Vicm9vbVN1YnNjcmlwdGlvbnM7XHJcbiAgICByZW1vdmVGb2N1c0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVtb3ZlRm9jdXNcIik7XHJcbiAgICByZW1vdmVGb2N1c0J1dHRvbi5vbmNsaWNrID0gcmVtb3ZlRm9jdXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFwcGVuZENvbnRyb2xzKGNvbnRhaW5lciwgdmlkZW8sIG1lbWJlcklkKSB7XHJcbiAgICBjb25zdCBtdXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgIG11dGUuaW5uZXJUZXh0ID0gTVVURV9JTkJPVU5EX0FVRElPO1xyXG4gICAgbXV0ZS5vbmNsaWNrID0gbXV0ZUF1ZGlvKG1lbWJlcklkLCBtdXRlKTtcclxuXHJcbiAgICBjb25zdCBoaWRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgIGhpZGUuaW5uZXJUZXh0ID0gTVVURV9JTkJPVU5EX1ZJREVPO1xyXG4gICAgaGlkZS5vbmNsaWNrID0gbXV0ZVZpZGVvKG1lbWJlcklkLCBoaWRlKTtcclxuXHJcbiAgICBjb25zdCBmb2N1cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICBmb2N1cy5pbm5lclRleHQgPSBGT0NVU19PTl9NRU1CRVI7XHJcbiAgICBmb2N1cy5vbmNsaWNrID0gZm9jdXNPbk1lbWJlcihtZW1iZXJJZCk7XHJcblxyXG4gICAgY29uc3QgZnVsbHNjcmVlbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICBmdWxsc2NyZWVuLmlubmVyVGV4dCA9IFNXSVRDSF9GVUxMX1NDUkVFTjtcclxuICAgIGZ1bGxzY3JlZW4ub25jbGljayA9IHN3aXRjaEZ1bGxTY3JlZW4obWVtYmVySWQsIHZpZGVvKTtcclxuXHJcbiAgICBjb25zdCBsZWZ0SGFsZiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBsZWZ0SGFsZi5hcHBlbmRDaGlsZChtdXRlKTtcclxuICAgIGxlZnRIYWxmLmFwcGVuZENoaWxkKGhpZGUpO1xyXG4gICAgbGVmdEhhbGYuc3R5bGUuZmxvYXQgPSBcImxlZnRcIjtcclxuXHJcbiAgICBjb25zdCByaWdodEhhbGYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgcmlnaHRIYWxmLmFwcGVuZENoaWxkKGZvY3VzKTtcclxuICAgIHJpZ2h0SGFsZi5hcHBlbmRDaGlsZChmdWxsc2NyZWVuKTtcclxuICAgIHJpZ2h0SGFsZi5zdHlsZS5mbG9hdCA9IFwicmlnaHRcIjtcclxuXHJcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobGVmdEhhbGYpO1xyXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHJpZ2h0SGFsZik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZvY3VzT25NZW1iZXIobWVtYmVySWQpIHtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJGb2N1c2luZyBvbiBtZW1iZXJcIiwgbWVtYmVySWQpO1xyXG4gICAgICAgIHN1YnNjcmlwdGlvbnMuZm9yRWFjaCgoc3Vic2NyaXB0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChtZW1iZXJJZCA9PT0gc3Vic2NyaXB0aW9uLnB1Ymxpc2hlcklkKSB7XHJcbiAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb24uc3RhcnRWaWRlbygpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uLnN0b3BWaWRlbygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmVtb3ZlRm9jdXNCdXR0b24uaGlkZGVuID0gZmFsc2U7XHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVGb2N1cygpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiUmVtb3ZpbmcgZm9jdXMgb24gYSBwYXJ0aWN1bGFyIG1lbWJlclwiKTtcclxuICAgIHN1YnNjcmlwdGlvbnMuZm9yRWFjaCgoc3Vic2NyaXB0aW9uKSA9PiB7XHJcbiAgICAgICAgc3Vic2NyaXB0aW9uLnN0YXJ0VmlkZW8oKTtcclxuICAgIH0pO1xyXG4gICAgcmVtb3ZlRm9jdXNCdXR0b24uaGlkZGVuID0gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3dpdGNoRnVsbFNjcmVlbihtZW1iZXJJZCwgdmlkZW8pIHtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgaWYgKHZpZGVvLnJlcXVlc3RGdWxsc2NyZWVuKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR2VuZXJpYyBmdWxsc2NyZWVuIG1ldGhvZCB3b3Jrc1wiKTtcclxuICAgICAgICAgICAgdmlkZW8ucmVxdWVzdEZ1bGxzY3JlZW4oKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHZpZGVvLm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRmlyZWZveCBpcyBiZWluZyB1c2VkXCIpO1xyXG4gICAgICAgICAgICB2aWRlby5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodmlkZW8ud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDaHJvbWUvU2FmYXJpL09wZXJhIGlzIGJlaW5nIHVzZWRcIik7XHJcbiAgICAgICAgICAgIHZpZGVvLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh2aWRlby5tc1JlcXVlc3RGdWxsc2NyZWVuKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXJlIHlvdSB1c2luZyBJRS9FZGdlPyBTZXJpb3VzbHk/XCIpO1xyXG4gICAgICAgICAgICB2aWRlby5tc1JlcXVlc3RGdWxsc2NyZWVuKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2aWRlby5vbmZ1bGxzY3JlZW5jaGFuZ2UgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYgKGRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVudGVyaW5nIGZ1bGwtc2NyZWVuXCIsIGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIGZvY3VzT25NZW1iZXIobWVtYmVySWQpKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxlYXZpbmcgZnVsbC1zY3JlZW5cIiwgZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgcmVtb3ZlRm9jdXMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBtdXRlQXVkaW8obWVtYmVySWQsIGJ1dHRvbikge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICBzdWJzY3JpcHRpb25zLmdldChtZW1iZXJJZCkuc3RvcEF1ZGlvKCk7XHJcbiAgICAgICAgYnV0dG9uLmlubmVyVGV4dCA9IFVOTVVURV9JTkJPVU5EX0FVRElPO1xyXG4gICAgICAgIGJ1dHRvbi5vbmNsaWNrID0gdW5tdXRlQXVkaW8obWVtYmVySWQsIGJ1dHRvbik7XHJcbiAgICB9O1xyXG59XHJcbmZ1bmN0aW9uIG11dGVWaWRlbyhtZW1iZXJJZCwgYnV0dG9uKSB7XHJcbiAgICByZXR1cm4gKCkgPT4ge1xyXG4gICAgICAgIHN1YnNjcmlwdGlvbnMuZ2V0KG1lbWJlcklkKS5zdG9wVmlkZW8oKTtcclxuICAgICAgICBidXR0b24uaW5uZXJUZXh0ID0gVU5NVVRFX0lOQk9VTkRfVklERU87XHJcbiAgICAgICAgYnV0dG9uLm9uY2xpY2sgPSB1bm11dGVWaWRlbyhtZW1iZXJJZCwgYnV0dG9uKTtcclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVubXV0ZUF1ZGlvKG1lbWJlcklkLCBidXR0b24pIHtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgc3Vic2NyaXB0aW9ucy5nZXQobWVtYmVySWQpLnN0YXJ0QXVkaW8oKTtcclxuICAgICAgICBidXR0b24uaW5uZXJUZXh0ID0gTVVURV9JTkJPVU5EX0FVRElPO1xyXG4gICAgICAgIGJ1dHRvbi5vbmNsaWNrID0gbXV0ZUF1ZGlvKG1lbWJlcklkLCBidXR0b24pO1xyXG4gICAgfTtcclxufVxyXG5mdW5jdGlvbiB1bm11dGVWaWRlbyhtZW1iZXJJZCwgYnV0dG9uKSB7XHJcbiAgICByZXR1cm4gKCkgPT4ge1xyXG4gICAgICAgIHN1YnNjcmlwdGlvbnMuZ2V0KG1lbWJlcklkKS5zdGFydFZpZGVvKCk7XHJcbiAgICAgICAgYnV0dG9uLmlubmVyVGV4dCA9IE1VVEVfSU5CT1VORF9WSURFTztcclxuICAgICAgICBidXR0b24ub25jbGljayA9IG11dGVWaWRlbyhtZW1iZXJJZCwgYnV0dG9uKTtcclxuICAgIH07XHJcbn1cclxuXHJcbmNvbnN0IE1VVEVfSU5CT1VORF9BVURJTyA9IFwiTXV0ZVwiO1xyXG5jb25zdCBVTk1VVEVfSU5CT1VORF9BVURJTyA9IFwiVW5tdXRlXCI7XHJcbmNvbnN0IE1VVEVfSU5CT1VORF9WSURFTyA9IFwiVW53YXRjaFwiO1xyXG5jb25zdCBVTk1VVEVfSU5CT1VORF9WSURFTyA9IFwiV2F0Y2hcIjtcclxuXHJcbmNvbnN0IEZPQ1VTX09OX01FTUJFUiA9IFwiRm9jdXNcIjtcclxuY29uc3QgU1dJVENIX0ZVTExfU0NSRUVOID0gXCJGdWxsIHNjcmVlblwiO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIGluaXRpYWxpemUsXHJcbiAgICBkZWluaXRpYWxpemUsXHJcbiAgICBiaW5kRGV2aWNlcyxcclxuICAgIGJpbmRTY3JlZW4sXHJcbiAgICBtdXRlRGV2aWNlcyxcclxuICAgIG11dGVTY3JlZW4sXHJcbiAgICB1bm11dGVTY3JlZW4sXHJcbiAgICBvdXRib3VuZFRyYWNrcyxcclxuICAgIHN0cmVhbVRyYWNrcyxcclxuXHJcbiAgICBsb3dGUFM6IHsgaWRlYWw6IDQgfSxcclxuICAgIGhpZ2hGUFM6IHsgaWRlYWw6IDMwIH0sXHJcbiAgICBsb3dSZXNXaWR0aDogeyBtYXg6IDY0MCB9LFxyXG4gICAgbG93UmVzSGVpZ2h0OiB7IG1heDogNDgwIH0sXHJcbiAgICBoaWdoUmVzV2lkdGg6IHsgbWluOiAxMjgwLCBpZGVhbDogMTk2MCB9LFxyXG4gICAgaGlnaFJlc0hlaWdodDogeyBtaW46IDcyMCwgaWRlYWw6IDEwODAgfSxcclxufTtcclxuXHJcbmxldCBhdWRpb0FjdGl2ZSA9IGZhbHNlO1xyXG5sZXQgdmlkZW9BY3RpdmUgPSBmYWxzZTtcclxubGV0IHNjcmVlbkFjdGl2ZSA9IGZhbHNlO1xyXG5cclxubGV0IGF1ZGlvU2VuZGVycyA9IFtdO1xyXG5sZXQgdmlkZW9TZW5kZXJzID0gW107XHJcblxyXG5sZXQgc2NyZWVuVmlkZW9UcmFja3MgPSBbXTtcclxuXHJcbmxldCBtb2NrQXVkaW8gPSBudWxsO1xyXG5sZXQgbW9ja1ZpZGVvID0gbnVsbDtcclxuXHJcbmxldCBzdHJlYW0gPSBuZXcgTWVkaWFTdHJlYW0oKTtcclxuc3RyZWFtLmFkZFRyYWNrKG1vY2tNZWRpYVN0cmVhbVRyYWNrKFwiYXVkaW9cIikpO1xyXG5zdHJlYW0uYWRkVHJhY2sobW9ja01lZGlhU3RyZWFtVHJhY2soXCJ2aWRlb1wiKSk7XHJcbi8vIEZvciB1bmtub3duIHJlYXNvbiwganVzdCBhZGRpbmcgbmV3IHRyYWNrcyB0byBleGlzdGluZyBzdHJlYW1cclxuLy8gZG9lc24ndCBmaXJlIFwic3RyZWFtLm9uYWRkdHJhY2tcIiBvbiByZW1vdGUgc2lkZTsgdGhpcyBpcyB3aHlcclxuLy8gd2UgY3JlYXRlIGZha2UgdHJhY2tzIGlmIHVzZXIgZG9lc24ndCB3YW50IHRvIHNoYXJlIGF1ZGlvL3ZpZGVvXHJcbi8vIGZyb20gdGhlIHZlcnkgYmVnaW5uaW5nLCBhbmQgcmVwbGFjZSB0aGVtIGxhdGVyXHJcbi8vIGlmIGhlIGRlY2lkZXMgdG8gc2hhcmUgdGhlbVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZShwZWVyQ29ubmVjdGlvbikge1xyXG4gICAgc3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goKHRyYWNrKSA9PiB7XHJcbiAgICAgICAgcGVlckNvbm5lY3Rpb24uYWRkVHJhY2sodHJhY2spO1xyXG4gICAgfSk7XHJcbiAgICBwZWVyQ29ubmVjdGlvbi5nZXRTZW5kZXJzKClcclxuICAgICAgICAuZm9yRWFjaCgoc2VuZGVyKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChzZW5kZXIudHJhY2sua2luZCA9PT0gXCJhdWRpb1wiKSB7XHJcbiAgICAgICAgICAgICAgICBhdWRpb1NlbmRlcnMucHVzaChzZW5kZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzZW5kZXIudHJhY2sua2luZCA9PT0gXCJ2aWRlb1wiKSB7XHJcbiAgICAgICAgICAgICAgICB2aWRlb1NlbmRlcnMucHVzaChzZW5kZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICByZXR1cm4gc3RyZWFtO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkZWluaXRpYWxpemUoKSB7XHJcbiAgICBhdWRpb1NlbmRlcnMgPSBbXTtcclxuICAgIHZpZGVvU2VuZGVycyA9IFtdO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBiaW5kRGV2aWNlcyhhdWRpbywgdmlkZW8pIHtcclxuICAgIGNvbnNvbGUubG9nKFwiTWljcm9waG9uZSByZXF1ZXN0ZWQ/XCIsIGF1ZGlvKTtcclxuICAgIGNvbnNvbGUubG9nKFwiQ2FtZXJhIHJlcXVlc3RlZD9cIiwgdmlkZW8pO1xyXG4gICAgY29uc29sZS5sb2coXCJNaWNyb3Bob25lIGJvdW5kP1wiLCBhdWRpb0FjdGl2ZSk7XHJcbiAgICBjb25zb2xlLmxvZyhcIkNhbWVyYSBib3VuZD9cIiwgdmlkZW9BY3RpdmUpO1xyXG4gICAgY29uc3QgY29uc3RyYWludHMgPSB7XHJcbiAgICAgICAgYXVkaW86IGF1ZGlvIHx8IGF1ZGlvQWN0aXZlLFxyXG4gICAgICAgIHZpZGVvOiB2aWRlbyB8fCB2aWRlb0FjdGl2ZSxcclxuICAgIH07XHJcbiAgICBpZiAoIWNvbnN0cmFpbnRzLmF1ZGlvICYmICFjb25zdHJhaW50cy52aWRlbykge1xyXG4gICAgICAgIHJldHVybiBzdHJlYW07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coXCJCaW5kaW5nIGRldmljZXNcIiwgY29uc3RyYWludHMpO1xyXG4gICAgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlc1xyXG4gICAgICAgIC5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMpXHJcbiAgICAgICAgLmNhdGNoKChlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgY29uc3QgYXVkaW9UcmFja3MgPSBzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKTtcclxuICAgIGF1ZGlvVHJhY2tzLmZvckVhY2goKHRyYWNrKSA9PiB7XHJcbiAgICAgICAgcHJpbnREZWJ1Z0luZm8odHJhY2spO1xyXG5cclxuICAgICAgICBjb25zdCBhdWRpb1NldHRpbmdzID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIltbIGlzIGVjaG8gY2FuY2VsbGF0aW9uIG9uPyBdXVwiLCBhdWRpb1NldHRpbmdzLmVjaG9DYW5jZWxsYXRpb24pO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiW1sgaXMgbm9pc2Ugc3VwcHJlc3Npb24gb24/IF1dXCIsIGF1ZGlvU2V0dGluZ3Mubm9pc2VTdXBwcmVzc2lvbik7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJbWyBpcyBhdXRvIGdhaW4gY29udHJvbCBvbj8gXV1cIiwgYXVkaW9TZXR0aW5ncy5hdXRvR2FpbkNvbnRyb2wpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdmlkZW9UcmFja3MgPSBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKTtcclxuICAgIHZpZGVvVHJhY2tzLmZvckVhY2goKHRyYWNrKSA9PiB7XHJcbiAgICAgICAgcHJpbnREZWJ1Z0luZm8odHJhY2spO1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gcmVwbGFjZVRyYWNrcyhraW5kLCBuZXdUcmFja3MpIHtcclxuICAgICAgICBjb25zb2xlLmFzc2VydChuZXdUcmFja3MubGVuZ3RoIDwgMik7XHJcblxyXG4gICAgICAgIGlmIChraW5kID09PSBcImF1ZGlvXCIpIHtcclxuICAgICAgICAgICAgYXdhaXQgYXVkaW9TZW5kZXJzWzBdLnJlcGxhY2VUcmFjayhuZXdUcmFja3NbMF0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoa2luZCA9PT0gXCJ2aWRlb1wiKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHZpZGVvU2VuZGVyc1swXS5yZXBsYWNlVHJhY2sobmV3VHJhY2tzWzBdKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGF1ZGlvVHJhY2tzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBhd2FpdCByZXBsYWNlVHJhY2tzKFwiYXVkaW9cIiwgYXVkaW9UcmFja3MpO1xyXG4gICAgICAgIGF1ZGlvQWN0aXZlID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIGlmICh2aWRlb1RyYWNrcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgYXdhaXQgcmVwbGFjZVRyYWNrcyhcInZpZGVvXCIsIHZpZGVvVHJhY2tzKTtcclxuICAgICAgICB2aWRlb0FjdGl2ZSA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHN0cmVhbTtcclxufVxyXG5cclxuZnVuY3Rpb24gbXV0ZURldmljZXMoa2luZCkge1xyXG4gICAgY29uc29sZS5sb2coXCJNdXRpbmcgYm91bmQgZGV2aWNlXCIsIGtpbmQpO1xyXG4gICAgb3V0Ym91bmRUcmFja3Moa2luZClcclxuICAgICAgICAuZm9yRWFjaCgodHJhY2spID0+IHtcclxuICAgICAgICAgICAgcHJpbnREZWJ1Z0luZm8odHJhY2spO1xyXG4gICAgICAgICAgICB0cmFjay5lbmFibGVkID0gZmFsc2U7XHJcbiAgICAgICAgfSk7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhdWRpb1wiKSB7XHJcbiAgICAgICAgYXVkaW9BY3RpdmUgPSBmYWxzZTtcclxuICAgIH1cclxuICAgIGlmIChraW5kID09PSBcInZpZGVvXCIpIHtcclxuICAgICAgICB2aWRlb0FjdGl2ZSA9IGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHN0cmVhbTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gYmluZFNjcmVlbigpIHtcclxuICAgIGNvbnNvbGUuYXNzZXJ0KCFzY3JlZW5BY3RpdmUpO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKFwiQmluZGluZyBzY3JlZW4gbWVkaWFcIik7XHJcbiAgICBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldERpc3BsYXlNZWRpYSgpXHJcbiAgICAgICAgLnRoZW4oKHN0cmVhbSkgPT4ge1xyXG4gICAgICAgICAgICBzY3JlZW5BY3RpdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICBzY3JlZW5WaWRlb1RyYWNrcyA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpO1xyXG4gICAgICAgICAgICBpZiAoc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiVGhlcmUgYXJlIGFsc28gYXVkaW8gdHJhY2tzXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuY2F0Y2goKGUpID0+IHtcclxuICAgICAgICAgICAgc2NyZWVuQWN0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHNjcmVlblZpZGVvVHJhY2tzID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGNvbnNvbGUuYXNzZXJ0KHNjcmVlblZpZGVvVHJhY2tzLmxlbmd0aCA9PT0gMSk7XHJcbiAgICByZXR1cm4gc2NyZWVuVmlkZW9UcmFja3NbMF07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11dGVTY3JlZW4oKSB7XHJcbiAgICBzY3JlZW5WaWRlb1RyYWNrcy5mb3JFYWNoKCh0cmFjaykgPT4ge1xyXG4gICAgICAgIHRyYWNrLmVuYWJsZWQgPSBmYWxzZTtcclxuICAgIH0pO1xyXG4gICAgc2NyZWVuQWN0aXZlID0gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVubXV0ZVNjcmVlbigpIHtcclxuICAgIGNvbnNvbGUuYXNzZXJ0KCFzY3JlZW5BY3RpdmUpO1xyXG4gICAgY29uc29sZS5hc3NlcnQoc2NyZWVuVmlkZW9UcmFja3MpO1xyXG4gICAgc2NyZWVuVmlkZW9UcmFja3MuZm9yRWFjaCgodHJhY2spID0+IHtcclxuICAgICAgICB0cmFjay5lbmFibGVkID0gdHJ1ZTtcclxuICAgIH0pO1xyXG4gICAgc2NyZWVuQWN0aXZlID0gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3RyZWFtVHJhY2tzKHN0cmVhbSwga2luZCkge1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYXVkaW9cIikge1xyXG4gICAgICAgIHJldHVybiBzdHJlYW1cclxuICAgICAgICAgICAgLmdldEF1ZGlvVHJhY2tzKClcclxuICAgICAgICAgICAgLmZpbHRlcigodHJhY2spID0+IHtcclxuICAgICAgICAgICAgICAgIHByaW50RGVidWdJbmZvKHRyYWNrKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cmFjay5lbmFibGVkICYmIHRyYWNrLmlkICE9PSBtb2NrQXVkaW8uaWQ7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKGtpbmQgPT09IFwidmlkZW9cIikge1xyXG4gICAgICAgIHJldHVybiBzdHJlYW1cclxuICAgICAgICAgICAgLmdldFZpZGVvVHJhY2tzKClcclxuICAgICAgICAgICAgLmZpbHRlcigodHJhY2spID0+IHtcclxuICAgICAgICAgICAgICAgIHByaW50RGVidWdJbmZvKHRyYWNrKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cmFjay5lbmFibGVkICYmIHRyYWNrLmlkICE9PSBtb2NrVmlkZW8uaWQ7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBvdXRib3VuZFRyYWNrcyhraW5kKSB7XHJcbiAgICBsZXQgc2VuZGVycztcclxuICAgIGlmIChraW5kID09PSBcImF1ZGlvXCIpIHtcclxuICAgICAgICBzZW5kZXJzID0gYXVkaW9TZW5kZXJzO1xyXG4gICAgfVxyXG4gICAgaWYgKGtpbmQgPT09IFwidmlkZW9cIikge1xyXG4gICAgICAgIHNlbmRlcnMgPSB2aWRlb1NlbmRlcnM7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc2VuZGVycy5tYXAoKHNlbmRlcikgPT4gc2VuZGVyLnRyYWNrKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW9ja01lZGlhU3RyZWFtVHJhY2soa2luZCkge1xyXG4gICAgY29uc29sZS5sb2coYEluaXRpYWxpemluZyBtb2NrICR7a2luZH0gc3RyZWFtYCk7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhdWRpb1wiKSB7XHJcbiAgICAgICAgaWYgKG1vY2tBdWRpbykge1xyXG4gICAgICAgICAgICByZXR1cm4gbW9ja0F1ZGlvO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcclxuICAgICAgICAgICAgY29uc3Qgb3NjaWxsYXRvciA9IGN0eC5jcmVhdGVPc2NpbGxhdG9yKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRzdCA9IG9zY2lsbGF0b3IuY29ubmVjdChjdHguY3JlYXRlTWVkaWFTdHJlYW1EZXN0aW5hdGlvbigpKTtcclxuICAgICAgICAgICAgb3NjaWxsYXRvci5zdGFydCgpO1xyXG4gICAgICAgICAgICBjb25zdCB0cmFjayA9IE9iamVjdC5hc3NpZ24oZHN0LnN0cmVhbS5nZXRBdWRpb1RyYWNrcygpWzBdLCB7ZW5hYmxlZDogZmFsc2V9KTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtb2NrTWVkaWFTdHJlYW1UcmFjaygnYXVkaW8nKS5pZFwiLCB0cmFjay5pZCk7XHJcblxyXG4gICAgICAgICAgICBtb2NrQXVkaW8gPSB0cmFjaztcclxuICAgICAgICAgICAgcmV0dXJuIHRyYWNrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChraW5kID09PSBcInZpZGVvXCIpIHtcclxuICAgICAgICBpZiAobW9ja1ZpZGVvKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBtb2NrVmlkZW87XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc3Qgd2lkdGggPSA2NDA7XHJcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IDQ4MDtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNhbnZhcyA9IE9iamVjdC5hc3NpZ24oZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKSwge3dpZHRoLCBoZWlnaHR9KTtcclxuICAgICAgICAgICAgY2FudmFzLmdldENvbnRleHQoJzJkJykuZmlsbFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0cmVhbSA9IGNhbnZhcy5jYXB0dXJlU3RyZWFtKDEpO1xyXG4gICAgICAgICAgICBjb25zdCB0cmFjayA9IE9iamVjdC5hc3NpZ24oc3RyZWFtLmdldFZpZGVvVHJhY2tzKClbMF0sIHtlbmFibGVkOiBmYWxzZX0pO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vY2tNZWRpYVN0cmVhbVRyYWNrKCd2aWRlbycpLmlkXCIsIHRyYWNrLmlkKTtcclxuXHJcbiAgICAgICAgICAgIG1vY2tWaWRlbyA9IHRyYWNrO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJhY2s7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5lcnJvcihgdW5rbm93biBraW5kICR7a2luZH1gKTtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByaW50RGVidWdJbmZvKHRyYWNrKSB7XHJcbiAgICBsZXQgbGFiZWwgPSBcIlwiO1xyXG4gICAgaWYgKCF0cmFjay5lbmFibGVkKSB7XHJcbiAgICAgICAgbGFiZWwgKz0gXCIgWyBkaXNhYmxlZCBdXCI7XHJcbiAgICB9XHJcbiAgICBpZiAodHJhY2suaWQgPT09IG1vY2tBdWRpby5pZCB8fCB0cmFjay5pZCA9PT0gbW9ja1ZpZGVvLmlkKSB7XHJcbiAgICAgICAgbGFiZWwgKz0gXCIgWyBtb2NrIF1cIjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKGBbICR7dHJhY2sua2luZH0gdHJhY2sgXS5pZCA9ICR7dHJhY2suaWR9JHtsYWJlbH1gKTtcclxufVxyXG4iLCJjb25zdCBkaXNwbGF5ID0gcmVxdWlyZSgnLi9kaXNwbGF5Jyk7XHJcbmNvbnN0IG1lZGlhID0gcmVxdWlyZSgnLi9tZWRpYScpO1xyXG5jb25zdCByb29tID0gcmVxdWlyZSgnLi9yb29tJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIGluaXRpYWxpemUsXHJcbiAgICBpbml0aWFsaXplU3Vicm9vbSxcclxuICAgIGRlaW5pdGlhbGl6ZSxcclxuXHJcbiAgICBtdXRlQXVkaW8sXHJcbiAgICBzdG9wVmlkZW8sXHJcbiAgICB1bm11dGVBdWRpbyxcclxuICAgIHN0YXJ0VmlkZW8sXHJcblxyXG4gICAgcmVzdHJpY3RBdWRpbyxcclxuICAgIHJlc3RyaWN0VmlkZW8sXHJcbiAgICB1bnJlc3RyaWN0QXVkaW8sXHJcbiAgICB1bnJlc3RyaWN0VmlkZW8sXHJcbn07XHJcblxyXG5sZXQgbWVtYmVyO1xyXG5sZXQgcm9vbUFwaTtcclxubGV0IHB1Ymxpc2hlcjtcclxuXHJcbmxldCBzY3JlZW5QdWJsaXNoZXI7XHJcblxyXG5sZXQgc3Vicm9vbVRvUHVibGlzaGVyID0gbmV3IE1hcCgpO1xyXG5cclxubGV0IHN3aXRjaEF1ZGlvQnV0dG9uO1xyXG5sZXQgc3dpdGNoVmlkZW9CdXR0b247XHJcbmxldCBzd2l0Y2hSZXNvbHV0aW9uQnV0dG9uO1xyXG5sZXQgc3dpdGNoRnBzQnV0dG9uO1xyXG5sZXQgc2hhcmVTY3JlZW5CdXR0b247XHJcblxyXG5jb25zdCB2aWRlb0NvbnN0cmFpbnRzID0ge1xyXG4gICAgd2lkdGg6IG1lZGlhLmxvd1Jlc1dpZHRoLFxyXG4gICAgaGVpZ2h0OiBtZWRpYS5sb3dSZXNIZWlnaHQsXHJcbiAgICBmcmFtZVJhdGU6IG1lZGlhLmhpZ2hGUFNcclxufTtcclxuXHJcbmxldCBhdWRpb1Jlc3RyaWN0ZWQgPSBmYWxzZTtcclxubGV0IHZpZGVvUmVzdHJpY3RlZCA9IGZhbHNlO1xyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZShfcm9vbUFwaSwgb3V0Ym91bmRQdWJsaXNoZXIsIGF1ZGlvT24sIHZpZGVvT24sIHNjcmVlbk9uLCBfbWVtYmVyKSB7XHJcbiAgICByb29tQXBpID0gX3Jvb21BcGk7XHJcbiAgICBwdWJsaXNoZXIgPSBvdXRib3VuZFB1Ymxpc2hlcjtcclxuICAgIG1lbWJlciA9IF9tZW1iZXI7XHJcblxyXG4gICAgYXVkaW9SZXN0cmljdGVkID0gZmFsc2U7XHJcbiAgICB2aWRlb1Jlc3RyaWN0ZWQgPSBmYWxzZTtcclxuXHJcbiAgICBzd2l0Y2hBdWRpb0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3dpdGNoQXVkaW9cIik7XHJcbiAgICBzd2l0Y2hWaWRlb0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3dpdGNoVmlkZW9cIik7XHJcbiAgICBzd2l0Y2hSZXNvbHV0aW9uQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzd2l0Y2hSZXNvbHV0aW9uXCIpO1xyXG4gICAgc3dpdGNoRnBzQnV0dG9uICAgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3dpdGNoRnBzXCIpO1xyXG4gICAgc2hhcmVTY3JlZW5CdXR0b24gICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2hhcmVTY3JlZW5cIik7XHJcblxyXG4gICAgc3dpdGNoQXVkaW9CdXR0b24uaW5uZXJUZXh0ID0gYXVkaW9PbiA/IE1VVEVfT1VUQk9VTkRfQVVESU8gOiBVTk1VVEVfT1VUQk9VTkRfQVVESU87XHJcbiAgICBzd2l0Y2hBdWRpb0J1dHRvbi5vbmNsaWNrICAgPSBhdWRpb09uID8gbXV0ZUF1ZGlvIDogdW5tdXRlQXVkaW87XHJcblxyXG4gICAgc3dpdGNoVmlkZW9CdXR0b24uaW5uZXJUZXh0ID0gdmlkZW9PbiA/IE1VVEVfT1VUQk9VTkRfVklERU8gOiBVTk1VVEVfT1VUQk9VTkRfVklERU87XHJcbiAgICBzd2l0Y2hWaWRlb0J1dHRvbi5vbmNsaWNrICAgPSB2aWRlb09uID8gc3RvcFZpZGVvIDogc3RhcnRWaWRlbztcclxuXHJcbiAgICBzaGFyZVNjcmVlbkJ1dHRvbi5pbm5lclRleHQgPSBzY3JlZW5PbiA/IFVOU0hBUkVfU0NSRUVOIDogU0hBUkVfU0NSRUVOO1xyXG4gICAgc2hhcmVTY3JlZW5CdXR0b24ub25jbGljayA9IHNjcmVlbk9uID8gdW5zaGFyZVNjcmVlbiA6IHNoYXJlU2NyZWVuO1xyXG5cclxuICAgIHN3aXRjaFJlc29sdXRpb25CdXR0b24uaW5uZXJUZXh0ID0gSU5DUkVBU0VfUkVTT0xVVElPTjtcclxuICAgIHN3aXRjaFJlc29sdXRpb25CdXR0b24ub25jbGljayA9IGluY3JlYXNlUmVzb2x1dGlvbjtcclxuXHJcbiAgICBzd2l0Y2hGcHNCdXR0b24uaW5uZXJUZXh0ID0gUkVEVUNFX0ZQUztcclxuICAgIHN3aXRjaEZwc0J1dHRvbi5vbmNsaWNrID0gcmVkdWNlRnBzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplU3Vicm9vbShzdWJyb29tSWQsIG91dGJvdW5kUHVibGlzaGVyKSB7XHJcbiAgICBzdWJyb29tVG9QdWJsaXNoZXIuc2V0KHN1YnJvb21JZCwgb3V0Ym91bmRQdWJsaXNoZXIpO1xyXG5cclxuICAgIGNvbnN0IHNwZWFrQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYHNwZWFrLSR7c3Vicm9vbUlkfWApO1xyXG4gICAgaWYgKHNwZWFrQnV0dG9uKSB7XHJcbiAgICAgICAgc3BlYWtCdXR0b24ub25jbGljayA9IHNwZWFrVG9TdWJyb29tKHNwZWFrQnV0dG9uLCBvdXRib3VuZFB1Ymxpc2hlcik7XHJcbiAgICAgICAgc3BlYWtCdXR0b24uaW5uZXJUZXh0ID0gU1BFQUtfVE9fU1VCUk9PTTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZGVpbml0aWFsaXplKCkge1xyXG4gICAgaWYgKHNjcmVlblB1Ymxpc2hlcikge1xyXG4gICAgICAgIHVuc2hhcmVTY3JlZW4oKTtcclxuICAgIH1cclxuXHJcbiAgICBtdXRlQXVkaW8oKTtcclxuICAgIHN0b3BWaWRlbygpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzaGFyZVNjcmVlbigpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiU2hhcmluZyBzY3JlZW5cIik7XHJcblxyXG4gICAgaWYgKHNjcmVlblB1Ymxpc2hlcikge1xyXG4gICAgICAgIG1lZGlhLnVubXV0ZVNjcmVlbigpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBzY3JlZW5QdWJsaXNoZXIgPSBhd2FpdCByb29tQXBpLmNyZWF0ZVB1Ymxpc2hlcigpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQWRkaXRpb25hbCBwdWJsaXNoZXIgY3JlYXRlZDpcIiwgc2NyZWVuUHVibGlzaGVyKTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gYXdhaXQgbWVkaWEuYmluZFNjcmVlbih7IGF1ZGlvOiB0cnVlIH0pO1xyXG4gICAgICAgIHNjcmVlblB1Ymxpc2hlci5wZWVyQ29ubmVjdGlvbi5hZGRUcmFjayhzY3JlZW4pO1xyXG5cclxuICAgICAgICBhd2FpdCBzY3JlZW5QdWJsaXNoZXIuam9pblJvb21BbmRQdWJsaXNoKG1lbWJlci5yb29tSWQsXHJcbiAgICAgICAgICAgICAgICBtZW1iZXIuZGlzcGxheU5hbWUgKyBcIiAoc2NyZWVuKVwiLFxyXG4gICAgICAgICAgICAgICAgbWVtYmVyLnJvb21QaW4sIGZhbHNlLCB0cnVlLCBmYWxzZSlcclxuICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTY3JlZW4gc2hhcmVkXCIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzaGFyZVNjcmVlbkJ1dHRvbi5pbm5lclRleHQgPSBVTlNIQVJFX1NDUkVFTjtcclxuICAgIHNoYXJlU2NyZWVuQnV0dG9uLm9uY2xpY2sgPSB1bnNoYXJlU2NyZWVuO1xyXG59XHJcbmZ1bmN0aW9uIHVuc2hhcmVTY3JlZW4oKSB7XHJcbiAgICBtZWRpYS5tdXRlU2NyZWVuKCk7XHJcblxyXG4gICAgc2NyZWVuUHVibGlzaGVyLmRlc3Ryb3koKTtcclxuICAgIHNjcmVlblB1Ymxpc2hlciA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICBzaGFyZVNjcmVlbkJ1dHRvbi5pbm5lclRleHQgPSBTSEFSRV9TQ1JFRU47XHJcbiAgICBzaGFyZVNjcmVlbkJ1dHRvbi5vbmNsaWNrID0gc2hhcmVTY3JlZW47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11dGVBdWRpbygpIHtcclxuICAgIGRpc3BsYXkudXBkYXRlT3V0Ym91bmQobWVkaWEubXV0ZURldmljZXMoXCJhdWRpb1wiKSk7XHJcbiAgICBwdWJsaXNoZXIuc3RvcEF1ZGlvKCk7XHJcblxyXG4gICAgc3dpdGNoQXVkaW9CdXR0b24uaW5uZXJUZXh0ID0gVU5NVVRFX09VVEJPVU5EX0FVRElPO1xyXG4gICAgc3dpdGNoQXVkaW9CdXR0b24ub25jbGljayA9IHVubXV0ZUF1ZGlvO1xyXG59XHJcbmZ1bmN0aW9uIHN0b3BWaWRlbygpIHtcclxuICAgIGRpc3BsYXkudXBkYXRlT3V0Ym91bmQobWVkaWEubXV0ZURldmljZXMoXCJ2aWRlb1wiKSk7XHJcbiAgICBwdWJsaXNoZXIuc3RvcFZpZGVvKCk7XHJcblxyXG4gICAgc3dpdGNoVmlkZW9CdXR0b24uaW5uZXJUZXh0ID0gVU5NVVRFX09VVEJPVU5EX1ZJREVPO1xyXG4gICAgc3dpdGNoVmlkZW9CdXR0b24ub25jbGljayA9IHN0YXJ0VmlkZW87XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHVubXV0ZUF1ZGlvKCkge1xyXG4gICAgaWYgKGF1ZGlvUmVzdHJpY3RlZCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBtZWRpYS5iaW5kRGV2aWNlcyh0cnVlLCBmYWxzZSk7XHJcbiAgICBpZiAoc3RyZWFtKSB7XHJcbiAgICAgICAgYXdhaXQgZGlzcGxheS51cGRhdGVPdXRib3VuZChzdHJlYW0sIHB1Ymxpc2hlci5tZW1iZXJJZCwgcHVibGlzaGVyLmRpc3BsYXlOYW1lLCB0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBvdXRib3VuZEF1ZGlvID0gbWVkaWEub3V0Ym91bmRUcmFja3MoXCJhdWRpb1wiKTtcclxuICAgIG91dGJvdW5kQXVkaW8uZm9yRWFjaCgodHJhY2spID0+IHtcclxuICAgICAgICB0cmFjay5lbmFibGVkID0gdHJ1ZTtcclxuICAgIH0pO1xyXG4gICAgcHVibGlzaGVyLnN0YXJ0QXVkaW8oKTtcclxuXHJcbiAgICBzd2l0Y2hBdWRpb0J1dHRvbi5pbm5lclRleHQgPSBNVVRFX09VVEJPVU5EX0FVRElPO1xyXG4gICAgc3dpdGNoQXVkaW9CdXR0b24ub25jbGljayA9IG11dGVBdWRpbztcclxufVxyXG5hc3luYyBmdW5jdGlvbiBzdGFydFZpZGVvKCkge1xyXG4gICAgaWYgKHZpZGVvUmVzdHJpY3RlZCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBtZWRpYS5iaW5kRGV2aWNlcyhmYWxzZSwgdHJ1ZSk7XHJcbiAgICBpZiAoc3RyZWFtKSB7XHJcbiAgICAgICAgYXdhaXQgZGlzcGxheS51cGRhdGVPdXRib3VuZChzdHJlYW0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG91dGJvdW5kVmlkZW8gPSBtZWRpYS5vdXRib3VuZFRyYWNrcyhcInZpZGVvXCIpO1xyXG4gICAgb3V0Ym91bmRWaWRlby5mb3JFYWNoKCh0cmFjaykgPT4ge1xyXG4gICAgICAgIHRyYWNrLmVuYWJsZWQgPSB0cnVlO1xyXG4gICAgfSk7XHJcbiAgICBwdWJsaXNoZXIuc3RhcnRWaWRlbygpO1xyXG5cclxuICAgIHN3aXRjaFZpZGVvQnV0dG9uLmlubmVyVGV4dCA9IE1VVEVfT1VUQk9VTkRfVklERU87XHJcbiAgICBzd2l0Y2hWaWRlb0J1dHRvbi5vbmNsaWNrID0gc3RvcFZpZGVvO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzcGVha1RvU3Vicm9vbShidXR0b24sIHB1Ymxpc2hlcikge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlB1Ymxpc2hpbmcgaG9zdCBzdHJlYW0gaW50byBhIHN1YnJvb21cIik7XHJcbiAgICAgICAgcHVibGlzaGVyLnN0YXJ0QXVkaW8oKTtcclxuICAgICAgICBwdWJsaXNoZXIuc3RhcnRWaWRlbygpO1xyXG5cclxuICAgICAgICBidXR0b24uaW5uZXJUZXh0ID0gVU5TUEVBS19UT19TVUJST09NO1xyXG4gICAgICAgIGJ1dHRvbi5vbmNsaWNrID0gdW5zcGVha1RvU3Vicm9vbShidXR0b24sIHB1Ymxpc2hlcik7XHJcbiAgICB9O1xyXG59XHJcbmZ1bmN0aW9uIHVuc3BlYWtUb1N1YnJvb20oYnV0dG9uLCBwdWJsaXNoZXIpIHtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJVbnB1Ymxpc2hpbmcgaG9zdCBzdHJlYW0gaW50byBhIHN1YnJvb21cIik7XHJcbiAgICAgICAgcHVibGlzaGVyLnN0b3BBdWRpbygpO1xyXG4gICAgICAgIHB1Ymxpc2hlci5zdG9wVmlkZW8oKTtcclxuXHJcbiAgICAgICAgYnV0dG9uLmlubmVyVGV4dCA9IFNQRUFLX1RPX1NVQlJPT007XHJcbiAgICAgICAgYnV0dG9uLm9uY2xpY2sgPSBzcGVha1RvU3Vicm9vbShidXR0b24sIHB1Ymxpc2hlcik7XHJcbiAgICB9O1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiByZXN0cmljdEF1ZGlvKCkge1xyXG4gICAgYXVkaW9SZXN0cmljdGVkID0gdHJ1ZTtcclxuICAgIG11dGVBdWRpbygpO1xyXG59XHJcbmFzeW5jIGZ1bmN0aW9uIHJlc3RyaWN0VmlkZW8oKSB7XHJcbiAgICB2aWRlb1Jlc3RyaWN0ZWQgPSB0cnVlO1xyXG4gICAgc3RvcFZpZGVvKCk7XHJcbn1cclxuYXN5bmMgZnVuY3Rpb24gdW5yZXN0cmljdEF1ZGlvKCkge1xyXG4gICAgYXVkaW9SZXN0cmljdGVkID0gZmFsc2U7XHJcbiAgICB1bm11dGVBdWRpbygpO1xyXG59XHJcbmFzeW5jIGZ1bmN0aW9uIHVucmVzdHJpY3RWaWRlbygpIHtcclxuICAgIHZpZGVvUmVzdHJpY3RlZCA9IGZhbHNlO1xyXG4gICAgc3RhcnRWaWRlbygpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWR1Y2VSZXNvbHV0aW9uKCkge1xyXG4gICAgdmlkZW9Db25zdHJhaW50cy53aWR0aCA9IG1lZGlhLmxvd1Jlc1dpZHRoO1xyXG4gICAgdmlkZW9Db25zdHJhaW50cy5oZWlnaHQgPSBtZWRpYS5sb3dSZXNIZWlnaHQ7XHJcblxyXG4gICAgbWVkaWEub3V0Ym91bmRUcmFja3MoXCJ2aWRlb1wiKVxyXG4gICAgICAgIC5mb3JFYWNoKCh0cmFjaykgPT4ge1xyXG4gICAgICAgICAgICB0cmFjay5hcHBseUNvbnN0cmFpbnRzKHZpZGVvQ29uc3RyYWludHMpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk91dGJvdW5kIHZpZGVvIHJlc29sdXRpb24gcmVkdWNlZFwiLCB0cmFjay5nZXRTZXR0aW5ncygpKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBzd2l0Y2hSZXNvbHV0aW9uQnV0dG9uLmlubmVyVGV4dCA9IElOQ1JFQVNFX1JFU09MVVRJT047XHJcbiAgICBzd2l0Y2hSZXNvbHV0aW9uQnV0dG9uLm9uY2xpY2sgPSBpbmNyZWFzZVJlc29sdXRpb247XHJcbn1cclxuZnVuY3Rpb24gaW5jcmVhc2VSZXNvbHV0aW9uKCkge1xyXG4gICAgdmlkZW9Db25zdHJhaW50cy53aWR0aCA9IG1lZGlhLmhpZ2hSZXNXaWR0aDtcclxuICAgIHZpZGVvQ29uc3RyYWludHMuaGVpZ2h0ID0gbWVkaWEuaGlnaFJlc0hlaWdodDtcclxuXHJcbiAgICBtZWRpYS5vdXRib3VuZFRyYWNrcyhcInZpZGVvXCIpXHJcbiAgICAgICAgLmZvckVhY2goKHRyYWNrKSA9PiB7XHJcbiAgICAgICAgICAgIHRyYWNrLmFwcGx5Q29uc3RyYWludHModmlkZW9Db25zdHJhaW50cyk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT3V0Ym91bmQgdmlkZW8gcmVzb2x1dGlvbiBpbmNyZWFzZWRcIiwgdHJhY2suZ2V0U2V0dGluZ3MoKSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgc3dpdGNoUmVzb2x1dGlvbkJ1dHRvbi5pbm5lclRleHQgPSBSRURVQ0VfUkVTT0xVVElPTjtcclxuICAgIHN3aXRjaFJlc29sdXRpb25CdXR0b24ub25jbGljayA9IHJlZHVjZVJlc29sdXRpb247XHJcbn1cclxuZnVuY3Rpb24gcmVkdWNlRnBzKCkge1xyXG4gICAgdmlkZW9Db25zdHJhaW50cy5mcmFtZVJhdGUgPSBtZWRpYS5sb3dGUFM7XHJcblxyXG4gICAgbWVkaWEub3V0Ym91bmRUcmFja3MoXCJ2aWRlb1wiKVxyXG4gICAgICAgIC5mb3JFYWNoKCh0cmFjaykgPT4ge1xyXG4gICAgICAgICAgICB0cmFjay5hcHBseUNvbnN0cmFpbnRzKHZpZGVvQ29uc3RyYWludHMpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk91dGJvdW5kIHZpZGVvIEZQUyByZWR1Y2VkXCIsIHRyYWNrLmdldFNldHRpbmdzKCkpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIHN3aXRjaEZwc0J1dHRvbi5pbm5lclRleHQgPSBJTkNSRUFTRV9GUFM7XHJcbiAgICBzd2l0Y2hGcHNCdXR0b24ub25jbGljayA9IGluY3JlYXNlRnBzO1xyXG59XHJcbmZ1bmN0aW9uIGluY3JlYXNlRnBzKCkge1xyXG4gICAgdmlkZW9Db25zdHJhaW50cy5mcmFtZVJhdGUgPSBtZWRpYS5oaWdoRlBTO1xyXG5cclxuICAgIG1lZGlhLm91dGJvdW5kVHJhY2tzKFwidmlkZW9cIilcclxuICAgICAgICAuZm9yRWFjaCgodHJhY2spID0+IHtcclxuICAgICAgICAgICAgdHJhY2suYXBwbHlDb25zdHJhaW50cyh2aWRlb0NvbnN0cmFpbnRzKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJPdXRib3VuZCB2aWRlbyBGUFMgaW5jcmVhc2VkXCIsIHRyYWNrLmdldFNldHRpbmdzKCkpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIHN3aXRjaEZwc0J1dHRvbi5pbm5lclRleHQgPSBSRURVQ0VfRlBTO1xyXG4gICAgc3dpdGNoRnBzQnV0dG9uLm9uY2xpY2sgPSByZWR1Y2VGcHM7XHJcbn1cclxuXHJcbmNvbnN0IE1VVEVfT1VUQk9VTkRfQVVESU8gPSBcIk11dGVcIjtcclxuY29uc3QgVU5NVVRFX09VVEJPVU5EX0FVRElPID0gXCJVbm11dGVcIjtcclxuY29uc3QgTVVURV9PVVRCT1VORF9WSURFTyA9IFwiVW5zaGFyZSB2aWRlb1wiO1xyXG5jb25zdCBVTk1VVEVfT1VUQk9VTkRfVklERU8gPSBcIlNoYXJlIHZpZGVvXCI7XHJcbmNvbnN0IFNIQVJFX1NDUkVFTiA9IFwiU2hhcmUgc2NyZWVuXCI7XHJcbmNvbnN0IFVOU0hBUkVfU0NSRUVOID0gXCJVbnNoYXJlIHNjcmVlblwiO1xyXG5cclxuY29uc3QgU1BFQUtfVE9fU1VCUk9PTSA9IFwiU3BlYWsgdG8gdGhlIHJvb21cIjtcclxuY29uc3QgVU5TUEVBS19UT19TVUJST09NID0gXCJTdG9wIHNwZWFraW5nXCI7XHJcblxyXG5jb25zdCBJTkNSRUFTRV9SRVNPTFVUSU9OID0gXCJIRFwiO1xyXG5jb25zdCBSRURVQ0VfUkVTT0xVVElPTiA9IFwiTFFcIjtcclxuY29uc3QgSU5DUkVBU0VfRlBTID0gXCJGUFMrXCI7XHJcbmNvbnN0IFJFRFVDRV9GUFMgPSBcIkZQUy1cIjtcclxuIiwiY29uc3QgYWRhcHRlciA9IHJlcXVpcmUoJ3dlYnJ0Yy1hZGFwdGVyJyk7XHJcblxyXG5jb25zdCBtZXRyaWNzID0gcmVxdWlyZSgnLi4vc2VydmljZS9tZXRyaWNzJyk7XHJcbmNvbnN0IG1vZGVyYXRvciA9IHJlcXVpcmUoJy4uL3NlcnZpY2UvbW9kZXJhdG9yJyk7XHJcbmNvbnN0IGV4ZWN1dG9yID0gcmVxdWlyZSgnLi4vc2VydmljZS9leGVjdXRvcicpO1xyXG5jb25zdCBvdXRib3VuZCA9IHJlcXVpcmUoJy4vb3V0Ym91bmQnKTtcclxuY29uc3QgaW5ib3VuZCA9IHJlcXVpcmUoJy4vaW5ib3VuZCcpO1xyXG5jb25zdCBjaGF0ID0gcmVxdWlyZSgnLi9jaGF0Jyk7XHJcbmNvbnN0IGhvc3QgPSByZXF1aXJlKCcuL2hvc3QvaG9zdCcpO1xyXG5jb25zdCBkaXNwbGF5ID0gcmVxdWlyZSgnLi9kaXNwbGF5Jyk7XHJcbmNvbnN0IG1lZGlhID0gcmVxdWlyZSgnLi9tZWRpYScpO1xyXG5jb25zdCBzdWJyb29tID0gcmVxdWlyZSgnLi9zdWJyb29tJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIGluaXRpYWxpemUsXHJcbiAgICBqb2luLFxyXG59O1xyXG5cclxubGV0IGphbnVzQXBpID0gdW5kZWZpbmVkO1xyXG5sZXQgcm9vbUFwaSA9IHVuZGVmaW5lZDtcclxuXHJcbmxldCBwdWJsaXNoZXIgPSB1bmRlZmluZWQ7XHJcblxyXG5sZXQgc3Vic2NyaXB0aW9ucyA9IG5ldyBNYXAoKTtcclxuLy8gTWFwW01lbWJlcklkLCBTdWJzY3JpYmVyXVxyXG5cclxubGV0IHN1YnJvb21TdWJzY3JpcHRpb25zID0gbmV3IE1hcCgpO1xyXG4vLyBNYXBbUm9vbUlkLCBNYXBbTWVtYmVySWQsIFN1YnNjcmliZXJdXVxyXG5cclxubGV0IG1lbWJlciA9IHt9O1xyXG5cclxubGV0IHZpZXdKb2luRm9ybTtcclxubGV0IHZpZXdJbkNhbGxDb250YWluZXI7XHJcbmxldCB2aWV3Sm9pbkF1ZGlvSW5wdXQ7XHJcbmxldCB2aWV3Sm9pblZpZGVvSW5wdXQ7XHJcbmxldCB2aWV3Sm9pblRleHRJbnB1dDtcclxubGV0IHZpZXdKb2luU2NyZWVuSW5wdXQ7XHJcblxyXG5sZXQgbWV0cmljc0VuYWJsZWQ7XHJcbmxldCBtb2RlcmF0aW9uRW5hYmxlZDtcclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemUoX2phbnVzQXBpLCBfcm9vbUFwaSkge1xyXG4gICAgY29uc29sZS5hc3NlcnQoIXJvb21BcGksIFwiUm9vbUFQSSBpcyBhbHJlYWR5IGluaXRpYWxpemVkXCIpO1xyXG4gICAgcm9vbUFwaSA9IF9yb29tQXBpO1xyXG4gICAgamFudXNBcGkgPSBfamFudXNBcGk7XHJcblxyXG4gICAgdmlld0pvaW5Gb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJqb2luRm9ybVwiKTtcclxuICAgIHZpZXdJbkNhbGxDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImluLWNhbGxcIik7XHJcbiAgICB2aWV3Sm9pbkF1ZGlvSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImpvaW5BdWRpb1wiKTtcclxuICAgIHZpZXdKb2luVmlkZW9JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiam9pblZpZGVvXCIpO1xyXG4gICAgdmlld0pvaW5UZXh0SW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImpvaW5UZXh0XCIpO1xyXG4gICAgdmlld0pvaW5TY3JlZW5JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiam9pblNjcmVlblwiKTtcclxuXHJcbiAgICBleGVjdXRvci5pbml0aWFsaXplKGNoYW5nZSwgbW9uaXRvciwgdW5tb25pdG9yKTtcclxuICAgIHN1YnJvb20uaW5pdGlhbGl6ZSgpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBqb2luKHJvb21JZCwgcm9vbVBpbiwgcm9vbVNlY3JldCwgZGlzcGxheU5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljc09uID0gZmFsc2UsIG1vZGVyYXRpb25PbiA9IGZhbHNlKSB7XHJcbiAgICBpZiAoIXJvb21BcGkpIHtcclxuICAgICAgICB3aW5kb3cuYWxlcnQoXCJSb29tQVBJIGhhc24ndCBiZWVuIGF0dGFjaGVkLCB3YWl0IHVudGlsIHRoZSBwbHVnaW4gY29ubmVjdHNcIik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUuYXNzZXJ0KHJvb21JZCk7XHJcbiAgICBjb25zb2xlLmFzc2VydChkaXNwbGF5TmFtZSAmJiBkaXNwbGF5TmFtZSAhPT0gXCJcIik7XHJcbiAgICBjb25zb2xlLmxvZyhgSm9pbmluZyB0aGUgcm9vbSAke3Jvb21JZH0gd2l0aCBwaW4gJHtyb29tUGlufWApO1xyXG5cclxuICAgIG1ldHJpY3NFbmFibGVkID0gbWV0cmljc09uO1xyXG4gICAgbW9kZXJhdGlvbkVuYWJsZWQgPSBtb2RlcmF0aW9uT247XHJcblxyXG4gICAgbWVtYmVyLnJvb21JZCA9IHJvb21JZDtcclxuICAgIG1lbWJlci5yb29tUGluID0gcm9vbVBpbjtcclxuICAgIG1lbWJlci5kaXNwbGF5TmFtZSA9IGRpc3BsYXlOYW1lO1xyXG5cclxuICAgIHB1Ymxpc2hlciA9IGF3YWl0IHJvb21BcGkuY3JlYXRlUHVibGlzaGVyKCk7XHJcbiAgICBjb25zb2xlLmxvZyhcIlB1Ymxpc2hlciBjcmVhdGVkOlwiLCBwdWJsaXNoZXIpO1xyXG4gICAgZGlzcGxheS5pbml0aWFsaXplKHB1Ymxpc2hlcik7XHJcblxyXG4gICAgcHVibGlzaGVyLm9uKFwicmVtb3RlTWVtYmVySm9pbmVkXCIsIGFzeW5jIChqb2luZWQpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk5ldyByZW1vdGUgbWVtYmVyIGpvaW5lZDpcIiwgam9pbmVkKTtcclxuICAgICAgICAvL3dhaXRpbmcgZm9yIGpvaW5lZCBtZW1iZXIgdG8gc3RhcnQgcHVibGlzaGluZ1xyXG4gICAgfSk7XHJcbiAgICBwdWJsaXNoZXIub24oXCJyZW1vdGVNZW1iZXJMZWF2aW5nXCIsIGFzeW5jIChsZWF2aW5nKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJSZW1vdGUgbWVtYmVyIGlzIGxlYXZpbmc6XCIsIGxlYXZpbmcpO1xyXG4gICAgICAgIGRpc3BsYXkucmVtb3ZlSW5ib3VuZChsZWF2aW5nKTtcclxuICAgICAgICBzdWJzY3JpcHRpb25zLmRlbGV0ZShsZWF2aW5nKTtcclxuICAgIH0pO1xyXG4gICAgcHVibGlzaGVyLm9uKFwicHVibGlzaGVyc1VwZGF0ZWRcIiwgc3Vic2NyaWJlKTtcclxuXHJcbiAgICBjb25zdCBhdWRpb09uID0gdmlld0pvaW5BdWRpb0lucHV0LmNoZWNrZWQ7XHJcbiAgICBjb25zdCB2aWRlb09uID0gdmlld0pvaW5WaWRlb0lucHV0LmNoZWNrZWQ7XHJcbiAgICBjb25zdCBzY3JlZW5PbiA9IHZpZXdKb2luU2NyZWVuSW5wdXQuY2hlY2tlZDtcclxuXHJcbiAgICBjaGF0LmluaXRpYWxpemUocHVibGlzaGVyKTtcclxuICAgIGluYm91bmQuaW5pdGlhbGl6ZShzdWJzY3JpcHRpb25zLCBzdWJyb29tU3Vic2NyaXB0aW9ucyk7XHJcbiAgICBvdXRib3VuZC5pbml0aWFsaXplKHJvb21BcGksIHB1Ymxpc2hlciwgYXVkaW9PbiwgdmlkZW9Pbiwgc2NyZWVuT24sIG1lbWJlcik7XHJcbiAgICBtZWRpYS5pbml0aWFsaXplKHB1Ymxpc2hlci5wZWVyQ29ubmVjdGlvbik7XHJcblxyXG4gICAgaWYgKG1ldHJpY3NFbmFibGVkKSB7XHJcbiAgICAgICAgbWV0cmljcy5zY2hlZHVsZShwdWJsaXNoZXIsIHN1YnNjcmlwdGlvbnMpO1xyXG4gICAgfVxyXG5cclxuICAgIGF3YWl0IHB1Ymxpc2hlci5qb2luUm9vbUFuZFB1Ymxpc2gocm9vbUlkLCBkaXNwbGF5TmFtZSwgcm9vbVBpbilcclxuICAgICAgICAudGhlbihhc3luYyAocmVtb3RlUHVibGlzaGVycykgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkpvaW5lZCB0aGUgcm9vbTpcIiwgcm9vbUlkKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJMb2NhbCBtZW1iZXIgSUQ6XCIsIHB1Ymxpc2hlci5tZW1iZXJJZCk7XHJcbiAgICAgICAgICAgIGlmIChtb2RlcmF0aW9uRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbWVtYmVySWQgPSBwdWJsaXNoZXIubWVtYmVySWQ7IC8vc2F2aW5nIHRoZSBpZCBvdXRzaWRlIG9mIGxhbWJkYVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBpbnRyb2R1Y3Rpb24gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJOb3RpZnlpbmcgbW9kZXJhdGlvbiBzZXJ2aWNlIGFib3V0IHVzXCIsIHJvb21JZCwgbWVtYmVySWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZGVyYXRvci5zZW5kUmVxdWVzdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicm9vbUlkXCI6IHJvb21JZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJvcGVyYXRpb25cIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyZWdpc3RlclBhcnRpY2lwYW50XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1lbWJlcl9pZFwiOiBtZW1iZXJJZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyb29tU2VjcmV0ICE9PSBudWxsICYmIHJvb21TZWNyZXQgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWdpc3RlcmluZyBvdXJzZWx2ZXMgYXMgYSBtb2RlcmF0b3JcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGVyYXRvci5zZW5kUmVxdWVzdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInJvb21JZFwiOiByb29tSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm9wZXJhdGlvblwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZXRNb2RlcmF0b3JcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm1lbWJlcl9pZFwiOiBtZW1iZXJJZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWNyZXRcIjogcm9vbVNlY3JldCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwaW5cIjogcm9vbVBpblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgd2FzX25vdF9jb25uZWN0ZWQgPSBhd2FpdCBtb2RlcmF0b3IuY29ubmVjdChcclxuICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGlvbiB0byBtb2RlcmF0aW9uIHNlcnZpY2UgZXN0YWJsaXNoZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGludHJvZHVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIldpdGggdGhlIGdyZWF0IHBvd2VyIGNvbWVzIHRoZSBncmVhdCByZXNwb25zaWJpbGl0eSFcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvc3QuaW5pdGlhbGl6ZShtb2RlcmF0b3IsIGphbnVzQXBpLCByb29tSWQsIHJvb21TZWNyZXQsIG1vbml0b3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF3YXNfbm90X2Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGludHJvZHVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2aWV3Sm9pbkZvcm0uc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG4gICAgICAgICAgICB2aWV3SW5DYWxsQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlbW90ZSBwdWJsaXNoZXJzOlwiLCByZW1vdGVQdWJsaXNoZXJzKTtcclxuICAgICAgICAgICAgc3Vic2NyaWJlKHJlbW90ZVB1Ymxpc2hlcnMpO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgZGlzcGxheS51cGRhdGVPdXRib3VuZChhd2FpdCBtZWRpYS5iaW5kRGV2aWNlcyhhdWRpb09uLCB2aWRlb09uKSk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuY2F0Y2goKGUpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcclxuICAgICAgICAgICAgd2luZG93LmFsZXJ0KFwiQ291bGRuJ3QgY29ubmVjdC4gSXMgUElOIGNvcnJlY3Q/XCIpO1xyXG4gICAgICAgICAgICBwdWJsaXNoZXIucGVlckNvbm5lY3Rpb24uY2xvc2UoKTtcclxuICAgICAgICAgICAgcHVibGlzaGVyLmRlc3Ryb3koKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBmdW5jdGlvbiBzdWJzY3JpYmUoX3B1Ymxpc2hlcnMpIHtcclxuICAgICAgICBjb25zdCBwdWJsaXNoZXJzID0gZmlsdGVyUHVibGlzaGVycyhfcHVibGlzaGVycywgZmFsc2UpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU3Vic2NyaWJpbmcgdG9cIiwgcHVibGlzaGVycyk7XHJcbiAgICAgICAgcHVibGlzaGVycy5mb3JFYWNoKChyZW1vdGVQdWJsaXNoZXIpID0+IHtcclxuICAgICAgICAgICAgaWYgKCFkaXNwbGF5Lm1lbWJlckRpc3BsYXllZChyZW1vdGVQdWJsaXNoZXIuaWQpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN1YnNjcmliaW5nIHRvXCIsIHJlbW90ZVB1Ymxpc2hlci5pZCk7XHJcbiAgICAgICAgICAgICAgICByb29tQXBpLmNyZWF0ZVN1YnNjcmliZXIoKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKChzdWJzY3JpYmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmlwdGlvbnMuc2V0KHJlbW90ZVB1Ymxpc2hlci5pZCwgc3Vic2NyaWJlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXIucGVlckNvbm5lY3Rpb24ub25hZGRzdHJlYW0gPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXkudXBkYXRlSW5ib3VuZChldmVudC5zdHJlYW0sIHJlbW90ZVB1Ymxpc2hlci5pZCwgcmVtb3RlUHVibGlzaGVyLmRpc3BsYXkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpYmVyLm9uKCdkYXRhTWVzc2FnZScsKG1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTWVzc2FnZSByZWNlaXZlZFwiLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXQuYXBwZW5kTWVzc2FnZShtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWJzY3JpYmVyLmpvaW5Sb29tQW5kU3Vic2NyaWJlKHJvb21JZCwgcmVtb3RlUHVibGlzaGVyLmlkLCByb29tUGluKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkFscmVhZHkgc3Vic2NyaWJlZFwiLCByZW1vdGVQdWJsaXNoZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vdG9kbzogcmVmYWN0b3IgYGpvaW5gIG1ldGhvZCB0byBjYWxsIGBtb25pdG9yYCwgc28gdGhlcmUgd2lsbCBiZSBubyBjb3B5LXBhc3RlXHJcbmFzeW5jIGZ1bmN0aW9uIG1vbml0b3Iocm9vbUlkLCByb29tUGluLCBjb250YWluZXIsIGhvc3QgPSBmYWxzZSkge1xyXG4gICAgaWYgKCFyb29tQXBpKSB7XHJcbiAgICAgICAgd2luZG93LmFsZXJ0KFwiUm9vbUFQSSBoYXNuJ3QgYmVlbiBhdHRhY2hlZCwgd2FpdCB1bnRpbCB0aGUgcGx1Z2luIGNvbm5lY3RzXCIpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmFzc2VydChyb29tSWQpO1xyXG5cclxuICAgIGlmIChzdWJyb29tU3Vic2NyaXB0aW9ucy5nZXQocm9vbUlkKSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQWxyZWFkeSBtb25pdG9yaW5nXCIsIHJvb21JZCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBzdWJzY3JpcHRpb25zID0gbmV3IE1hcCgpO1xyXG4gICAgc3Vicm9vbVN1YnNjcmlwdGlvbnMuc2V0KHJvb21JZCwgc3Vic2NyaXB0aW9ucyk7XHJcblxyXG4gICAgY29uc29sZS5sb2coXCJTdGFydGluZyBtb25pdG9yaW5nIHRoZSByb29tXCIsIHJvb21JZCk7XHJcblxyXG4gICAgcHVibGlzaGVyID0gYXdhaXQgcm9vbUFwaS5jcmVhdGVQdWJsaXNoZXIoKTtcclxuICAgIGNvbnNvbGUubG9nKFwiUHVibGlzaGVyIGZvciBhIHN1Yi1yb29tIG1vbml0b3IgY3JlYXRlZDpcIiwgcHVibGlzaGVyKTtcclxuXHJcbiAgICBwdWJsaXNoZXIub24oXCJyZW1vdGVNZW1iZXJKb2luZWRcIiwgYXN5bmMgKGpvaW5lZCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTmV3IHJlbW90ZSBtZW1iZXIgam9pbmVkIHRvIHRoZSBzdWItcm9vbTpcIiwgam9pbmVkKTtcclxuICAgICAgICAvL3dhaXRpbmcgZm9yIGpvaW5lZCBtZW1iZXIgdG8gc3RhcnQgcHVibGlzaGluZ1xyXG4gICAgfSk7XHJcbiAgICBwdWJsaXNoZXIub24oXCJyZW1vdGVNZW1iZXJMZWF2aW5nXCIsIGFzeW5jIChsZWF2aW5nKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJSZW1vdGUgbWVtYmVyIGlzIGxlYXZpbmcgdGhlIHN1Yi1yb29tOlwiLCBsZWF2aW5nKTtcclxuICAgICAgICBkaXNwbGF5LnJlbW92ZUluYm91bmQobGVhdmluZyk7XHJcbiAgICAgICAgc3Vic2NyaXB0aW9ucy5kZWxldGUobGVhdmluZyk7XHJcbiAgICB9KTtcclxuICAgIHB1Ymxpc2hlci5vbihcInB1Ymxpc2hlcnNVcGRhdGVkXCIsIHN1YnNjcmliZSk7XHJcblxyXG4gICAgb3V0Ym91bmQuaW5pdGlhbGl6ZVN1YnJvb20ocm9vbUlkLCBwdWJsaXNoZXIpO1xyXG4gICAgbWVkaWEuaW5pdGlhbGl6ZShwdWJsaXNoZXIucGVlckNvbm5lY3Rpb24pO1xyXG5cclxuICAgIGlmIChtZXRyaWNzRW5hYmxlZCkge1xyXG4gICAgICAgIG1ldHJpY3Muc2NoZWR1bGUocHVibGlzaGVyLCBzdWJzY3JpcHRpb25zKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgc3VmZml4ID0gaG9zdCA/IEhPU1RfU1VGRklYIDogV0FUQ0hFUl9TVUZGSVg7XHJcbiAgICBhd2FpdCBwdWJsaXNoZXIuam9pblJvb21BbmRQdWJsaXNoKHJvb21JZCwgYCR7bWVtYmVyLmRpc3BsYXlOYW1lfSAke3N1ZmZpeH1gLCByb29tUGluKVxyXG4gICAgICAgIC50aGVuKGFzeW5jIChyZW1vdGVQdWJsaXNoZXJzKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSm9pbmVkIHRoZSBzdWItcm9vbSBmb3IgbW9uaXRvcmluZzpcIiwgcm9vbUlkKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZW1vdGUgcHVibGlzaGVycyBpbiB0aGUgc3ViLXJvb206XCIsIHJlbW90ZVB1Ymxpc2hlcnMpO1xyXG4gICAgICAgICAgICBzdWJzY3JpYmUocmVtb3RlUHVibGlzaGVycyk7XHJcbiAgICAgICAgICAgIHB1Ymxpc2hlci5zdG9wQXVkaW8oKTtcclxuICAgICAgICAgICAgcHVibGlzaGVyLnN0b3BWaWRlbygpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKChlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XHJcbiAgICAgICAgICAgIHB1Ymxpc2hlci5wZWVyQ29ubmVjdGlvbi5jbG9zZSgpO1xyXG4gICAgICAgICAgICBwdWJsaXNoZXIuZGVzdHJveSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIHN1YnNjcmliZShfcHVibGlzaGVycykge1xyXG4gICAgICAgIGNvbnN0IHB1Ymxpc2hlcnMgPSBmaWx0ZXJQdWJsaXNoZXJzKF9wdWJsaXNoZXJzLCB0cnVlKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlN1YnNjcmliaW5nIHRvXCIsIHB1Ymxpc2hlcnMpO1xyXG4gICAgICAgIHB1Ymxpc2hlcnMuZm9yRWFjaCgocmVtb3RlUHVibGlzaGVyKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghZGlzcGxheS5tZW1iZXJEaXNwbGF5ZWQocmVtb3RlUHVibGlzaGVyLmlkKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTdWJzY3JpYmluZyB0b1wiLCByZW1vdGVQdWJsaXNoZXIuaWQpO1xyXG4gICAgICAgICAgICAgICAgcm9vbUFwaS5jcmVhdGVTdWJzY3JpYmVyKClcclxuICAgICAgICAgICAgICAgICAgICAudGhlbigoc3Vic2NyaWJlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb25zLnNldChyZW1vdGVQdWJsaXNoZXIuaWQsIHN1YnNjcmliZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpYmVyLnBlZXJDb25uZWN0aW9uLm9uYWRkc3RyZWFtID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk1vbml0b3JpbmcgYSBzdHJlYW0gZnJvbSBzdWJyb29tXCIsIHJvb21JZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5LnVwZGF0ZUluYm91bmQoZXZlbnQuc3RyZWFtLCByZW1vdGVQdWJsaXNoZXIuaWQsIHJlbW90ZVB1Ymxpc2hlci5kaXNwbGF5LCBjb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuam9pblJvb21BbmRTdWJzY3JpYmUocm9vbUlkLCByZW1vdGVQdWJsaXNoZXIuaWQsIHJvb21QaW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiQWxyZWFkeSBzdWJzY3JpYmVkXCIsIHJlbW90ZVB1Ymxpc2hlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdW5tb25pdG9yKHJvb21JZCkge1xyXG4gICAgY29uc3Qgc3Vic2NyaXB0aW9ucyA9IHN1YnJvb21TdWJzY3JpcHRpb25zLmdldChyb29tSWQpO1xyXG4gICAgaWYgKCFzdWJzY3JpcHRpb25zKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihcIldlIGFyZSBub3QgbW9uaXRvcmluZyB0aGUgcm9vbVwiLCByb29tSWQpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBzdWJzY3JpcHRpb25zLmZvckVhY2goKHN1YnNjcmliZXIpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlVuc3Vic2NyaWJpbmcgZnJvbSBcIiwgc3Vic2NyaWJlci5kaXNwbGF5TmFtZSk7XHJcbiAgICAgICAgc3Vic2NyaWJlci5kZXN0cm95KCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBzdWJyb29tU3Vic2NyaXB0aW9ucy5kZWxldGUocm9vbUlkKTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gY2hhbmdlKHJvb21JZCwgcm9vbVBpbikge1xyXG4gICAgY29uc3QgcHJvbWlzZXMgPSBBcnJheS5mcm9tKHN1YnNjcmlwdGlvbnMudmFsdWVzKCkpXHJcbiAgICAgICAgLm1hcCgoc3Vic2NyaWJlcikgPT4gc3Vic2NyaWJlci5sZWF2ZVJvb20oKSk7XHJcbiAgICBwcm9taXNlcy5wdXNoKHB1Ymxpc2hlci5sZWF2ZVJvb20oKSk7XHJcbiAgICBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQocHJvbWlzZXMpO1xyXG4gICAgY29uc29sZS5sb2coXCJMZWZ0IHRoZSByb29tXCIsIG1lbWJlci5yb29tSWQpO1xyXG5cclxuICAgIGxldCByb29tU2VjcmV0ID0gbnVsbDsgLy93ZSBkb24ndCBjaGFuZ2Ugcm9vbSBhdXRvbWF0aWNhbGx5IGZvciBtb2RlcmF0b3JzICh5ZXQpXHJcbiAgICBhd2FpdCBqb2luKHJvb21JZCwgcm9vbVBpbiwgcm9vbVNlY3JldCwgbWVtYmVyLmRpc3BsYXlOYW1lLCBtZXRyaWNzRW5hYmxlZCwgbW9kZXJhdGlvbkVuYWJsZWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaWx0ZXJQdWJsaXNoZXJzKHB1Ymxpc2hlcnMsIHdlQXJlTW9uaXRvcmluZykge1xyXG4gICAgcmV0dXJuIHB1Ymxpc2hlcnMuZmlsdGVyKChwdWJsaXNoZXIpID0+IHtcclxuICAgICAgICBjb25zdCBuYW1lID0gcHVibGlzaGVyLmRpc3BsYXk7XHJcbiAgICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoV0FUQ0hFUl9TVUZGSVgpXHJcbiAgICAgICAgICAgfHwgKHdlQXJlTW9uaXRvcmluZyAmJiBuYW1lLmluY2x1ZGVzKEhPU1RfU1VGRklYKSkpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJGaWx0ZXJpbmcgb3V0IHB1Ymxpc2hlclwiLCBwdWJsaXNoZXIpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmNvbnN0IEhPU1RfU1VGRklYID0gXCIoaG9zdClcIjtcclxuY29uc3QgV0FUQ0hFUl9TVUZGSVggPSBcIih3YXRjaGluZylcIjsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIGluaXRpYWxpemUsXHJcbiAgICBjcmVhdGVNb25pdG9yLFxyXG4gICAgcmVtb3ZlTW9uaXRvclxyXG59O1xyXG5cclxubGV0IHZpZXdTdWJyb29tTW9uaXRvcnM7XHJcbmNvbnN0IG1vbml0b3JCeVN1YnJvb20gPSBuZXcgTWFwKCk7XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplKCkge1xyXG4gICAgdmlld1N1YnJvb21Nb25pdG9ycyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3Vicm9vbU1vbml0b3JzXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVNb25pdG9yKHN1YnJvb21JZCwgc3Vicm9vbVBpbiwgaG9zdENhbGxiYWNrcyA9IG51bGwpIHtcclxuICAgIGlmIChtb25pdG9yQnlTdWJyb29tLmdldChzdWJyb29tSWQpKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJNb25pdG9yIGZvciB0aGUgcm9vbSBpcyBhbHJlYWR5IGNyZWF0ZWRcIiwgc3Vicm9vbUlkKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGNvbnRhaW5lci5zdHlsZS5ib3JkZXIgPSBcInRoaWNrIHNvbGlkICMwMDAwRkZcIjtcclxuXHJcbiAgICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwXCIpO1xyXG4gICAgbGFiZWwuaW5uZXJUZXh0ID0gYFN1YnJvb20gJHtzdWJyb29tSWR9YDtcclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsYWJlbCk7XHJcblxyXG4gICAgaWYgKGhvc3RDYWxsYmFja3MpIHtcclxuICAgICAgICBjb25zdCBbbWVyZ2VSb29tRm4sIHByZXNlbnRSb29tRm5dID0gaG9zdENhbGxiYWNrcztcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkFwcGVuZGluZyBob3N0IGNvbnRyb2xzIHRvIHRoZSBzdWJyb29tIG1vbml0b3JcIiwgbWVyZ2VSb29tRm4pO1xyXG4gICAgICAgIGNvbnN0IG1lcmdlQnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgICAgICBtZXJnZUJ1dHRvbi5pbm5lclRleHQgPSBcIk1lcmdlIHRoZW0gYmFja1wiO1xyXG4gICAgICAgIG1lcmdlQnV0dG9uLm9uY2xpY2sgPSBtZXJnZVJvb21GbjtcclxuXHJcbiAgICAgICAgY29uc3Qgc3BlYWtCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgICAgIHNwZWFrQnV0dG9uLmlkID0gYHNwZWFrLSR7c3Vicm9vbUlkfWA7XHJcblxyXG4gICAgICAgIGNvbnN0IHByZXNlbnRCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgICAgIHByZXNlbnRCdXR0b24uaW5uZXJUZXh0ID0gXCJQcmVzZW50IHRvIHRoZSBjbGFzc1wiO1xyXG4gICAgICAgIHByZXNlbnRCdXR0b24ub25jbGljayA9IHByZXNlbnRSb29tRm47XHJcblxyXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChtZXJnZUJ1dHRvbik7XHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHByZXNlbnRCdXR0b24pO1xyXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChzcGVha0J1dHRvbik7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbW9uaXRvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBtb25pdG9yQnlTdWJyb29tLnNldChzdWJyb29tSWQsIGNvbnRhaW5lcik7XHJcbiAgICBtb25pdG9yLmNsYXNzTmFtZSA9IFwiZ3JpZC1jb250YWluZXJcIjtcclxuXHJcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobW9uaXRvcik7XHJcbiAgICB2aWV3U3Vicm9vbU1vbml0b3JzLmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XHJcblxyXG4gICAgY29uc29sZS5sb2coXCJNb25pdG9yIGNyZWF0ZWRcIiwgc3Vicm9vbUlkKTtcclxuICAgIHJldHVybiBtb25pdG9yO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVNb25pdG9yKHN1YnJvb21JZCkge1xyXG4gICAgY29uc3QgbW9uaXRvciA9IG1vbml0b3JCeVN1YnJvb20uZ2V0KHN1YnJvb21JZCk7XHJcbiAgICBjb25zb2xlLmFzc2VydChtb25pdG9yLCBgTW9uaXRvciBmb3Igcm9vbSAke3N1YnJvb21JZH0gZG9lc24ndCBleGlzdGApO1xyXG4gICAgbW9uaXRvckJ5U3Vicm9vbS5kZWxldGUoc3Vicm9vbUlkKTtcclxuICAgIG1vbml0b3IucmVtb3ZlKCk7XHJcblxyXG4gICAgY29uc29sZS5sb2coXCJNb25pdG9yIHJlbW92ZWRcIiwgc3Vicm9vbUlkKTtcclxufSIsImNvbnN0IHN1YnJvb20gPSByZXF1aXJlKCcuLi9yb29tL3N1YnJvb20nKTtcclxuY29uc3Qgb3V0Ym91bmQgPSByZXF1aXJlKCcuLi9yb29tL291dGJvdW5kJyk7XHJcbmNvbnN0IGRpc3BsYXkgPSByZXF1aXJlKCcuLi9yb29tL2Rpc3BsYXknKTtcclxuY29uc3QgbWVkaWEgPSByZXF1aXJlKCcuLi9yb29tL21lZGlhJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIGluaXRpYWxpemUsXHJcbiAgICBleGVjdXRlXHJcbn07XHJcblxyXG5sZXQgY2hhbmdlUm9vbUZuID0gdW5kZWZpbmVkO1xyXG5sZXQgbW9uaXRvckZuID0gdW5kZWZpbmVkO1xyXG5sZXQgdW5tb25pdG9yRm4gPSB1bmRlZmluZWQ7XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplKF9jaGFuZ2VSb29tRm4sIF9tb25pdG9yRm4sIF91bm1vbml0b3JGbikge1xyXG4gICAgY29uc29sZS5hc3NlcnQoIWNoYW5nZVJvb21GbiwgXCJBbHJlYWR5IGluaXRpYWxpemVkXCIpO1xyXG4gICAgY29uc29sZS5hc3NlcnQoIW1vbml0b3JGbiwgXCJBbHJlYWR5IGluaXRpYWxpemVkXCIpO1xyXG4gICAgY2hhbmdlUm9vbUZuID0gX2NoYW5nZVJvb21GbjtcclxuICAgIG1vbml0b3JGbiA9IF9tb25pdG9yRm47XHJcbiAgICB1bm1vbml0b3JGbiA9IF91bm1vbml0b3JGbjtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShjb21tYW5kKSB7XHJcbiAgICBpZiAoY29tbWFuZCA9PT0gXCJSZXN0cmljdEF1ZGlvXCIpIHtcclxuICAgICAgICBvdXRib3VuZC5yZXN0cmljdEF1ZGlvKCk7XHJcbiAgICB9XHJcbiAgICBpZiAoY29tbWFuZCA9PT0gXCJSZXN0cmljdFZpZGVvXCIpIHtcclxuICAgICAgICBvdXRib3VuZC5yZXN0cmljdFZpZGVvKCk7XHJcbiAgICB9XHJcbiAgICBpZiAoY29tbWFuZCA9PT0gXCJVbnJlc3RyaWN0QXVkaW9cIikge1xyXG4gICAgICAgIG91dGJvdW5kLnVucmVzdHJpY3RBdWRpbygpO1xyXG4gICAgfVxyXG4gICAgaWYgKGNvbW1hbmQgPT09IFwiVW5yZXN0cmljdFZpZGVvXCIpIHtcclxuICAgICAgICBvdXRib3VuZC51bnJlc3RyaWN0VmlkZW8oKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY29tbWFuZFtcIkNoYW5nZVJvb21cIl0pIHtcclxuICAgICAgICBsZXQgW3RhcmdldElkLCB0YXJnZXRQaW5dID0gY29tbWFuZFtcIkNoYW5nZVJvb21cIl07XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJDaGFuZ2luZyByb29tIHRvXCIsIHRhcmdldElkKTtcclxuXHJcbiAgICAgICAgZGlzcGxheS5jbGVhckluYm91bmQoKTtcclxuICAgICAgICBvdXRib3VuZC5kZWluaXRpYWxpemUoKTtcclxuICAgICAgICBtZWRpYS5kZWluaXRpYWxpemUoKTtcclxuICAgICAgICBhd2FpdCBjaGFuZ2VSb29tRm4odGFyZ2V0SWQsIHRhcmdldFBpbik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGNvbW1hbmRbXCJXYXRjaFJvb21cIl0pIHtcclxuICAgICAgICBsZXQgW3N1YnJvb21JZCwgc3Vicm9vbVBpbl0gPSBjb21tYW5kW1wiV2F0Y2hSb29tXCJdO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiV2F0Y2hpbmcgcm9vbVwiLCBzdWJyb29tSWQpO1xyXG5cclxuICAgICAgICBjb25zdCBkaXNwbGF5ID0gc3Vicm9vbS5jcmVhdGVNb25pdG9yKHN1YnJvb21JZCwgc3Vicm9vbVBpbik7XHJcbiAgICAgICAgbW9uaXRvckZuKHN1YnJvb21JZCwgc3Vicm9vbVBpbiwgZGlzcGxheSk7XHJcbiAgICB9XHJcbiAgICBpZiAoY29tbWFuZFtcIlVud2F0Y2hSb29tXCJdKSB7XHJcbiAgICAgICAgbGV0IHN1YnJvb21JZCA9IGNvbW1hbmRbXCJVbndhdGNoUm9vbVwiXTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlVud2F0Y2hpbmcgcm9vbVwiLCBzdWJyb29tSWQpO1xyXG5cclxuICAgICAgICBzdWJyb29tLnJlbW92ZU1vbml0b3Ioc3Vicm9vbUlkKTtcclxuICAgICAgICB1bm1vbml0b3JGbihzdWJyb29tSWQpO1xyXG4gICAgfVxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgc2NoZWR1bGUsXHJcbn07XHJcblxyXG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcclxuY29uc3Qgd2Vic29ja2V0ID0gcmVxdWlyZSgnLi93ZWJzb2NrZXQnKTtcclxuXHJcbmNvbnN0IGFkYXB0ZXIgPSByZXF1aXJlKCd3ZWJydGMtYWRhcHRlcicpO1xyXG5cclxubGV0IGdhdGhlcmVyID0gdW5kZWZpbmVkO1xyXG5cclxuZnVuY3Rpb24gY29ubmVjdCgpIHtcclxuICAgIGlmICghZ2F0aGVyZXIpIHtcclxuICAgICAgICBnYXRoZXJlciA9IHdlYnNvY2tldC5jb25uZWN0KFxyXG4gICAgICAgICAgICBjb25maWcuZ2F0aGVyZXIudXJsLFxyXG4gICAgICAgICAgICBcIm1ldHJpY3MgZ2F0aGVyZXJcIixcclxuICAgICAgICAgICAgKCkgPT4ge30sXHJcbiAgICAgICAgICAgICgpID0+IHt9LFxyXG4gICAgICAgICAgICAoKSA9PiB7IGdhdGhlcmVyID0gdW5kZWZpbmVkOyB9LFxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNjaGVkdWxlKHB1Ymxpc2hlciwgc3Vic2NyaXB0aW9ucykge1xyXG4gICAgY29ubmVjdCgpO1xyXG4gICAgd2luZG93LnNldEludGVydmFsKCgpID0+IGNvbm5lY3QoKSxcclxuICAgICAgICBjb25maWcuZ2F0aGVyZXIuY29ubmVjdGlvbkludGVydmFsICogMTAwMCk7XHJcblxyXG4gICAgd2luZG93LnNldEludGVydmFsKGFzeW5jICgpID0+IHtcclxuICAgICAgICBpZiAoIWdhdGhlcmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBtZXRyaWNzID0ge1xyXG4gICAgICAgICAgICBcInJvb21JZFwiOiBwdWJsaXNoZXIucm9vbUlkLFxyXG4gICAgICAgICAgICBcIm1lbWJlcklkXCI6IHB1Ymxpc2hlci5tZW1iZXJJZCxcclxuICAgICAgICAgICAgXCJvdXRib3VuZFwiOiBhd2FpdCBnYXRoZXJPdXRib3VuZChwdWJsaXNoZXIpLFxyXG4gICAgICAgICAgICBcImluYm91bmRcIjogYXdhaXQgZ2F0aGVySW5ib3VuZChzdWJzY3JpcHRpb25zKVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGdhdGhlcmVyLnNlbmQoSlNPTi5zdHJpbmdpZnkobWV0cmljcykpO1xyXG4gICAgfSwgY29uZmlnLmdhdGhlcmVyLnJlcG9ydGluZ0ludGVydmFsICogMTAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2F0aGVyT3V0Ym91bmQocHVibGlzaGVyKSB7XHJcbiAgICByZXR1cm4gcHVibGlzaGVyLnBlZXJDb25uZWN0aW9uLmdldFN0YXRzKCkudGhlbigocmVwb3J0KSA9PiB7XHJcbiAgICAgICAgY29uc3QgbWV0cmljcyA9IHsgYXVkaW86IHt9LCB2aWRlbzoge30gfTtcclxuXHJcbiAgICAgICAgcmVwb3J0LmZvckVhY2goKGVudHJ5KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSBcIm91dGJvdW5kLXJ0cFwiKSB7XHJcbiAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLmJ5dGVzU2VudCA9IGVudHJ5LmJ5dGVzU2VudDtcclxuICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0uaGVhZGVyQnl0ZXNTZW50ID0gZW50cnkuaGVhZGVyQnl0ZXNTZW50O1xyXG4gICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS5yZXRyYW5zbWl0dGVkQnl0ZXNTZW50ID0gZW50cnkucmV0cmFuc21pdHRlZEJ5dGVzU2VudDtcclxuICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0udGltZXN0YW1wID0gZW50cnkudGltZXN0YW1wO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSBcInJlbW90ZS1pbmJvdW5kLXJ0cFwiKSB7XHJcbiAgICAgICAgICAgICAgICAvL2xvb2tzIGxpa2Ugb25seSBDaHJvbWUgcHJvdmlkZXMgdGhlc2UgbWV0cmljcyB0eXBlXHJcbiAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLnJvdW5kVHJpcFRpbWUgPSBlbnRyeS5yb3VuZFRyaXBUaW1lO1xyXG5cclxuICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0uaml0dGVyID0gZW50cnkuaml0dGVyO1xyXG4gICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS5wYWNrZXRzTG9zdCA9IGVudHJ5LnBhY2tldHNMb3N0O1xyXG4gICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS5wYWNrZXRzUmVjZWl2ZWQgPSBlbnRyeS5wYWNrZXRzUmVjZWl2ZWQ7XHJcbiAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLmJ5dGVzUmVjZWl2ZWQgPSBlbnRyeS5ieXRlc1JlY2VpdmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChlbnRyeS5raW5kID09PSBcInZpZGVvXCIgJiYgZW50cnkudHlwZSA9PT0gXCJtZWRpYS1zb3VyY2VcIikge1xyXG4gICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS5mcmFtZXNQZXJTZWNvbmQgPSBlbnRyeS5mcmFtZXNQZXJTZWNvbmQ7XHJcbiAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLmZyYW1lUmVzb2x1dGlvbiA9IHsgXCJoZWlnaHRcIjogZW50cnkuaGVpZ2h0LCBcIndpZHRoXCI6IGVudHJ5LndpZHRoIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gbWV0cmljcztcclxuICAgIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnYXRoZXJJbmJvdW5kKHN1YnNjcmlwdGlvbnMpIHtcclxuICAgIHJldHVybiBQcm9taXNlLmFsbFNldHRsZWQoQXJyYXkuZnJvbShzdWJzY3JpcHRpb25zLCBhc3luYyAoW21lbWJlcklkLCBzdWJzY3JpYmVyXSkgPT4ge1xyXG4gICAgICAgIHJldHVybiBzdWJzY3JpYmVyLnBlZXJDb25uZWN0aW9uLmdldFN0YXRzKCkudGhlbigocmVwb3J0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1ldHJpY3MgPSB7IGF1ZGlvOiB7fSwgdmlkZW86IHt9IH07XHJcblxyXG4gICAgICAgICAgICByZXBvcnQuZm9yRWFjaCgoZW50cnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSBcInJlbW90ZS1vdXRib3VuZC1ydHBcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vbG9va3MgbGlrZSBvbmx5IENocm9tZSBwcm92aWRlcyB0aGVzZSBtZXRyaWNzIHR5cGVcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLmJ5dGVzU2VudCA9IGVudHJ5LmJ5dGVzU2VudDtcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLnBhY2tldHNTZW50ID0gZW50cnkucGFja2V0c1NlbnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gXCJpbmJvdW5kLXJ0cFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9mb3IgdmlkZW8gc3RyZWFtcywgaXQgaXMgcG9zc2libGUgdG8gZ3JhYiBcImZyYW1lcmF0ZU1lYW5cIlxyXG4gICAgICAgICAgICAgICAgICAgIC8vYnV0IGFkZXF1YXRlIHJlcHJlc2VudGF0aW9uIG9mIHRoaXMgZGF0YSB3b3VsZCByZXF1aXJlIG1vcmUgZWZmb3J0LFxyXG4gICAgICAgICAgICAgICAgICAgIC8vaW5jbHVkaW5nIGdyb3VwaW5nIGJ5IHB1Ymxpc2hlciBhbmQgYXZlcmFnaW5nIG9uIHRoZSBzZXJ2ZXIgc2lkZVxyXG4gICAgICAgICAgICAgICAgICAgIC8vaW4gb3JkZXIgdG8gc2VlIGhvdyBtdWNoIEZQUyB3ZSBsb3NlIHBlciBldmVyeSBwdWJsaXNoZXJcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS50aW1lc3RhbXAgPSBlbnRyeS50aW1lc3RhbXA7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS5qaXR0ZXIgPSBlbnRyeS5qaXR0ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS5ieXRlc1JlY2VpdmVkID0gZW50cnkuYnl0ZXNSZWNlaXZlZDtcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLmhlYWRlckJ5dGVzUmVjZWl2ZWQgPSBlbnRyeS5oZWFkZXJCeXRlc1JlY2VpdmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0ucGFja2V0c1JlY2VpdmVkID0gZW50cnkucGFja2V0c1JlY2VpdmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0ucGFja2V0c0xvc3QgPSBlbnRyeS5wYWNrZXRzTG9zdDtcclxuICAgICAgICAgICAgICAgICAgICAvL3RoZXNlIG1ldHJpY3MgYXJlIHBvc3NpYmxlIHRvIGFnZ3JlZ2F0ZSBieSBwdWJsaXNoZXIgYXMgd2VsbCxcclxuICAgICAgICAgICAgICAgICAgICAvL2J1dCBpbiBjb250cmFzdCB0byBcImZyYW1lcmF0ZU1lYW5cIiB0aGV5IGFyZSBhbHNvIHVzZWZ1bFxyXG4gICAgICAgICAgICAgICAgICAgIC8vaWYgd2UgYWdncmVnYXRlIHRoZW0gYnkgc3Vic2NyaWJlcjsgaW4gdGhpcyBjYXNlLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vdGhleSBhcmUgZGlzcGxheSBmaXRuZXNzIG9mIG5ldHdvcmsgY29uZGl0aW9uc1xyXG4gICAgICAgICAgICAgICAgICAgIC8vdG8gdGhlIGN1cnJlbnQgbG9hZFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIG1ldHJpY3M7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KSkudGhlbigocmVzdWx0cykgPT4ge1xyXG4gICAgICAgIGNvbnN0IHplcm9zID0ge1xyXG4gICAgICAgICAgICBcImNvdW50XCI6IDAsXHJcbiAgICAgICAgICAgIFwidGltZXN0YW1wXCI6IDAsXHJcbiAgICAgICAgICAgIFwiaml0dGVyXCI6IDAsXHJcbiAgICAgICAgICAgIFwiYnl0ZXNTZW50XCI6IDAsXHJcbiAgICAgICAgICAgIFwiYnl0ZXNSZWNlaXZlZFwiOiAwLFxyXG4gICAgICAgICAgICBcInBhY2tldHNSZWNlaXZlZFwiOiAwLFxyXG4gICAgICAgICAgICBcInBhY2tldHNMb3N0XCI6IDAsXHJcbiAgICAgICAgfTtcclxuICAgICAgICBjb25zdCB0b3RhbCA9IHtcclxuICAgICAgICAgICAgXCJhdWRpb1wiOiBPYmplY3QuYXNzaWduKHt9LCB6ZXJvcyksXHJcbiAgICAgICAgICAgIFwidmlkZW9cIjogemVyb3NcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXN1bHRzXHJcbiAgICAgICAgICAgIC5maWx0ZXIoKHJlc3VsdCkgPT4gcmVzdWx0LnN0YXR1cyA9PT0gXCJmdWxmaWxsZWRcIilcclxuICAgICAgICAgICAgLm1hcCgocmVzdWx0KSA9PiByZXN1bHQudmFsdWUpXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKChyZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGtpbmQgb2YgW1wiYXVkaW9cIiwgXCJ2aWRlb1wiXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsW2tpbmRdLmNvdW50ICs9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxba2luZF0udGltZXN0YW1wICs9IHJlc3VsdFtraW5kXS50aW1lc3RhbXA7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxba2luZF0uaml0dGVyICs9IHJlc3VsdFtraW5kXS5qaXR0ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxba2luZF0uYnl0ZXNTZW50ICs9IHJlc3VsdFtraW5kXS5ieXRlc1NlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxba2luZF0uYnl0ZXNSZWNlaXZlZCArPSByZXN1bHRba2luZF0uYnl0ZXNSZWNlaXZlZDtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFtraW5kXS5wYWNrZXRzUmVjZWl2ZWQgKz0gcmVzdWx0W2tpbmRdLnBhY2tldHNSZWNlaXZlZDtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFtraW5kXS5wYWNrZXRzTG9zdCArPSByZXN1bHRba2luZF0ucGFja2V0c0xvc3Q7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBtZXRyaWNzID0geyBhdWRpbzoge30sIHZpZGVvOiB7fSB9O1xyXG5cclxuICAgICAgICBmb3IgKGxldCBraW5kIG9mIFtcImF1ZGlvXCIsIFwidmlkZW9cIl0pIHtcclxuICAgICAgICAgICAgbWV0cmljc1traW5kXS50aW1lc3RhbXAgPSB0b3RhbFtraW5kXS50aW1lc3RhbXAgLyB0b3RhbFtraW5kXS5jb3VudDtcclxuICAgICAgICAgICAgbWV0cmljc1traW5kXS5qaXR0ZXIgPSB0b3RhbFtraW5kXS5qaXR0ZXIgLyB0b3RhbFtraW5kXS5jb3VudDtcclxuICAgICAgICAgICAgbWV0cmljc1traW5kXS5ieXRlc1NlbnQgPSB0b3RhbFtraW5kXS5ieXRlc1NlbnQ7XHJcbiAgICAgICAgICAgIG1ldHJpY3Nba2luZF0uYnl0ZXNSZWNlaXZlZCA9IHRvdGFsW2tpbmRdLmJ5dGVzUmVjZWl2ZWQ7XHJcbiAgICAgICAgICAgIG1ldHJpY3Nba2luZF0ucGFja2V0c1JlY2VpdmVkID0gdG90YWxba2luZF0ucGFja2V0c1JlY2VpdmVkO1xyXG4gICAgICAgICAgICBtZXRyaWNzW2tpbmRdLnBhY2tldHNMb3N0ID0gdG90YWxba2luZF0ucGFja2V0c0xvc3Q7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWV0cmljcztcclxuICAgIH0pO1xyXG59XHJcbiIsImNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xyXG5jb25zdCB3ZWJzb2NrZXQgPSByZXF1aXJlKCcuL3dlYnNvY2tldCcpO1xyXG5jb25zdCBleGVjdXRvciA9IHJlcXVpcmUoJy4vZXhlY3V0b3InKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgY29ubmVjdCxcclxuICAgIHNlbmRSZXF1ZXN0LFxyXG5cclxuICAgIG9uZXNob3QsXHJcbn07XHJcblxyXG5sZXQgaW5zdGFuY2UgPSB1bmRlZmluZWQ7XHJcblxyXG5mdW5jdGlvbiBjb25uZWN0KG9uT3Blbiwgd2hlbk1vZGVyYXRpb25BbGxvd2VkKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIF8pID0+IHtcclxuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgcmVzb2x2ZShmYWxzZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IHRpbWVySWQgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgbGV0IGVzdGFibGlzaGluZyA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghaW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IHdlYnNvY2tldC5jb25uZWN0KFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWcubW9kZXJhdG9yLnVybCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtb2RlcmF0b3Igc2VydmljZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbk9wZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzeW5jIChtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5lcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IobWVzc2FnZS5lcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29tbWFuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29tbWFuZCByZWNlaXZlZFwiLCBtZXNzYWdlLmNvbW1hbmQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kID09PSBcIkFsbG93TW9kZXJhdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW5Nb2RlcmF0aW9uQWxsb3dlZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kW1wiQ2hhbmdlUm9vbVwiXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNsb3NpbmcgZXhpc3RpbmcgbW9kZXJhdG9yIGNvbm5lY3Rpb24gZHVlIHRvIHRoZSBjaGFuZ2Ugb2Ygcm9vbVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hbGxvd2luZyB0byB1cGRhdGUgdGhpcyBsYW1iZGEgd2l0aCBuZXcgZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmFzc2VydCh0aW1lcklkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwodGltZXJJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShtZXNzYWdlLmNvbW1hbmQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJVbmV4cGVjdGVkIHJlc3BvbnNlXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBlc3RhYmxpc2hpbmcoKTtcclxuICAgICAgICAgICAgdGltZXJJZCA9IHdpbmRvdy5zZXRJbnRlcnZhbCgoKSA9PiBlc3RhYmxpc2hpbmcoKSxcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5tb2RlcmF0b3IuY29ubmVjdGlvbkludGVydmFsICogMTAwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uZXNob3QoYWN0aW9uKSB7XHJcbiAgICBjb25zb2xlLmFzc2VydCghaW5zdGFuY2UpO1xyXG5cclxuICAgIHdlYnNvY2tldC5jb25uZWN0KFxyXG4gICAgICAgIGNvbmZpZy5tb2RlcmF0b3IudXJsLFxyXG4gICAgICAgIFwibW9kZXJhdG9yIHNlcnZpY2VcIixcclxuICAgICAgICAoc29ja2V0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTWFkZSBhIG9uZS1zaG90IGNvbm5lY3Rpb24gdG8gbW9kZXJhdGluZyBzZXJ2aWNlXCIpO1xyXG4gICAgICAgICAgICBhY3Rpb24oc29ja2V0KTtcclxuICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoc29ja2V0LmNsb3NlLmJpbmQoc29ja2V0KSwgMzAwMCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICAoKSA9PiB7fSxcclxuICAgICAgICAoKSA9PiB7fVxyXG4gICAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2VuZFJlcXVlc3QocmVxdWVzdCkge1xyXG4gICAgY29uc29sZS5hc3NlcnQoaW5zdGFuY2UsIFwiTW9kZXJhdG9yIHNlcnZpY2UgaXMgbm90IGNvbm5lY3RlZFwiKTtcclxuICAgIGluc3RhbmNlLnNlbmQoSlNPTi5zdHJpbmdpZnkocmVxdWVzdCkpO1xyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgY29ubmVjdCxcclxufTtcclxuXHJcbmNvbnN0IFdlYlNvY2tldCA9IHJlcXVpcmUoJ2lzb21vcnBoaWMtd3MnKTtcclxuXHJcbmZ1bmN0aW9uIGNvbm5lY3QodXJsLCBsYWJlbCwgb25vcGVuLCBvbm1lc3NhZ2UsIG9uY2xvc2UpIHtcclxuICAgIGxldCBzb2NrZXQ7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybCk7XHJcblxyXG4gICAgICAgIHNvY2tldC5vbmVycm9yID0gKGUpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKGUpO1xyXG4gICAgICAgICAgICBvbmNsb3NlKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBzb2NrZXQub25vcGVuID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgQ29ubmVjdGVkIHRvICR7bGFiZWx9YCk7XHJcbiAgICAgICAgICAgIG9ub3Blbihzb2NrZXQpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgc29ja2V0Lm9ubWVzc2FnZSA9IChtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTWVzc2FnZSByZWNlaXZlZFwiLCBtZXNzYWdlLmRhdGEpO1xyXG4gICAgICAgICAgICBvbm1lc3NhZ2UoSlNPTi5wYXJzZShtZXNzYWdlLmRhdGEpKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHNvY2tldC5vbmNsb3NlID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgRGlzY29ubmVjdGVkIGZyb20gJHtsYWJlbH1gKTtcclxuICAgICAgICAgICAgb25jbG9zZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgICAgIHNvY2tldCA9IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc29ja2V0O1xyXG59XHJcbiJdfQ==
