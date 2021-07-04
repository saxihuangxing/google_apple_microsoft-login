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
const adapter = require('webrtc-adapter');

const room = require('../room/room');
const config = require('../config');
const links = require('../links');

let janusApi = undefined;

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);

    const viewRoomsList = document.getElementById("roomsList");
    const viewRoomsListBlock = document.getElementById("roomsListBlock");
    const viewRoomIdInput = document.getElementById("roomIdInput");
    const viewRoomPinInput = document.getElementById("roomPinInput");
    const viewRoomSecretInput = document.getElementById("roomSecretInput");
    const viewDisplayNameInput = document.getElementById("displayNameInput");
    let userName = localStorage.getItem("userName");
    console.log("userName ===== " + userName.split('@')[0]);
    if(userName) {
      console.log("userName ===== " + userName.split('@')[0]);
        viewDisplayNameInput.value = userName.split('@')[0];
    }
    const viewJoinButton = document.getElementById("join");

    viewJoinButton.onclick = join;

    const metricsEnabled = urlParams.get("no-metrics") !== "";
    console.log("Metrics enabled?", metricsEnabled);

    const moderationEnabled = urlParams.get("no-moderation") !== "";
    console.log("Moderation enabled?", moderationEnabled);

    let roomId = Number(urlParams.get(links.roomIdParam));
    let roomPin = urlParams.get(links.roomPinParam);
    let roomSecret = urlParams.get(links.roomSecretParam);

    if (!!roomId && roomId !== "") {
        viewRoomIdInput.value = roomId;
        viewRoomIdInput.disabled = true;
        viewRoomsListBlock.hidden = true;
    }
    if (!!roomPin && roomPin !== "") {
        viewRoomPinInput.value = roomPin;
        viewRoomPinInput.disabled = true;
    }
    if (!!roomSecret && roomSecret !== "") {
        viewRoomSecretInput.value = roomSecret;
        viewRoomSecretInput.disabled = true;
    }

    (new api.Janus(config.janus, console)).connect()
        .then((connected) => {
            janusApi = connected;
            console.log("Janus connected:", janusApi);
            return attach();
        });

    function Logout(){
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/user/logout');
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onload = function() {
            console.log('Signed out as: ' + xhr.responseText);
            let result = JSON.parse(xhr.responseText);
            if(result.code === 0){
                window.location.href = "login.html";
            }
        };
        xhr.send("");
    }
    let logoutTag = document.getElementById('logoutTag');
    logoutTag.onclick = Logout;
    let span = document.getElementById('userName');
   // let userName = localStorage.getItem("userName");
    span.innerText = userName;

    async function attach() {
        const roomApi = await janusApi.addPlugin(new api.VideoRoom(console, config.ice, false));
        console.log("VideoRoom plugin attached:", roomApi);

        room.initialize(janusApi, roomApi);

        return roomApi.listRooms().then((rooms) => {
            rooms.forEach((room) => {
                const option = document.createElement("option");
                option.value = room.room; //id

                const description = document.createTextNode(room.description);
                option.appendChild(description);
                viewRoomsList.appendChild(option);
            });
        });
    }

    async function join() {
        roomId = viewRoomIdInput.value;
        if (roomId !== "") {
            roomId = Number(roomId);
        } else {
            roomId = Number(viewRoomsList.value);
        }

        roomPin = viewRoomPinInput.value;
        if (roomPin === "") {
            roomPin = null;
        }

        roomSecret = viewRoomSecretInput.value;
        if (roomSecret === "") {
            roomSecret = null;
        } else {
            console.log("Secret provided", roomSecret);
        }

        const displayName = viewDisplayNameInput.value;
        if (!displayName) {
            window.alert("Input your display name, please");
            return;
        }

        return room.join(
            roomId, roomPin, roomSecret, displayName,
            metricsEnabled, moderationEnabled);
    }
};

},{"../config":34,"../links":36,"../room/room":45,"janus-videoroom-api":3,"webrtc-adapter":19}],36:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9pc29tb3JwaGljLXdzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvamFudXMtdmlkZW9yb29tLWFwaS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9qYW51cy12aWRlb3Jvb20tYXBpL3NyYy9Db25maWcuanMiLCJub2RlX21vZHVsZXMvamFudXMtdmlkZW9yb29tLWFwaS9zcmMvSmFudXMuanMiLCJub2RlX21vZHVsZXMvamFudXMtdmlkZW9yb29tLWFwaS9zcmMvSmFudXNBZG1pbi5qcyIsIm5vZGVfbW9kdWxlcy9qYW51cy12aWRlb3Jvb20tYXBpL3NyYy9KYW51c1BsdWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9qYW51cy12aWRlb3Jvb20tYXBpL3NyYy9TZHBIZWxwZXIuanMiLCJub2RlX21vZHVsZXMvamFudXMtdmlkZW9yb29tLWFwaS9zcmMvcGx1Z2luL0xlYXZlQ2FwYWJpbGl0eS5qcyIsIm5vZGVfbW9kdWxlcy9qYW51cy12aWRlb3Jvb20tYXBpL3NyYy9wbHVnaW4vVmlkZW9Sb29tLmpzIiwibm9kZV9tb2R1bGVzL2phbnVzLXZpZGVvcm9vbS1hcGkvc3JjL3BsdWdpbi9WaWRlb1Jvb21BZG1pbi5qcyIsIm5vZGVfbW9kdWxlcy9qYW51cy12aWRlb3Jvb20tYXBpL3NyYy9wbHVnaW4vVmlkZW9Sb29tUHVibGlzaGVyLmpzIiwibm9kZV9tb2R1bGVzL2phbnVzLXZpZGVvcm9vbS1hcGkvc3JjL3BsdWdpbi9WaWRlb1Jvb21TdWJzY3JpYmVyLmpzIiwibm9kZV9tb2R1bGVzL3J0Y3BlZXJjb25uZWN0aW9uLXNoaW0vcnRjcGVlcmNvbm5lY3Rpb24uanMiLCJub2RlX21vZHVsZXMvc2RwL3NkcC5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL2xpYi9ieXRlc1RvVXVpZC5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL2xpYi9ybmctYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL3Y0LmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvYWRhcHRlcl9jb3JlLmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvYWRhcHRlcl9mYWN0b3J5LmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvY2hyb21lL2Nocm9tZV9zaGltLmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvY2hyb21lL2dldGRpc3BsYXltZWRpYS5qcyIsIm5vZGVfbW9kdWxlcy93ZWJydGMtYWRhcHRlci9kaXN0L2Nocm9tZS9nZXR1c2VybWVkaWEuanMiLCJub2RlX21vZHVsZXMvd2VicnRjLWFkYXB0ZXIvZGlzdC9jb21tb25fc2hpbS5qcyIsIm5vZGVfbW9kdWxlcy93ZWJydGMtYWRhcHRlci9kaXN0L2VkZ2UvZWRnZV9zaGltLmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvZWRnZS9maWx0ZXJpY2VzZXJ2ZXJzLmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvZWRnZS9nZXRkaXNwbGF5bWVkaWEuanMiLCJub2RlX21vZHVsZXMvd2VicnRjLWFkYXB0ZXIvZGlzdC9lZGdlL2dldHVzZXJtZWRpYS5qcyIsIm5vZGVfbW9kdWxlcy93ZWJydGMtYWRhcHRlci9kaXN0L2ZpcmVmb3gvZmlyZWZveF9zaGltLmpzIiwibm9kZV9tb2R1bGVzL3dlYnJ0Yy1hZGFwdGVyL2Rpc3QvZmlyZWZveC9nZXRkaXNwbGF5bWVkaWEuanMiLCJub2RlX21vZHVsZXMvd2VicnRjLWFkYXB0ZXIvZGlzdC9maXJlZm94L2dldHVzZXJtZWRpYS5qcyIsIm5vZGVfbW9kdWxlcy93ZWJydGMtYWRhcHRlci9kaXN0L3NhZmFyaS9zYWZhcmlfc2hpbS5qcyIsIm5vZGVfbW9kdWxlcy93ZWJydGMtYWRhcHRlci9kaXN0L3V0aWxzLmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9lbnRyeS9sb2JieS5qcyIsInNyYy9saW5rcy5qcyIsInNyYy9yb29tL2NoYXQuanMiLCJzcmMvcm9vbS9kaXNwbGF5LmpzIiwic3JjL3Jvb20vaG9zdC9icmVha291dC5qcyIsInNyYy9yb29tL2hvc3QvaG9zdC5qcyIsInNyYy9yb29tL2hvc3QvcmVzdHJpY3Rpb25zLmpzIiwic3JjL3Jvb20vaW5ib3VuZC5qcyIsInNyYy9yb29tL21lZGlhLmpzIiwic3JjL3Jvb20vb3V0Ym91bmQuanMiLCJzcmMvcm9vbS9yb29tLmpzIiwic3JjL3Jvb20vc3Vicm9vbS5qcyIsInNyYy9zZXJ2aWNlL2V4ZWN1dG9yLmpzIiwic3JjL3NlcnZpY2UvbWV0cmljcy5qcyIsInNyYy9zZXJ2aWNlL21vZGVyYXRvci5qcyIsInNyYy9zZXJ2aWNlL3dlYnNvY2tldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzNnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2owREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDenpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2x3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBvYmplY3RDcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IG9iamVjdENyZWF0ZVBvbHlmaWxsXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IG9iamVjdEtleXNQb2x5ZmlsbFxudmFyIGJpbmQgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCB8fCBmdW5jdGlvbkJpbmRQb2x5ZmlsbFxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcywgJ19ldmVudHMnKSkge1xuICAgIHRoaXMuX2V2ZW50cyA9IG9iamVjdENyZWF0ZShudWxsKTtcbiAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gIH1cblxuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG52YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG52YXIgaGFzRGVmaW5lUHJvcGVydHk7XG50cnkge1xuICB2YXIgbyA9IHt9O1xuICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgJ3gnLCB7IHZhbHVlOiAwIH0pO1xuICBoYXNEZWZpbmVQcm9wZXJ0eSA9IG8ueCA9PT0gMDtcbn0gY2F0Y2ggKGVycikgeyBoYXNEZWZpbmVQcm9wZXJ0eSA9IGZhbHNlIH1cbmlmIChoYXNEZWZpbmVQcm9wZXJ0eSkge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRXZlbnRFbWl0dGVyLCAnZGVmYXVsdE1heExpc3RlbmVycycsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24oYXJnKSB7XG4gICAgICAvLyBjaGVjayB3aGV0aGVyIHRoZSBpbnB1dCBpcyBhIHBvc2l0aXZlIG51bWJlciAod2hvc2UgdmFsdWUgaXMgemVybyBvclxuICAgICAgLy8gZ3JlYXRlciBhbmQgbm90IGEgTmFOKS5cbiAgICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJyB8fCBhcmcgPCAwIHx8IGFyZyAhPT0gYXJnKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImRlZmF1bHRNYXhMaXN0ZW5lcnNcIiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gICAgICBkZWZhdWx0TWF4TGlzdGVuZXJzID0gYXJnO1xuICAgIH1cbiAgfSk7XG59IGVsc2Uge1xuICBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG59XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycyhuKSB7XG4gIGlmICh0eXBlb2YgbiAhPT0gJ251bWJlcicgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJuXCIgYXJndW1lbnQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbmZ1bmN0aW9uICRnZXRNYXhMaXN0ZW5lcnModGhhdCkge1xuICBpZiAodGhhdC5fbWF4TGlzdGVuZXJzID09PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICByZXR1cm4gdGhhdC5fbWF4TGlzdGVuZXJzO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmdldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIGdldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuICRnZXRNYXhMaXN0ZW5lcnModGhpcyk7XG59O1xuXG4vLyBUaGVzZSBzdGFuZGFsb25lIGVtaXQqIGZ1bmN0aW9ucyBhcmUgdXNlZCB0byBvcHRpbWl6ZSBjYWxsaW5nIG9mIGV2ZW50XG4vLyBoYW5kbGVycyBmb3IgZmFzdCBjYXNlcyBiZWNhdXNlIGVtaXQoKSBpdHNlbGYgb2Z0ZW4gaGFzIGEgdmFyaWFibGUgbnVtYmVyIG9mXG4vLyBhcmd1bWVudHMgYW5kIGNhbiBiZSBkZW9wdGltaXplZCBiZWNhdXNlIG9mIHRoYXQuIFRoZXNlIGZ1bmN0aW9ucyBhbHdheXMgaGF2ZVxuLy8gdGhlIHNhbWUgbnVtYmVyIG9mIGFyZ3VtZW50cyBhbmQgdGh1cyBkbyBub3QgZ2V0IGRlb3B0aW1pemVkLCBzbyB0aGUgY29kZVxuLy8gaW5zaWRlIHRoZW0gY2FuIGV4ZWN1dGUgZmFzdGVyLlxuZnVuY3Rpb24gZW1pdE5vbmUoaGFuZGxlciwgaXNGbiwgc2VsZikge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmNhbGwoc2VsZik7XG4gIGVsc2Uge1xuICAgIHZhciBsZW4gPSBoYW5kbGVyLmxlbmd0aDtcbiAgICB2YXIgbGlzdGVuZXJzID0gYXJyYXlDbG9uZShoYW5kbGVyLCBsZW4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICBsaXN0ZW5lcnNbaV0uY2FsbChzZWxmKTtcbiAgfVxufVxuZnVuY3Rpb24gZW1pdE9uZShoYW5kbGVyLCBpc0ZuLCBzZWxmLCBhcmcxKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuY2FsbChzZWxmLCBhcmcxKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsIGFyZzEpO1xuICB9XG59XG5mdW5jdGlvbiBlbWl0VHdvKGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZzEsIGFyZzIpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5jYWxsKHNlbGYsIGFyZzEsIGFyZzIpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmNhbGwoc2VsZiwgYXJnMSwgYXJnMik7XG4gIH1cbn1cbmZ1bmN0aW9uIGVtaXRUaHJlZShoYW5kbGVyLCBpc0ZuLCBzZWxmLCBhcmcxLCBhcmcyLCBhcmczKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuY2FsbChzZWxmLCBhcmcxLCBhcmcyLCBhcmczKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVtaXRNYW55KGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZ3MpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5hcHBseShzZWxmLCBhcmdzKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGV2ZW50cztcbiAgdmFyIGRvRXJyb3IgPSAodHlwZSA9PT0gJ2Vycm9yJyk7XG5cbiAgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuICBpZiAoZXZlbnRzKVxuICAgIGRvRXJyb3IgPSAoZG9FcnJvciAmJiBldmVudHMuZXJyb3IgPT0gbnVsbCk7XG4gIGVsc2UgaWYgKCFkb0Vycm9yKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmIChkb0Vycm9yKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKVxuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBdCBsZWFzdCBnaXZlIHNvbWUga2luZCBvZiBjb250ZXh0IHRvIHRoZSB1c2VyXG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdVbmhhbmRsZWQgXCJlcnJvclwiIGV2ZW50LiAoJyArIGVyICsgJyknKTtcbiAgICAgIGVyci5jb250ZXh0ID0gZXI7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGhhbmRsZXIgPSBldmVudHNbdHlwZV07XG5cbiAgaWYgKCFoYW5kbGVyKVxuICAgIHJldHVybiBmYWxzZTtcblxuICB2YXIgaXNGbiA9IHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nO1xuICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICBzd2l0Y2ggKGxlbikge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgIGNhc2UgMTpcbiAgICAgIGVtaXROb25lKGhhbmRsZXIsIGlzRm4sIHRoaXMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAyOlxuICAgICAgZW1pdE9uZShoYW5kbGVyLCBpc0ZuLCB0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAzOlxuICAgICAgZW1pdFR3byhoYW5kbGVyLCBpc0ZuLCB0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDQ6XG4gICAgICBlbWl0VGhyZWUoaGFuZGxlciwgaXNGbiwgdGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0sIGFyZ3VtZW50c1szXSk7XG4gICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgIGRlZmF1bHQ6XG4gICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGVtaXRNYW55KGhhbmRsZXIsIGlzRm4sIHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5mdW5jdGlvbiBfYWRkTGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBsaXN0ZW5lciwgcHJlcGVuZCkge1xuICB2YXIgbTtcbiAgdmFyIGV2ZW50cztcbiAgdmFyIGV4aXN0aW5nO1xuXG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuICBpZiAoIWV2ZW50cykge1xuICAgIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgIHRhcmdldC5fZXZlbnRzQ291bnQgPSAwO1xuICB9IGVsc2Uge1xuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICAgIGlmIChldmVudHMubmV3TGlzdGVuZXIpIHtcbiAgICAgIHRhcmdldC5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgPyBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICAgICAgLy8gUmUtYXNzaWduIGBldmVudHNgIGJlY2F1c2UgYSBuZXdMaXN0ZW5lciBoYW5kbGVyIGNvdWxkIGhhdmUgY2F1c2VkIHRoZVxuICAgICAgLy8gdGhpcy5fZXZlbnRzIHRvIGJlIGFzc2lnbmVkIHRvIGEgbmV3IG9iamVjdFxuICAgICAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG4gICAgfVxuICAgIGV4aXN0aW5nID0gZXZlbnRzW3R5cGVdO1xuICB9XG5cbiAgaWYgKCFleGlzdGluZykge1xuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIGV4aXN0aW5nID0gZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gICAgKyt0YXJnZXQuX2V2ZW50c0NvdW50O1xuICB9IGVsc2Uge1xuICAgIGlmICh0eXBlb2YgZXhpc3RpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV0gPVxuICAgICAgICAgIHByZXBlbmQgPyBbbGlzdGVuZXIsIGV4aXN0aW5nXSA6IFtleGlzdGluZywgbGlzdGVuZXJdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgICBpZiAocHJlcGVuZCkge1xuICAgICAgICBleGlzdGluZy51bnNoaWZ0KGxpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGV4aXN0aW5nLnB1c2gobGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgaWYgKCFleGlzdGluZy53YXJuZWQpIHtcbiAgICAgIG0gPSAkZ2V0TWF4TGlzdGVuZXJzKHRhcmdldCk7XG4gICAgICBpZiAobSAmJiBtID4gMCAmJiBleGlzdGluZy5sZW5ndGggPiBtKSB7XG4gICAgICAgIGV4aXN0aW5nLndhcm5lZCA9IHRydWU7XG4gICAgICAgIHZhciB3ID0gbmV3IEVycm9yKCdQb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5IGxlYWsgZGV0ZWN0ZWQuICcgK1xuICAgICAgICAgICAgZXhpc3RpbmcubGVuZ3RoICsgJyBcIicgKyBTdHJpbmcodHlwZSkgKyAnXCIgbGlzdGVuZXJzICcgK1xuICAgICAgICAgICAgJ2FkZGVkLiBVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byAnICtcbiAgICAgICAgICAgICdpbmNyZWFzZSBsaW1pdC4nKTtcbiAgICAgICAgdy5uYW1lID0gJ01heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZyc7XG4gICAgICAgIHcuZW1pdHRlciA9IHRhcmdldDtcbiAgICAgICAgdy50eXBlID0gdHlwZTtcbiAgICAgICAgdy5jb3VudCA9IGV4aXN0aW5nLmxlbmd0aDtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSAnb2JqZWN0JyAmJiBjb25zb2xlLndhcm4pIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJyVzOiAlcycsIHcubmFtZSwgdy5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiBhZGRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICByZXR1cm4gX2FkZExpc3RlbmVyKHRoaXMsIHR5cGUsIGxpc3RlbmVyLCBmYWxzZSk7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHByZXBlbmRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuIF9hZGRMaXN0ZW5lcih0aGlzLCB0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gICAgfTtcblxuZnVuY3Rpb24gb25jZVdyYXBwZXIoKSB7XG4gIGlmICghdGhpcy5maXJlZCkge1xuICAgIHRoaXMudGFyZ2V0LnJlbW92ZUxpc3RlbmVyKHRoaXMudHlwZSwgdGhpcy53cmFwRm4pO1xuICAgIHRoaXMuZmlyZWQgPSB0cnVlO1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgY2FzZSAwOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0KTtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCwgYXJndW1lbnRzWzBdKTtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCwgYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pO1xuICAgICAgY2FzZSAzOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LCBhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSxcbiAgICAgICAgICAgIGFyZ3VtZW50c1syXSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgKytpKVxuICAgICAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIHRoaXMubGlzdGVuZXIuYXBwbHkodGhpcy50YXJnZXQsIGFyZ3MpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBfb25jZVdyYXAodGFyZ2V0LCB0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgc3RhdGUgPSB7IGZpcmVkOiBmYWxzZSwgd3JhcEZuOiB1bmRlZmluZWQsIHRhcmdldDogdGFyZ2V0LCB0eXBlOiB0eXBlLCBsaXN0ZW5lcjogbGlzdGVuZXIgfTtcbiAgdmFyIHdyYXBwZWQgPSBiaW5kLmNhbGwob25jZVdyYXBwZXIsIHN0YXRlKTtcbiAgd3JhcHBlZC5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICBzdGF0ZS53cmFwRm4gPSB3cmFwcGVkO1xuICByZXR1cm4gd3JhcHBlZDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZSh0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgdGhpcy5vbih0eXBlLCBfb25jZVdyYXAodGhpcywgdHlwZSwgbGlzdGVuZXIpKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHByZXBlbmRPbmNlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIHRoaXMucHJlcGVuZExpc3RlbmVyKHR5cGUsIF9vbmNlV3JhcCh0aGlzLCB0eXBlLCBsaXN0ZW5lcikpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuLy8gRW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmIGFuZCBvbmx5IGlmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgICB2YXIgbGlzdCwgZXZlbnRzLCBwb3NpdGlvbiwgaSwgb3JpZ2luYWxMaXN0ZW5lcjtcblxuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gICAgICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gICAgICBpZiAoIWV2ZW50cylcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIGxpc3QgPSBldmVudHNbdHlwZV07XG4gICAgICBpZiAoIWxpc3QpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHwgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApXG4gICAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIGlmIChldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdC5saXN0ZW5lciB8fCBsaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxpc3QgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8IGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB7XG4gICAgICAgICAgICBvcmlnaW5hbExpc3RlbmVyID0gbGlzdFtpXS5saXN0ZW5lcjtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uID09PSAwKVxuICAgICAgICAgIGxpc3Quc2hpZnQoKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNwbGljZU9uZShsaXN0LCBwb3NpdGlvbik7XG5cbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKVxuICAgICAgICAgIGV2ZW50c1t0eXBlXSA9IGxpc3RbMF07XG5cbiAgICAgICAgaWYgKGV2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgb3JpZ2luYWxMaXN0ZW5lciB8fCBsaXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbiAgICBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnModHlwZSkge1xuICAgICAgdmFyIGxpc3RlbmVycywgZXZlbnRzLCBpO1xuXG4gICAgICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gICAgICBpZiAoIWV2ZW50cylcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgICAgIGlmICghZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgICAgICAgfSBlbHNlIGlmIChldmVudHNbdHlwZV0pIHtcbiAgICAgICAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMClcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cyA9IG9iamVjdENyZWF0ZShudWxsKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBkZWxldGUgZXZlbnRzW3R5cGVdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBrZXlzID0gb2JqZWN0S2V5cyhldmVudHMpO1xuICAgICAgICB2YXIga2V5O1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lcnMgPSBldmVudHNbdHlwZV07XG5cbiAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgICAgIH0gZWxzZSBpZiAobGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIExJRk8gb3JkZXJcbiAgICAgICAgZm9yIChpID0gbGlzdGVuZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbmZ1bmN0aW9uIF9saXN0ZW5lcnModGFyZ2V0LCB0eXBlLCB1bndyYXApIHtcbiAgdmFyIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuXG4gIGlmICghZXZlbnRzKVxuICAgIHJldHVybiBbXTtcblxuICB2YXIgZXZsaXN0ZW5lciA9IGV2ZW50c1t0eXBlXTtcbiAgaWYgKCFldmxpc3RlbmVyKVxuICAgIHJldHVybiBbXTtcblxuICBpZiAodHlwZW9mIGV2bGlzdGVuZXIgPT09ICdmdW5jdGlvbicpXG4gICAgcmV0dXJuIHVud3JhcCA/IFtldmxpc3RlbmVyLmxpc3RlbmVyIHx8IGV2bGlzdGVuZXJdIDogW2V2bGlzdGVuZXJdO1xuXG4gIHJldHVybiB1bndyYXAgPyB1bndyYXBMaXN0ZW5lcnMoZXZsaXN0ZW5lcikgOiBhcnJheUNsb25lKGV2bGlzdGVuZXIsIGV2bGlzdGVuZXIubGVuZ3RoKTtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiBsaXN0ZW5lcnModHlwZSkge1xuICByZXR1cm4gX2xpc3RlbmVycyh0aGlzLCB0eXBlLCB0cnVlKTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmF3TGlzdGVuZXJzID0gZnVuY3Rpb24gcmF3TGlzdGVuZXJzKHR5cGUpIHtcbiAgcmV0dXJuIF9saXN0ZW5lcnModGhpcywgdHlwZSwgZmFsc2UpO1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIGlmICh0eXBlb2YgZW1pdHRlci5saXN0ZW5lckNvdW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJDb3VudCh0eXBlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbGlzdGVuZXJDb3VudC5jYWxsKGVtaXR0ZXIsIHR5cGUpO1xuICB9XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBsaXN0ZW5lckNvdW50O1xuZnVuY3Rpb24gbGlzdGVuZXJDb3VudCh0eXBlKSB7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHM7XG5cbiAgaWYgKGV2ZW50cykge1xuICAgIHZhciBldmxpc3RlbmVyID0gZXZlbnRzW3R5cGVdO1xuXG4gICAgaWYgKHR5cGVvZiBldmxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKGV2bGlzdGVuZXIpIHtcbiAgICAgIHJldHVybiBldmxpc3RlbmVyLmxlbmd0aDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gMDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24gZXZlbnROYW1lcygpIHtcbiAgcmV0dXJuIHRoaXMuX2V2ZW50c0NvdW50ID4gMCA/IFJlZmxlY3Qub3duS2V5cyh0aGlzLl9ldmVudHMpIDogW107XG59O1xuXG4vLyBBYm91dCAxLjV4IGZhc3RlciB0aGFuIHRoZSB0d28tYXJnIHZlcnNpb24gb2YgQXJyYXkjc3BsaWNlKCkuXG5mdW5jdGlvbiBzcGxpY2VPbmUobGlzdCwgaW5kZXgpIHtcbiAgZm9yICh2YXIgaSA9IGluZGV4LCBrID0gaSArIDEsIG4gPSBsaXN0Lmxlbmd0aDsgayA8IG47IGkgKz0gMSwgayArPSAxKVxuICAgIGxpc3RbaV0gPSBsaXN0W2tdO1xuICBsaXN0LnBvcCgpO1xufVxuXG5mdW5jdGlvbiBhcnJheUNsb25lKGFyciwgbikge1xuICB2YXIgY29weSA9IG5ldyBBcnJheShuKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyArK2kpXG4gICAgY29weVtpXSA9IGFycltpXTtcbiAgcmV0dXJuIGNvcHk7XG59XG5cbmZ1bmN0aW9uIHVud3JhcExpc3RlbmVycyhhcnIpIHtcbiAgdmFyIHJldCA9IG5ldyBBcnJheShhcnIubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXQubGVuZ3RoOyArK2kpIHtcbiAgICByZXRbaV0gPSBhcnJbaV0ubGlzdGVuZXIgfHwgYXJyW2ldO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIG9iamVjdENyZWF0ZVBvbHlmaWxsKHByb3RvKSB7XG4gIHZhciBGID0gZnVuY3Rpb24oKSB7fTtcbiAgRi5wcm90b3R5cGUgPSBwcm90bztcbiAgcmV0dXJuIG5ldyBGO1xufVxuZnVuY3Rpb24gb2JqZWN0S2V5c1BvbHlmaWxsKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrIGluIG9iaikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGspKSB7XG4gICAga2V5cy5wdXNoKGspO1xuICB9XG4gIHJldHVybiBrO1xufVxuZnVuY3Rpb24gZnVuY3Rpb25CaW5kUG9seWZpbGwoY29udGV4dCkge1xuICB2YXIgZm4gPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmbi5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICB9O1xufVxuIiwiLy8gaHR0cHM6Ly9naXRodWIuY29tL21heG9nZGVuL3dlYnNvY2tldC1zdHJlYW0vYmxvYi80OGRjM2RkZjk0M2U1YWRhNjY4YzMxY2NkOTRlOTE4NmYwMmZhZmJkL3dzLWZhbGxiYWNrLmpzXG5cbnZhciB3cyA9IG51bGxcblxuaWYgKHR5cGVvZiBXZWJTb2NrZXQgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdzID0gV2ViU29ja2V0XG59IGVsc2UgaWYgKHR5cGVvZiBNb3pXZWJTb2NrZXQgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdzID0gTW96V2ViU29ja2V0XG59IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdzID0gZ2xvYmFsLldlYlNvY2tldCB8fCBnbG9iYWwuTW96V2ViU29ja2V0XG59IGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdzID0gd2luZG93LldlYlNvY2tldCB8fCB3aW5kb3cuTW96V2ViU29ja2V0XG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykge1xuICB3cyA9IHNlbGYuV2ViU29ja2V0IHx8IHNlbGYuTW96V2ViU29ja2V0XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd3NcbiIsImNvbnN0IEphbnVzID0gcmVxdWlyZSgnLi9zcmMvSmFudXMnKVxyXG5jb25zdCBKYW51c0FkbWluID0gcmVxdWlyZSgnLi9zcmMvSmFudXNBZG1pbicpXHJcbmNvbnN0IEphbnVzUGx1Z2luID0gcmVxdWlyZSgnLi9zcmMvSmFudXNQbHVnaW4nKVxyXG5jb25zdCBWaWRlb1Jvb20gPSByZXF1aXJlKCcuL3NyYy9wbHVnaW4vVmlkZW9Sb29tJylcclxuY29uc3QgVmlkZW9Sb29tUHVibGlzaGVyID0gcmVxdWlyZSgnLi9zcmMvcGx1Z2luL1ZpZGVvUm9vbVB1Ymxpc2hlcicpXHJcbmNvbnN0IFZpZGVvUm9vbVN1YnNjcmliZXIgPSByZXF1aXJlKCcuL3NyYy9wbHVnaW4vVmlkZW9Sb29tU3Vic2NyaWJlcicpXHJcbmNvbnN0IFZpZGVvUm9vbUFkbWluID0gcmVxdWlyZSgnLi9zcmMvcGx1Z2luL1ZpZGVvUm9vbUFkbWluJylcclxuY29uc3QgeyBKYW51c0NvbmZpZywgSmFudXNBZG1pbkNvbmZpZywgSmFudXNSb29tQ29uZmlnIH0gPSByZXF1aXJlKCcuL3NyYy9Db25maWcnKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgSmFudXMsXHJcbiAgSmFudXNBZG1pbixcclxuICBKYW51c1BsdWdpbixcclxuICBWaWRlb1Jvb20sXHJcbiAgVmlkZW9Sb29tUHVibGlzaGVyLFxyXG4gIFZpZGVvUm9vbVN1YnNjcmliZXIsXHJcbiAgVmlkZW9Sb29tQWRtaW4sXHJcbiAgSmFudXNDb25maWcsXHJcbiAgSmFudXNBZG1pbkNvbmZpZyxcclxuICBKYW51c1Jvb21Db25maWdcclxufVxyXG4iLCJjbGFzcyBKYW51c0NvbmZpZyB7XHJcbiAgY29uc3RydWN0b3IgKGNvbmZpZykge1xyXG4gICAgY29uc3Qge1xyXG4gICAgICB1cmwsXHJcbiAgICAgIGtlZXBBbGl2ZUludGVydmFsTXMsXHJcbiAgICAgIG9wdGlvbnNcclxuICAgIH0gPSBjb25maWdcclxuXHJcbiAgICB0aGlzLnVybCA9IHVybFxyXG4gICAgdGhpcy5rZWVwQWxpdmVJbnRlcnZhbE1zID0ga2VlcEFsaXZlSW50ZXJ2YWxNc1xyXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9uc1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgSmFudXNBZG1pbkNvbmZpZyBleHRlbmRzIEphbnVzQ29uZmlnIHtcclxuICBjb25zdHJ1Y3RvciAoY29uZmlnKSB7XHJcbiAgICBzdXBlcihjb25maWcpXHJcbiAgICBjb25zdCB7XHJcbiAgICAgIHNlY3JldCxcclxuICAgICAgc2Vzc2lvbkxpc3RJbnRlcnZhbE1zXHJcbiAgICB9ID0gY29uZmlnXHJcblxyXG4gICAgdGhpcy5zZWNyZXQgPSBzZWNyZXRcclxuICAgIHRoaXMuc2Vzc2lvbkxpc3RJbnRlcnZhbE1zID0gc2Vzc2lvbkxpc3RJbnRlcnZhbE1zXHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBKYW51c1Jvb21Db25maWcge1xyXG4gIGNvbnN0cnVjdG9yIChjb25maWcpIHtcclxuICAgIGNvbnN0IHtcclxuICAgICAgaWQsXHJcbiAgICAgIGNvZGVjLFxyXG4gICAgICByZWNvcmQsXHJcbiAgICAgIHZpZGVvT3JpZW50RXh0LFxyXG4gICAgICBiaXRyYXRlLFxyXG4gICAgICBmaXJTZWNvbmRzLFxyXG4gICAgICBwdWJsaXNoZXJzLFxyXG4gICAgICByZWNvcmREaXJlY3RvcnlcclxuICAgIH0gPSBjb25maWdcclxuXHJcbiAgICB0aGlzLmlkID0gaWRcclxuICAgIHRoaXMuY29kZWMgPSBjb2RlY1xyXG4gICAgdGhpcy5yZWNvcmQgPSByZWNvcmRcclxuICAgIHRoaXMudmlkZW9PcmllbnRFeHQgPSB2aWRlb09yaWVudEV4dFxyXG4gICAgdGhpcy5iaXRyYXRlID0gYml0cmF0ZVxyXG4gICAgdGhpcy5maXJTZWNvbmRzID0gZmlyU2Vjb25kc1xyXG4gICAgdGhpcy5wdWJsaXNoZXJzID0gcHVibGlzaGVyc1xyXG4gICAgdGhpcy5yZWNvcmREaXJlY3RvcnkgPSByZWNvcmREaXJlY3RvcnlcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzLkphbnVzQ29uZmlnID0gSmFudXNDb25maWdcclxubW9kdWxlLmV4cG9ydHMuSmFudXNBZG1pbkNvbmZpZyA9IEphbnVzQWRtaW5Db25maWdcclxubW9kdWxlLmV4cG9ydHMuSmFudXNSb29tQ29uZmlnID0gSmFudXNSb29tQ29uZmlnXHJcbiIsImNvbnN0IFdlYlNvY2tldCA9IHJlcXVpcmUoJ2lzb21vcnBoaWMtd3MnKVxyXG5jb25zdCBKYW51c1BsdWdpbiA9IHJlcXVpcmUoJy4vSmFudXNQbHVnaW4nKVxyXG5jb25zdCB1dWlkID0gcmVxdWlyZSgndXVpZC92NCcpXHJcblxyXG5jb25zdCBpZ25vcmVkRXJyb3JDb2RlcyA9IFtcclxuICA0NTgsIC8vIEpBTlVTX0VSUk9SX1NFU1NJT05fTk9UX0ZPVU5EXHJcbiAgNDU5IC8vIEpBTlVTX0VSUk9SX0hBTkRMRV9OT1RfRk9VTkRcclxuXVxyXG5cclxuY2xhc3MgSmFudXMge1xyXG4gIGNvbnN0cnVjdG9yIChjb25maWcsIGxvZ2dlcikge1xyXG4gICAgdGhpcy53cyA9IHVuZGVmaW5lZFxyXG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXHJcbiAgICB0aGlzLnNlc3Npb25JZCA9IHVuZGVmaW5lZFxyXG4gICAgdGhpcy5sb2dnZXIgPSBsb2dnZXJcclxuXHJcbiAgICB0aGlzLnRyYW5zYWN0aW9ucyA9IHt9XHJcbiAgICB0aGlzLnBsdWdpbkhhbmRsZXMgPSB7fVxyXG5cclxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnXHJcbiAgICB0aGlzLnByb3RvY29sID0gJ2phbnVzLXByb3RvY29sJ1xyXG4gICAgdGhpcy5zZW5kQ3JlYXRlID0gdHJ1ZVxyXG4gIH1cclxuXHJcbiAgY29ubmVjdCAoKSB7XHJcbiAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgdGhpcy53cyA9IG5ldyBXZWJTb2NrZXQodGhpcy5jb25maWcudXJsLCB0aGlzLnByb3RvY29sLCB0aGlzLmNvbmZpZy5vcHRpb25zKVxyXG5cclxuICAgICAgdGhpcy53cy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIChlcnIpID0+IHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignRXJyb3IgY29ubmVjdGluZyB0byB0aGUgSmFudXMgV2ViU29ja2V0cyBzZXJ2ZXIuLi4nLCBlcnIpXHJcbiAgICAgICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlXHJcbiAgICAgICAgcmVqZWN0KGVycilcclxuICAgICAgfSlcclxuXHJcbiAgICAgIHRoaXMud3MuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCAoKSA9PiB7IHRoaXMuY2xlYW51cCgpIH0pXHJcblxyXG4gICAgICB0aGlzLndzLmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCAoKSA9PiB7XHJcbiAgICAgICAgaWYgKCF0aGlzLnNlbmRDcmVhdGUpIHtcclxuICAgICAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlXHJcbiAgICAgICAgICB0aGlzLmtlZXBBbGl2ZSh0cnVlKVxyXG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUodGhpcylcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gdXVpZCgpXHJcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IHsgamFudXM6ICdjcmVhdGUnLCB0cmFuc2FjdGlvbiB9XHJcblxyXG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb25zW3RyYW5zYWN0aW9uXSA9IHtcclxuICAgICAgICAgIHJlc29sdmU6IChqc29uKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChqc29uLmphbnVzICE9PSAnc3VjY2VzcycpIHtcclxuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignQ2Fubm90IGNvbm5lY3QgdG8gSmFudXMnLCBqc29uKVxyXG4gICAgICAgICAgICAgIHJlamVjdChqc29uKVxyXG4gICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNlc3Npb25JZCA9IGpzb24uZGF0YS5pZFxyXG4gICAgICAgICAgICB0aGlzLmlzQ29ubmVjdGVkID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLmtlZXBBbGl2ZSh0cnVlKVxyXG5cclxuICAgICAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ0phbnVzIGNvbm5lY3RlZCwgc2Vzc2lvbklkOiAnLCB0aGlzLnNlc3Npb25JZClcclxuXHJcbiAgICAgICAgICAgIHJlc29sdmUodGhpcylcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICByZWplY3QsXHJcbiAgICAgICAgICByZXBseVR5cGU6ICdzdWNjZXNzJ1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy53cy5zZW5kKEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpKVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgdGhpcy53cy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgKGV2ZW50KSA9PiB7IHRoaXMub25NZXNzYWdlKGV2ZW50KSB9KVxyXG4gICAgICB0aGlzLndzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgKCkgPT4geyB0aGlzLm9uQ2xvc2UoKSB9KVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHtKYW51c1BsdWdpbn0gcGx1Z2luXHJcbiAgICogQHJldHVybiB7UHJvbWlzZX1cclxuICAgKiAqL1xyXG4gIGFkZFBsdWdpbiAocGx1Z2luKSB7XHJcbiAgICBpZiAoIShwbHVnaW4gaW5zdGFuY2VvZiBKYW51c1BsdWdpbikpIHtcclxuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcigncGx1Z2luIGlzIG5vdCBhIEphbnVzUGx1Z2luJykpXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdCA9IHBsdWdpbi5nZXRBdHRhY2hQYXlsb2FkKClcclxuXHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbignYXR0YWNoJywgcmVxdWVzdCwgJ3N1Y2Nlc3MnKS50aGVuKChqc29uKSA9PiB7XHJcbiAgICAgIGlmIChqc29uLmphbnVzICE9PSAnc3VjY2VzcycpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignQ2Fubm90IGFkZCBwbHVnaW4nLCBqc29uKVxyXG4gICAgICAgIHBsdWdpbi5lcnJvcihqc29uKVxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihqc29uKVxyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnBsdWdpbkhhbmRsZXNbanNvbi5kYXRhLmlkXSA9IHBsdWdpblxyXG5cclxuICAgICAgcmV0dXJuIHBsdWdpbi5zdWNjZXNzKHRoaXMsIGpzb24uZGF0YS5pZClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICB0cmFuc2FjdGlvbiAodHlwZSwgcGF5bG9hZCwgcmVwbHlUeXBlLCB0aW1lb3V0TXMpIHtcclxuICAgIGlmICghcmVwbHlUeXBlKSB7XHJcbiAgICAgIHJlcGx5VHlwZSA9ICdhY2snXHJcbiAgICB9XHJcbiAgICBjb25zdCB0cmFuc2FjdGlvbklkID0gdXVpZCgpXHJcblxyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgaWYgKHRpbWVvdXRNcykge1xyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignVHJhbnNhY3Rpb24gdGltZWQgb3V0IGFmdGVyICcgKyB0aW1lb3V0TXMgKyAnIG1zJykpXHJcbiAgICAgICAgfSwgdGltZW91dE1zKVxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICByZWplY3QobmV3IEVycm9yKCdKYW51cyBpcyBub3QgY29ubmVjdGVkJykpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBPYmplY3QuYXNzaWduKHt9LCBwYXlsb2FkLCB7XHJcbiAgICAgICAgamFudXM6IHR5cGUsXHJcbiAgICAgICAgc2Vzc2lvbl9pZDogKHBheWxvYWQgJiYgcGFyc2VJbnQocGF5bG9hZC5zZXNzaW9uX2lkLCAxMCkpIHx8IHRoaXMuc2Vzc2lvbklkLFxyXG4gICAgICAgIHRyYW5zYWN0aW9uOiB0cmFuc2FjdGlvbklkXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICB0aGlzLnRyYW5zYWN0aW9uc1tyZXF1ZXN0LnRyYW5zYWN0aW9uXSA9IHsgcmVzb2x2ZSwgcmVqZWN0LCByZXBseVR5cGUsIHJlcXVlc3QgfVxyXG4gICAgICB0aGlzLndzLnNlbmQoSlNPTi5zdHJpbmdpZnkocmVxdWVzdCkpXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgc2VuZCAodHlwZSwgcGF5bG9hZCkge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgaWYgKCF0aGlzLmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignSmFudXMgaXMgbm90IGNvbm5lY3RlZCcpKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCByZXF1ZXN0ID0gT2JqZWN0LmFzc2lnbih7fSwgcGF5bG9hZCwge1xyXG4gICAgICAgIGphbnVzOiB0eXBlLFxyXG4gICAgICAgIHNlc3Npb25faWQ6IHRoaXMuc2Vzc2lvbklkLFxyXG4gICAgICAgIHRyYW5zYWN0aW9uOiB1dWlkKClcclxuICAgICAgfSlcclxuXHJcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdKYW51cyBzZW5kaW5nJywgcmVxdWVzdClcclxuICAgICAgdGhpcy53cy5zZW5kKEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpLCB7fSwgKGVycikgPT4ge1xyXG4gICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgIHJlamVjdChlcnIpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJlc29sdmUoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBkZXN0cm95ICgpIHtcclxuICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbignZGVzdHJveScsIHt9LCAnc3VjY2VzcycsIDUwMDApLnRoZW4oKCkgPT4ge1xyXG4gICAgICB0aGlzLmNsZWFudXAoKVxyXG4gICAgfSkuY2F0Y2goKCkgPT4ge1xyXG4gICAgICB0aGlzLmNsZWFudXAoKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGRlc3Ryb3lQbHVnaW4gKHBsdWdpbikge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgaWYgKCEocGx1Z2luIGluc3RhbmNlb2YgSmFudXNQbHVnaW4pKSB7XHJcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcigncGx1Z2luIGlzIG5vdCBhIEphbnVzUGx1Z2luJykpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghdGhpcy5wbHVnaW5IYW5kbGVzW3BsdWdpbi5qYW51c0hhbmRsZUlkXSkge1xyXG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ3Vua25vd24gcGx1Z2luJykpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMudHJhbnNhY3Rpb24oJ2RldGFjaCcsIHsgcGx1Z2luOiBwbHVnaW4ucGx1Z2luTmFtZSwgaGFuZGxlX2lkOiBwbHVnaW4uamFudXNIYW5kbGVJZCB9LCAnc3VjY2VzcycsIDUwMDApLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLnBsdWdpbkhhbmRsZXNbcGx1Z2luLnBsdWdpbk5hbWVdXHJcbiAgICAgICAgcGx1Z2luLmRldGFjaCgpXHJcblxyXG4gICAgICAgIHJlc29sdmUoKVxyXG4gICAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XHJcbiAgICAgICAgZGVsZXRlIHRoaXMucGx1Z2luSGFuZGxlc1twbHVnaW4ucGx1Z2luTmFtZV1cclxuICAgICAgICBwbHVnaW4uZGV0YWNoKClcclxuXHJcbiAgICAgICAgcmVqZWN0KGVycilcclxuICAgICAgfSlcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBvbk1lc3NhZ2UgKG1lc3NhZ2VFdmVudCkge1xyXG4gICAgbGV0IGpzb25cclxuICAgIHRyeSB7XHJcbiAgICAgIGpzb24gPSBKU09OLnBhcnNlKG1lc3NhZ2VFdmVudC5kYXRhKVxyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdjYW5ub3QgcGFyc2UgbWVzc2FnZScsIG1lc3NhZ2VFdmVudC5kYXRhKVxyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICAvLyB0aGlzLmxvZ2dlci5kZWJ1ZygnSkFOVVMgR09UJywganNvbilcclxuICAgIGlmIChqc29uLmphbnVzID09PSAndGltZW91dCcgJiYganNvbi5zZXNzaW9uX2lkICE9PSB0aGlzLnNlc3Npb25JZCkge1xyXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnR09UIHRpbWVvdXQgZnJvbSBhbm90aGVyIHdlYnNvY2tldCcpIC8vIHNlZW1zIGxpa2UgYSBidWcgaW4gamFudXMgdGltZW91dCBoYW5kbGVyIDopXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmIChqc29uLmphbnVzID09PSAna2VlcGFsaXZlJykgeyAvLyBEbyBub3RoaW5nXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmIChqc29uLmphbnVzID09PSAnYWNrJykgeyAvLyBKdXN0IGFuIGFjaywgd2UgY2FuIHByb2JhYmx5IGlnbm9yZVxyXG4gICAgICBjb25zdCB0cmFuc2FjdGlvbiA9IHRoaXMuZ2V0VHJhbnNhY3Rpb24oanNvbilcclxuICAgICAgaWYgKHRyYW5zYWN0aW9uICYmIHRyYW5zYWN0aW9uLnJlc29sdmUpIHtcclxuICAgICAgICB0cmFuc2FjdGlvbi5yZXNvbHZlKGpzb24pXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGpzb24uamFudXMgPT09ICdzdWNjZXNzJykgeyAvLyBTdWNjZXNzIVxyXG4gICAgICBjb25zdCB0cmFuc2FjdGlvbiA9IHRoaXMuZ2V0VHJhbnNhY3Rpb24oanNvbilcclxuICAgICAgaWYgKCF0cmFuc2FjdGlvbikge1xyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBwbHVnaW5EYXRhID0ganNvbi5wbHVnaW5kYXRhXHJcbiAgICAgIGlmIChwbHVnaW5EYXRhID09PSB1bmRlZmluZWQgfHwgcGx1Z2luRGF0YSA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRyYW5zYWN0aW9uLnJlc29sdmUoanNvbilcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgc2VuZGVyID0ganNvbi5zZW5kZXJcclxuICAgICAgaWYgKCFzZW5kZXIpIHtcclxuICAgICAgICB0cmFuc2FjdGlvbi5yZXNvbHZlKGpzb24pXHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ01pc3Npbmcgc2VuZGVyIGZvciBwbHVnaW5kYXRhJywganNvbilcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcGx1Z2luSGFuZGxlID0gdGhpcy5wbHVnaW5IYW5kbGVzW3NlbmRlcl1cclxuICAgICAgaWYgKCFwbHVnaW5IYW5kbGUpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVGhpcyBoYW5kbGUgaXMgbm90IGF0dGFjaGVkIHRvIHRoaXMgc2Vzc2lvbicsIGpzb24pXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRyYW5zYWN0aW9uLnJlc29sdmUoeyBkYXRhOiBwbHVnaW5EYXRhLmRhdGEsIGpzb24gfSlcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGpzb24uamFudXMgPT09ICd3ZWJydGN1cCcpIHsgLy8gVGhlIFBlZXJDb25uZWN0aW9uIHdpdGggdGhlIGdhdGV3YXkgaXMgdXAhIE5vdGlmeSB0aGlzXHJcbiAgICAgIGNvbnN0IHNlbmRlciA9IGpzb24uc2VuZGVyXHJcbiAgICAgIGlmICghc2VuZGVyKSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybignTWlzc2luZyBzZW5kZXIuLi4nKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IHBsdWdpbkhhbmRsZSA9IHRoaXMucGx1Z2luSGFuZGxlc1tzZW5kZXJdXHJcbiAgICAgIGlmICghcGx1Z2luSGFuZGxlKSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1RoaXMgaGFuZGxlIGlzIG5vdCBhdHRhY2hlZCB0byB0aGlzIHNlc3Npb24nLCBzZW5kZXIpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuICAgICAgcGx1Z2luSGFuZGxlLndlYnJ0Y1N0YXRlKHRydWUpXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmIChqc29uLmphbnVzID09PSAnaGFuZ3VwJykgeyAvLyBBIHBsdWdpbiBhc2tlZCB0aGUgY29yZSB0byBoYW5ndXAgYSBQZWVyQ29ubmVjdGlvbiBvbiBvbmUgb2Ygb3VyIGhhbmRsZXNcclxuICAgICAgY29uc3Qgc2VuZGVyID0ganNvbi5zZW5kZXJcclxuICAgICAgaWYgKCFzZW5kZXIpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdNaXNzaW5nIHNlbmRlci4uLicpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgcGx1Z2luSGFuZGxlID0gdGhpcy5wbHVnaW5IYW5kbGVzW3NlbmRlcl1cclxuICAgICAgaWYgKCFwbHVnaW5IYW5kbGUpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVGhpcyBoYW5kbGUgaXMgbm90IGF0dGFjaGVkIHRvIHRoaXMgc2Vzc2lvbicsIHNlbmRlcilcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG4gICAgICBwbHVnaW5IYW5kbGUud2VicnRjU3RhdGUoZmFsc2UsIGpzb24ucmVhc29uKVxyXG4gICAgICBwbHVnaW5IYW5kbGUuaGFuZ3VwKClcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGpzb24uamFudXMgPT09ICdkZXRhY2hlZCcpIHsgLy8gQSBwbHVnaW4gYXNrZWQgdGhlIGNvcmUgdG8gZGV0YWNoIG9uZSBvZiBvdXIgaGFuZGxlc1xyXG4gICAgICBjb25zdCBzZW5kZXIgPSBqc29uLnNlbmRlclxyXG4gICAgICBpZiAoIXNlbmRlcikge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ01pc3Npbmcgc2VuZGVyLi4uJylcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICBpZiAoanNvbi5qYW51cyA9PT0gJ21lZGlhJykgeyAvLyBNZWRpYSBzdGFydGVkL3N0b3BwZWQgZmxvd2luZ1xyXG4gICAgICBjb25zdCBzZW5kZXIgPSBqc29uLnNlbmRlclxyXG4gICAgICBpZiAoIXNlbmRlcikge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ01pc3Npbmcgc2VuZGVyLi4uJylcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG4gICAgICBjb25zdCBwbHVnaW5IYW5kbGUgPSB0aGlzLnBsdWdpbkhhbmRsZXNbc2VuZGVyXVxyXG4gICAgICBpZiAoIXBsdWdpbkhhbmRsZSkge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdUaGlzIGhhbmRsZSBpcyBub3QgYXR0YWNoZWQgdG8gdGhpcyBzZXNzaW9uJywgc2VuZGVyKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcbiAgICAgIHBsdWdpbkhhbmRsZS5tZWRpYVN0YXRlKGpzb24udHlwZSwganNvbi5yZWNlaXZpbmcpXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmIChqc29uLmphbnVzID09PSAnc2xvd2xpbmsnKSB7IC8vIFRyb3VibGUgdXBsaW5rIG9yIGRvd25saW5rXHJcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdHb3QgYSBzbG93bGluayBldmVudCBvbiBzZXNzaW9uICcgKyB0aGlzLnNlc3Npb25JZClcclxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoanNvbilcclxuICAgICAgY29uc3Qgc2VuZGVyID0ganNvbi5zZW5kZXJcclxuICAgICAgaWYgKCFzZW5kZXIpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdNaXNzaW5nIHNlbmRlci4uLicpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgcGx1Z2luSGFuZGxlID0gdGhpcy5wbHVnaW5IYW5kbGVzW3NlbmRlcl1cclxuICAgICAgaWYgKCFwbHVnaW5IYW5kbGUpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVGhpcyBoYW5kbGUgaXMgbm90IGF0dGFjaGVkIHRvIHRoaXMgc2Vzc2lvbicsIHNlbmRlcilcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG4gICAgICBwbHVnaW5IYW5kbGUuc2xvd0xpbmsoanNvbi51cGxpbmssIGpzb24ubmFja3MpXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIGlmIChqc29uLmphbnVzID09PSAnZXJyb3InKSB7IC8vIE9vcHMsIHNvbWV0aGluZyB3cm9uZyBoYXBwZW5lZFxyXG4gICAgICBpZiAoanNvbi5lcnJvciAmJiBqc29uLmVycm9yLmNvZGUgJiYgIWlnbm9yZWRFcnJvckNvZGVzLmluY2x1ZGVzKGpzb24uZXJyb3IuY29kZSkpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignSmFudXMgZXJyb3IgcmVzcG9uc2UnICsgSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgMikpXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gdGhpcy5nZXRUcmFuc2FjdGlvbihqc29uLCB0cnVlKVxyXG4gICAgICBpZiAodHJhbnNhY3Rpb24gJiYgdHJhbnNhY3Rpb24ucmVqZWN0KSB7XHJcbiAgICAgICAgaWYgKHRyYW5zYWN0aW9uLnJlcXVlc3QpIHtcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdKYW51cyBFcnJvcjogcmVqZWN0aW5nIHRyYW5zYWN0aW9uJywgdHJhbnNhY3Rpb24ucmVxdWVzdCwganNvbilcclxuICAgICAgICB9XHJcbiAgICAgICAgdHJhbnNhY3Rpb24ucmVqZWN0KGpzb24pXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGpzb24uamFudXMgPT09ICdldmVudCcpIHtcclxuICAgICAgY29uc3Qgc2VuZGVyID0ganNvbi5zZW5kZXJcclxuICAgICAgaWYgKCFzZW5kZXIpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdNaXNzaW5nIHNlbmRlci4uLicpXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgcGx1Z2luRGF0YSA9IGpzb24ucGx1Z2luZGF0YVxyXG4gICAgICBpZiAocGx1Z2luRGF0YSA9PT0gdW5kZWZpbmVkIHx8IHBsdWdpbkRhdGEgPT09IG51bGwpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignTWlzc2luZyBwbHVnaW5kYXRhLi4uJylcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcGx1Z2luSGFuZGxlID0gdGhpcy5wbHVnaW5IYW5kbGVzW3NlbmRlcl1cclxuICAgICAgaWYgKCFwbHVnaW5IYW5kbGUpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVGhpcyBoYW5kbGUgaXMgbm90IGF0dGFjaGVkIHRvIHRoaXMgc2Vzc2lvbicsIHNlbmRlcilcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZGF0YSA9IHBsdWdpbkRhdGEuZGF0YVxyXG4gICAgICBjb25zdCB0cmFuc2FjdGlvbiA9IHRoaXMuZ2V0VHJhbnNhY3Rpb24oanNvbilcclxuICAgICAgaWYgKHRyYW5zYWN0aW9uKSB7XHJcbiAgICAgICAgaWYgKGRhdGEuZXJyb3JfY29kZSkge1xyXG4gICAgICAgICAgdHJhbnNhY3Rpb24ucmVqZWN0KHsgZGF0YSwganNvbiB9KVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0cmFuc2FjdGlvbi5yZXNvbHZlKHsgZGF0YSwganNvbiB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG5cclxuICAgICAgcGx1Z2luSGFuZGxlLm9ubWVzc2FnZShkYXRhLCBqc29uKVxyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmxvZ2dlci53YXJuKCdVbmtub3duIG1lc3NhZ2UvZXZlbnQgJyArIGpzb24uamFudXMgKyAnIG9uIHNlc3Npb24gJyArIHRoaXMuc2Vzc2lvbklkKVxyXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoanNvbilcclxuICB9XHJcblxyXG4gIG9uQ2xvc2UgKCkge1xyXG4gICAgaWYgKCF0aGlzLmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxyXG4gICAgdGhpcy5sb2dnZXIuZXJyb3IoJ0xvc3QgY29ubmVjdGlvbiB0byB0aGUgZ2F0ZXdheSAoaXMgaXQgZG93bj8pJylcclxuICB9XHJcblxyXG4gIGtlZXBBbGl2ZSAoaXNTY2hlZHVsZWQpIHtcclxuICAgIGlmICghdGhpcy53cyB8fCAhdGhpcy5pc0Nvbm5lY3RlZCB8fCAhdGhpcy5zZXNzaW9uSWQpIHtcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlzU2NoZWR1bGVkKSB7XHJcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4geyB0aGlzLmtlZXBBbGl2ZSgpIH0sIHRoaXMuY29uZmlnLmtlZXBBbGl2ZUludGVydmFsTXMpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBsb2dnZXIuZGVidWcoJ1NlbmRpbmcgSmFudXMga2VlcGFsaXZlJylcclxuICAgICAgdGhpcy50cmFuc2FjdGlvbigna2VlcGFsaXZlJykudGhlbigoKSA9PiB7XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHRoaXMua2VlcEFsaXZlKCkgfSwgdGhpcy5jb25maWcua2VlcEFsaXZlSW50ZXJ2YWxNcylcclxuICAgICAgfSkuY2F0Y2goKGVycikgPT4ge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ0phbnVzIGtlZXBhbGl2ZSBlcnJvcicsIGVycilcclxuICAgICAgfSlcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldFRyYW5zYWN0aW9uIChqc29uLCBpZ25vcmVSZXBseVR5cGUgPSBmYWxzZSkge1xyXG4gICAgY29uc3QgdHlwZSA9IGpzb24uamFudXNcclxuICAgIGNvbnN0IHRyYW5zYWN0aW9uSWQgPSBqc29uLnRyYW5zYWN0aW9uXHJcbiAgICBpZiAoXHJcbiAgICAgIHRyYW5zYWN0aW9uSWQgJiZcclxuICAgICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMudHJhbnNhY3Rpb25zLCB0cmFuc2FjdGlvbklkKSAmJlxyXG4gICAgICAoaWdub3JlUmVwbHlUeXBlIHx8IHRoaXMudHJhbnNhY3Rpb25zW3RyYW5zYWN0aW9uSWRdLnJlcGx5VHlwZSA9PT0gdHlwZSlcclxuICAgICkge1xyXG4gICAgICBjb25zdCByZXQgPSB0aGlzLnRyYW5zYWN0aW9uc1t0cmFuc2FjdGlvbklkXVxyXG4gICAgICBkZWxldGUgdGhpcy50cmFuc2FjdGlvbnNbdHJhbnNhY3Rpb25JZF1cclxuICAgICAgcmV0dXJuIHJldFxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgY2xlYW51cCAoKSB7XHJcbiAgICB0aGlzLl9jbGVhbnVwUGx1Z2lucygpXHJcbiAgICB0aGlzLl9jbGVhbnVwV2ViU29ja2V0KClcclxuICAgIHRoaXMuX2NsZWFudXBUcmFuc2FjdGlvbnMoKVxyXG4gIH1cclxuXHJcbiAgX2NsZWFudXBXZWJTb2NrZXQgKCkge1xyXG4gICAgaWYgKHRoaXMud3MpIHtcclxuICAgICAgaWYgKHRoaXMud3MucmVtb3ZlQWxsTGlzdGVuZXJzKSB7XHJcbiAgICAgICAgdGhpcy53cy5yZW1vdmVBbGxMaXN0ZW5lcnMoKVxyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLndzLnJlYWR5U3RhdGUgPT09IFdlYlNvY2tldC5PUEVOKSB7XHJcbiAgICAgICAgdGhpcy53cy5jbG9zZSgpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHRoaXMud3MgPSB1bmRlZmluZWRcclxuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBmYWxzZVxyXG4gIH1cclxuXHJcbiAgX2NsZWFudXBQbHVnaW5zICgpIHtcclxuICAgIE9iamVjdC5rZXlzKHRoaXMucGx1Z2luSGFuZGxlcykuZm9yRWFjaCgocGx1Z2luSWQpID0+IHtcclxuICAgICAgY29uc3QgcGx1Z2luID0gdGhpcy5wbHVnaW5IYW5kbGVzW3BsdWdpbklkXVxyXG4gICAgICBkZWxldGUgdGhpcy5wbHVnaW5IYW5kbGVzW3BsdWdpbklkXVxyXG4gICAgICBwbHVnaW4uZGV0YWNoKClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBfY2xlYW51cFRyYW5zYWN0aW9ucyAoKSB7XHJcbiAgICBPYmplY3Qua2V5cyh0aGlzLnRyYW5zYWN0aW9ucykuZm9yRWFjaCgodHJhbnNhY3Rpb25JZCkgPT4ge1xyXG4gICAgICBjb25zdCB0cmFuc2FjdGlvbiA9IHRoaXMudHJhbnNhY3Rpb25zW3RyYW5zYWN0aW9uSWRdXHJcbiAgICAgIGlmICh0cmFuc2FjdGlvbi5yZWplY3QpIHtcclxuICAgICAgICB0cmFuc2FjdGlvbi5yZWplY3QoKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgdGhpcy50cmFuc2FjdGlvbnMgPSB7fVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBKYW51c1xyXG4iLCJjb25zdCBKYW51cyA9IHJlcXVpcmUoJy4vSmFudXMnKVxyXG5cclxuY2xhc3MgSmFudXNBZG1pbiBleHRlbmRzIEphbnVzIHtcclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwYXJhbSBjb25maWdcclxuICAgKiBAcGFyYW0gbG9nZ2VyXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IgKGNvbmZpZywgbG9nZ2VyKSB7XHJcbiAgICBzdXBlcihjb25maWcsIGxvZ2dlcilcclxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnXHJcbiAgICB0aGlzLnByb3RvY29sID0gJ2phbnVzLWFkbWluLXByb3RvY29sJ1xyXG4gICAgdGhpcy5zZW5kQ3JlYXRlID0gZmFsc2VcclxuICB9XHJcblxyXG4gIHRyYW5zYWN0aW9uICh0eXBlLCBwYXlsb2FkLCByZXBseVR5cGUpIHtcclxuICAgIGNvbnN0IG1zZyA9IE9iamVjdC5hc3NpZ24oe30sIHBheWxvYWQsIHtcclxuICAgICAgYWRtaW5fc2VjcmV0OiB0aGlzLmNvbmZpZy5zZWNyZXRcclxuICAgIH0pXHJcbiAgICByZXR1cm4gc3VwZXIudHJhbnNhY3Rpb24odHlwZSwgbXNnLCByZXBseVR5cGUgfHwgJ3N1Y2Nlc3MnKVxyXG4gIH1cclxuXHJcbiAgbGlzdFNlc3Npb25zICgpIHtcclxuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uKCdsaXN0X3Nlc3Npb25zJykudGhlbihyID0+IHIuc2Vzc2lvbnMpXHJcbiAgfVxyXG5cclxuICBsaXN0SGFuZGxlcyAoc2Vzc2lvbklkKSB7XHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbignbGlzdF9oYW5kbGVzJywge1xyXG4gICAgICBzZXNzaW9uX2lkOiBzZXNzaW9uSWRcclxuICAgIH0pLnRoZW4ociA9PiByLmhhbmRsZXMpXHJcbiAgfVxyXG5cclxuICBoYW5kbGVJbmZvIChzZXNzaW9uSWQsIGhhbmRsZUlkKSB7XHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbignaGFuZGxlX2luZm8nLCB7XHJcbiAgICAgIHNlc3Npb25faWQ6IHNlc3Npb25JZCxcclxuICAgICAgaGFuZGxlX2lkOiBoYW5kbGVJZFxyXG4gICAgfSkudGhlbihyID0+IHIuaW5mbylcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSmFudXNBZG1pblxyXG4iLCJjb25zdCB1dWlkID0gcmVxdWlyZSgndXVpZC92NCcpXHJcbmNvbnN0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpXHJcblxyXG5jbGFzcyBKYW51c1BsdWdpbiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcbiAgY29uc3RydWN0b3IgKGxvZ2dlcikge1xyXG4gICAgc3VwZXIoKVxyXG4gICAgdGhpcy5pZCA9IHV1aWQoKVxyXG4gICAgLyoqIEB2YXIgSmFudXMgKi9cclxuICAgIHRoaXMuamFudXMgPSB1bmRlZmluZWRcclxuICAgIHRoaXMuamFudXNIYW5kbGVJZCA9IHVuZGVmaW5lZFxyXG4gICAgdGhpcy5wbHVnaW5OYW1lID0gdW5kZWZpbmVkXHJcbiAgICB0aGlzLmxvZ2dlciA9IGxvZ2dlclxyXG4gIH1cclxuXHJcbiAgZ2V0QXR0YWNoUGF5bG9hZCAoKSB7XHJcbiAgICByZXR1cm4geyBwbHVnaW46IHRoaXMucGx1Z2luTmFtZSwgb3BhcXVlX2lkOiB0aGlzLmlkIH1cclxuICB9XHJcblxyXG4gIHRyYW5zYWN0aW9uIChtZXNzYWdlLCBhZGRpdGlvbmFsRmllbGRzLCByZXBseVR5cGUpIHtcclxuICAgIGNvbnN0IHBheWxvYWQgPSBPYmplY3QuYXNzaWduKHt9LCBhZGRpdGlvbmFsRmllbGRzLCB7IGhhbmRsZV9pZDogdGhpcy5qYW51c0hhbmRsZUlkIH0pXHJcblxyXG4gICAgaWYgKCF0aGlzLmphbnVzKSB7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ0phbnVzUGx1Z2luIGlzIG5vdCBjb25uZWN0ZWQnKSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcy5qYW51cy50cmFuc2FjdGlvbihtZXNzYWdlLCBwYXlsb2FkLCByZXBseVR5cGUpXHJcbiAgfVxyXG5cclxuICBzdWNjZXNzIChqYW51cywgamFudXNIYW5kbGVJZCkge1xyXG4gICAgdGhpcy5qYW51cyA9IGphbnVzXHJcbiAgICB0aGlzLmphbnVzSGFuZGxlSWQgPSBqYW51c0hhbmRsZUlkXHJcblxyXG4gICAgcmV0dXJuIHRoaXNcclxuICB9XHJcblxyXG4gIGVycm9yIChjYXVzZSkge1xyXG4gICAgLy8gQ291bGRuJ3QgYXR0YWNoIHRvIHRoZSBwbHVnaW5cclxuICB9XHJcblxyXG4gIG9ubWVzc2FnZSAoZGF0YSwganNvbikge1xyXG4gICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1VuaGFuZGxlZCBtZXNzYWdlIGZyb20gamFudXMgaW4gYSBwbHVnaW46ICcgKyB0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIGRhdGEsIGpzb24pXHJcbiAgfVxyXG5cclxuICBvbmNsZWFudXAgKCkge1xyXG4gICAgLy8gUGVlckNvbm5lY3Rpb24gd2l0aCB0aGUgcGx1Z2luIGNsb3NlZCwgY2xlYW4gdGhlIFVJXHJcbiAgICAvLyBUaGUgcGx1Z2luIGhhbmRsZSBpcyBzdGlsbCB2YWxpZCBzbyB3ZSBjYW4gY3JlYXRlIGEgbmV3IG9uZVxyXG4gIH1cclxuXHJcbiAgZGV0YWNoZWQgKCkge1xyXG4gICAgLy8gQ29ubmVjdGlvbiB3aXRoIHRoZSBwbHVnaW4gY2xvc2VkLCBnZXQgcmlkIG9mIGl0cyBmZWF0dXJlc1xyXG4gICAgLy8gVGhlIHBsdWdpbiBoYW5kbGUgaXMgbm90IHZhbGlkIGFueW1vcmVcclxuICB9XHJcblxyXG4gIGhhbmd1cCAoKSB7XHJcbiAgICB0aGlzLmVtaXQoJ2hhbmd1cCcpXHJcbiAgfVxyXG5cclxuICBzbG93TGluayAoKSB7XHJcbiAgICB0aGlzLmVtaXQoJ3Nsb3dsaW5rJylcclxuICB9XHJcblxyXG4gIG1lZGlhU3RhdGUgKG1lZGl1bSwgb24pIHtcclxuICAgIHRoaXMuZW1pdCgnbWVkaWFTdGF0ZScsIG1lZGl1bSwgb24pXHJcbiAgfVxyXG5cclxuICB3ZWJydGNTdGF0ZSAoaXNSZWFkeSwgY2F1c2UpIHtcclxuICAgIHRoaXMuZW1pdCgnd2VicnRjU3RhdGUnLCBpc1JlYWR5LCBjYXVzZSlcclxuICB9XHJcblxyXG4gIGRlc3Ryb3kgKCkge1xyXG4gICAgdGhpcy5oYW5ndXAoKTtcclxuXHJcbiAgICB0aGlzLmphbnVzLmRlc3Ryb3lQbHVnaW4odGhpcykuY2F0Y2goKGVycm9yKSA9PiB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWaWRlb1Jvb20sIGRlc3Ryb3lQbHVnaW4gZXJyb3InLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGRldGFjaCAoKSB7XHJcbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygpO1xyXG4gICAgdGhpcy5qYW51cyA9IG51bGw7XHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEphbnVzUGx1Z2luXHJcbiIsImNvbnN0IFNEUFV0aWxzID0gcmVxdWlyZSgnc2RwJylcclxuXHJcbmNsYXNzIFNkcEhlbHBlciB7XHJcbiAgY29uc3RydWN0b3IgKGxvZ2dlcikge1xyXG4gICAgdGhpcy5sb2dnZXIgPSBsb2dnZXJcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBwYXJhbSBzZHAgc3RyaW5nXHJcbiAgICogQHBhcmFtIGFsbG93ZWRQcm9maWxlcyBhcnJheVtdfHN0cmluZ3xSZWdleHBcclxuICAgKi9cclxuICBmaWx0ZXJIMjY0UHJvZmlsZXMgKHNkcCwgYWxsb3dlZFByb2ZpbGVzKSB7XHJcbiAgICBjb25zdCBzZWN0aW9ucyA9IFNEUFV0aWxzLnNwbGl0U2VjdGlvbnMoc2RwKVxyXG5cclxuICAgIGNvbnN0IHJldCA9IFtdXHJcbiAgICBmb3IgKGNvbnN0IHNlY3Rpb24gb2Ygc2VjdGlvbnMpIHtcclxuICAgICAgaWYgKFNEUFV0aWxzLmdldE1pZChzZWN0aW9uKSA9PT0gJ3ZpZGVvJykge1xyXG4gICAgICAgIGNvbnN0IG5ld1NlY3Rpb24gPSBbXVxyXG4gICAgICAgIGNvbnN0IGxpbmVzID0gU0RQVXRpbHMuc3BsaXRMaW5lcyhzZWN0aW9uKVxyXG4gICAgICAgIGNvbnN0IHJ0cFNlY3Rpb25zID0gW1tdXVxyXG4gICAgICAgIGxldCBpID0gMFxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICAgIGlmIChsaW5lLmluZGV4T2YoJ2E9cnRwbWFwOicpID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJ0cFNlY3Rpb25zLnB1c2goW10pXHJcbiAgICAgICAgICAgIGkrK1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcnRwU2VjdGlvbnNbaV0ucHVzaChsaW5lKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcnRwU2VjdGlvbnNbMF0ubWFwKGwgPT4gbmV3U2VjdGlvbi5wdXNoKGwpKVxyXG4gICAgICAgIGZvciAobGV0IGogPSAxOyBqIDwgcnRwU2VjdGlvbnMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgIGNvbnN0IHJ0cFNlY3Rpb24gPSBydHBTZWN0aW9uc1tqXVxyXG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gU0RQVXRpbHMucGFyc2VSdHBNYXAocnRwU2VjdGlvblswXSlcclxuXHJcbiAgICAgICAgICBpZiAocGFyc2VkICYmIHBhcnNlZC5uYW1lID09PSAnSDI2NCcpIHtcclxuICAgICAgICAgICAgY29uc3QgZm10cCA9IHJ0cFNlY3Rpb24uZmlsdGVyKGwgPT4gbC5pbmRleE9mKCdhPWZtdHA6JykgPT09IDApLnNoaWZ0KClcclxuXHJcbiAgICAgICAgICAgIGxldCBpc0FsbG93ZWQgPSBmYWxzZVxyXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShhbGxvd2VkUHJvZmlsZXMpKSB7XHJcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBhbGxvd2VkUHJvZmlsZSBvZiBhbGxvd2VkUHJvZmlsZXMpIHtcclxuICAgICAgICAgICAgICAgIGlzQWxsb3dlZCA9IGlzQWxsb3dlZCB8fCBmbXRwLmluZGV4T2YoJ3Byb2ZpbGUtbGV2ZWwtaWQ9JyArIGFsbG93ZWRQcm9maWxlKSAhPT0gLTFcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGFsbG93ZWRQcm9maWxlcyA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICBpc0FsbG93ZWQgPSBmbXRwLmluZGV4T2YoJ3Byb2ZpbGUtbGV2ZWwtaWQ9JyArIGFsbG93ZWRQcm9maWxlcykgIT09IC0xXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYWxsb3dlZFByb2ZpbGVzIGluc3RhbmNlb2YgUmVnRXhwKSB7XHJcbiAgICAgICAgICAgICAgaXNBbGxvd2VkID0gYWxsb3dlZFByb2ZpbGVzLnRlc3QoZm10cClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGlzQWxsb3dlZCkge1xyXG4gICAgICAgICAgICAgIHJ0cFNlY3Rpb25zW2pdLm1hcChsID0+IG5ld1NlY3Rpb24ucHVzaChsKSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcnRwU2VjdGlvbnNbal0ubWFwKGwgPT4gbmV3U2VjdGlvbi5wdXNoKGwpKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbmV3U2VjdGlvbi5tYXAobCA9PiByZXQucHVzaChsKSlcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBTRFBVdGlscy5zcGxpdExpbmVzKHNlY3Rpb24pLm1hcChsID0+IHJldC5wdXNoKGwpKVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJldC5qb2luKCdcXHJcXG4nKSArICdcXHJcXG4nXHJcbiAgfVxyXG5cclxuICBmaWx0ZXJEaXJlY3RDYW5kaWRhdGVzIChzZHAsIGZvcmNlID0gZmFsc2UpIHtcclxuICAgIGNvbnN0IGxpbmVzID0gU0RQVXRpbHMuc3BsaXRMaW5lcyhzZHApXHJcblxyXG4gICAgY29uc3QgcmV0ID0gW11cclxuICAgIGxldCBoYXZlQ2FuZGlkYXRlcyA9IGZhbHNlXHJcbiAgICBsZXQgaGF2ZU5vbkRpcmVjdENhbmRpZGF0ZXMgPSBmYWxzZVxyXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ2E9Y2FuZGlkYXRlJykpIHtcclxuICAgICAgICBoYXZlQ2FuZGlkYXRlcyA9IHRydWVcclxuICAgICAgICBpZiAoIXRoaXMuaXNEaXJlY3RDYW5kaWRhdGUobGluZSkpIHtcclxuICAgICAgICAgIHJldC5wdXNoKGxpbmUpXHJcbiAgICAgICAgICBoYXZlTm9uRGlyZWN0Q2FuZGlkYXRlcyA9IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0LnB1c2gobGluZSlcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIG9ubHkgcmVtb3ZlIF9hbGxfIGNhbmRpZGF0ZXMgaWYgaXRzIGEgZm9yY2VkIHJlcXVlc3RcclxuICAgIGlmIChoYXZlQ2FuZGlkYXRlcyAmJiAhaGF2ZU5vbkRpcmVjdENhbmRpZGF0ZXMgJiYgIWZvcmNlKSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ1NEUCBOTyBPVEhFUiBDQU5ESURBVEVTIFRIQU4gRElSRUNUIENBTkRJREFURVMnLCBzZHAsIG5ldyBFcnJvcigpLnN0YWNrKVxyXG4gICAgICByZXR1cm4gc2RwXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGhhdmVDYW5kaWRhdGVzICYmICFoYXZlTm9uRGlyZWN0Q2FuZGlkYXRlcykge1xyXG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignU0RQIERJUkVDVCBDQU5ESURBVEVTIEZJTFRFUkVEIE9VVCBCVVQgTk8gT1RIRVIgQ0FORElEQVRFUyBJTiBTRFAnLCBzZHAsIG5ldyBFcnJvcigpLnN0YWNrKVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXQuam9pbignXFxyXFxuJykgKyAnXFxyXFxuJ1xyXG4gIH1cclxuXHJcbiAgaXNEaXJlY3RDYW5kaWRhdGUgKGNhbmRpZGF0ZUxpbmUpIHtcclxuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IFNEUFV0aWxzLnBhcnNlQ2FuZGlkYXRlKGNhbmRpZGF0ZUxpbmUpXHJcbiAgICByZXR1cm4gY2FuZGlkYXRlLnR5cGUgPT09ICdob3N0JyB8fCBjYW5kaWRhdGUudHlwZSA9PT0gJ3NyZmx4JyB8fCBjYW5kaWRhdGUudGNwVHlwZSA9PT0gJ2hvc3QnIHx8IGNhbmRpZGF0ZS50Y3BUeXBlID09PSAnc3JmbHgnXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNkcEhlbHBlclxyXG4iLCJjb25zdCBKYW51c1BsdWdpbiA9IHJlcXVpcmUoJy4uL0phbnVzUGx1Z2luJyk7XHJcblxyXG5jbGFzcyBMZWF2ZUNhcGFiaWxpdHkgZXh0ZW5kcyBKYW51c1BsdWdpbiB7XHJcbiAgY29uc3RydWN0b3IgKGxvZ2dlcikge1xyXG4gICAgc3VwZXIobG9nZ2VyKTtcclxuICB9XHJcblxyXG4gIGxlYXZlUm9vbSgpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiTGVhdmluZyB0aGUgcm9vbVwiKTtcclxuXHJcbiAgICBjb25zdCBib2R5ID0geyByZXF1ZXN0OiAnbGVhdmUnIH07XHJcblxyXG4gICAgcmV0dXJuIHRoaXMudHJhbnNhY3Rpb24oJ21lc3NhZ2UnLCB7IGJvZHkgfSwgJ2V2ZW50JylcclxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xyXG4gICAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGVhdmVDYXBhYmlsaXR5OyIsImNvbnN0IGFkYXB0ZXIgPSByZXF1aXJlKCd3ZWJydGMtYWRhcHRlcicpO1xyXG5cclxuY29uc3QgVmlkZW9Sb29tUHVibGlzaGVyID0gcmVxdWlyZSgnLi9WaWRlb1Jvb21QdWJsaXNoZXInKTtcclxuY29uc3QgVmlkZW9Sb29tU3Vic2NyaWJlciA9IHJlcXVpcmUoJy4vVmlkZW9Sb29tU3Vic2NyaWJlcicpO1xyXG5cclxuY29uc3QgSmFudXNQbHVnaW4gPSByZXF1aXJlKCcuLi9KYW51c1BsdWdpbicpO1xyXG5jb25zdCBTZHBIZWxwZXIgPSByZXF1aXJlKCcuLi9TZHBIZWxwZXInKTtcclxuXHJcbmNsYXNzIFZpZGVvUm9vbSBleHRlbmRzIEphbnVzUGx1Z2luIHtcclxuICBjb25zdHJ1Y3RvciAobG9nZ2VyLCBpY2VDb25maWcsIGZpbHRlckRpcmVjdENhbmRpZGF0ZXMpIHtcclxuICAgIHN1cGVyKGxvZ2dlcik7XHJcbiAgICB0aGlzLnBsdWdpbk5hbWUgPSAnamFudXMucGx1Z2luLnZpZGVvcm9vbSc7XHJcblxyXG4gICAgdGhpcy5pY2VDb25maWcgPSBpY2VDb25maWc7XHJcbiAgICB0aGlzLmZpbHRlckRpcmVjdENhbmRpZGF0ZXMgPSAhIWZpbHRlckRpcmVjdENhbmRpZGF0ZXM7XHJcblxyXG4gICAgdGhpcy5zZHBIZWxwZXIgPSBuZXcgU2RwSGVscGVyKHRoaXMubG9nZ2VyKTtcclxuICB9XHJcblxyXG4gIGxpc3RSb29tcyAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbignbWVzc2FnZScsIHsgYm9keTogeyByZXF1ZXN0OiAnbGlzdCcgfSB9LCAnc3VjY2VzcycpLnRoZW4oKHBhcmFtKSA9PiB7XHJcbiAgICAgIGNvbnN0IHsgZGF0YSB9ID0gcGFyYW0gfHwge307XHJcbiAgICAgIGlmICghZGF0YSB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmxpc3QpKSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbSwgY291bGQgbm90IGZpbmQgcm9vbXMgbGlzdCcsIGRhdGEpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVmlkZW9Sb29tLCBjb3VsZCBub3QgZmluZCByb29tcyBsaXN0Jyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBkYXRhLmxpc3Q7XHJcbiAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbSwgY2Fubm90IGxpc3Qgcm9vbXMnLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIC8vdG9kbzogbGlzdCBwYXJ0aWNpcGFudHNcclxuXHJcbiAgY3JlYXRlUHVibGlzaGVyICgpIHtcclxuICAgIHJldHVybiB0aGlzLmphbnVzLmFkZFBsdWdpbihuZXcgVmlkZW9Sb29tUHVibGlzaGVyKHRoaXMubG9nZ2VyKSlcclxuICAgICAgLnRoZW4oKHB1Ymxpc2hlcikgPT4ge1xyXG4gICAgICAgIHB1Ymxpc2hlci5pbml0aWFsaXplKHRoaXMuY3JlYXRlUGVlckNvbm5lY3Rpb24ocHVibGlzaGVyKSk7XHJcbiAgICAgICAgcmV0dXJuIHB1Ymxpc2hlcjtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVTdWJzY3JpYmVyICgpIHtcclxuICAgIHJldHVybiB0aGlzLmphbnVzLmFkZFBsdWdpbihuZXcgVmlkZW9Sb29tU3Vic2NyaWJlcih0aGlzLmxvZ2dlcikpXHJcbiAgICAgIC50aGVuKChzdWJzY3JpYmVyKSA9PiB7XHJcbiAgICAgICAgc3Vic2NyaWJlci5pbml0aWFsaXplKHRoaXMuY3JlYXRlUGVlckNvbm5lY3Rpb24oc3Vic2NyaWJlcikpO1xyXG4gICAgICAgIHJldHVybiBzdWJzY3JpYmVyO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIGNyZWF0ZVBlZXJDb25uZWN0aW9uIChwbHVnaW4pIHtcclxuICAgIGNvbnN0IHBlZXJDb25uZWN0aW9uID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKHRoaXMuaWNlQ29uZmlnKTtcclxuICAgIHBlZXJDb25uZWN0aW9uLm9uaWNlY2FuZGlkYXRlID0gdGhpcy5vbkljZUNhbmRpZGF0ZShwbHVnaW4pO1xyXG4gICAgcmV0dXJuIHBlZXJDb25uZWN0aW9uO1xyXG4gIH1cclxuXHJcbiAgc3VibWl0Q2FuZGlkYXRlIChwbHVnaW4sIGNhbmRpZGF0ZSkge1xyXG4gICAgaWYgKHRoaXMuZmlsdGVyRGlyZWN0Q2FuZGlkYXRlcyAmJiBjYW5kaWRhdGUuY2FuZGlkYXRlICYmXHJcbiAgICAgIHRoaXMuc2RwSGVscGVyLmlzRGlyZWN0Q2FuZGlkYXRlKGNhbmRpZGF0ZS5jYW5kaWRhdGUpKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcGx1Z2luLnRyYW5zYWN0aW9uKCd0cmlja2xlJywgeyBjYW5kaWRhdGUgfSk7XHJcbiAgfVxyXG5cclxuICBvbkljZUNhbmRpZGF0ZShwbHVnaW4pIHtcclxuICAgIHJldHVybiAoZXZlbnQpID0+IHtcclxuICAgICAgaWYgKCFldmVudC5jYW5kaWRhdGUgfHwgIWV2ZW50LmNhbmRpZGF0ZS5jYW5kaWRhdGUpIHtcclxuICAgICAgICB0aGlzLnN1Ym1pdENhbmRpZGF0ZShwbHVnaW4sIHtjb21wbGV0ZWQ6IHRydWV9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zdCBjYW5kaWRhdGUgPSB7XHJcbiAgICAgICAgICBjYW5kaWRhdGU6IGV2ZW50LmNhbmRpZGF0ZS5jYW5kaWRhdGUsXHJcbiAgICAgICAgICBzZHBNaWQ6IGV2ZW50LmNhbmRpZGF0ZS5zZHBNaWQsXHJcbiAgICAgICAgICBzZHBNTGluZUluZGV4OiBldmVudC5jYW5kaWRhdGUuc2RwTUxpbmVJbmRleFxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnN1Ym1pdENhbmRpZGF0ZShwbHVnaW4sIGNhbmRpZGF0ZSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvUm9vbTtcclxuIiwiY29uc3QgSmFudXNQbHVnaW4gPSByZXF1aXJlKCcuLi9KYW51c1BsdWdpbicpO1xyXG5cclxuY2xhc3MgVmlkZW9Sb29tQWRtaW4gZXh0ZW5kcyBKYW51c1BsdWdpbiB7XHJcbiAgY29uc3RydWN0b3IgKGNvbmZpZywgbG9nZ2VyKSB7XHJcbiAgICBpZiAoIWNvbmZpZykge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vua25vd24gY29uZmlnJyk7XHJcbiAgICB9XHJcblxyXG4gICAgc3VwZXIobG9nZ2VyKTtcclxuICAgIHRoaXMucGx1Z2luTmFtZSA9ICdqYW51cy5wbHVnaW4udmlkZW9yb29tJztcclxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlUm9vbSAoZGVzY3JpcHRpb24sIGhpZGRlbiA9IGZhbHNlLCByZWNvcmRpbmcgPSBmYWxzZSwgcGluID0gbnVsbCwgc2VjcmV0ID0gbnVsbCkge1xyXG4gICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBuZXcgcm9vbTpcIik7XHJcbiAgICBjb25zb2xlLmxvZyhgXFx0ZGVzY3JpcHRpb249JHtkZXNjcmlwdGlvbn1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBcXHRoaWRkZW49JHtoaWRkZW59LCByZWNvcmRpbmc9JHtyZWNvcmRpbmd9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgXFx0cGluPSR7cGlufSwgc2VjcmV0PSR7c2VjcmV0fWApO1xyXG4gICAgY29uc3QgYm9keSA9IHtcclxuICAgICAgcmVxdWVzdDogXCJjcmVhdGVcIixcclxuICAgICAgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLFxyXG4gICAgICByZWNvcmQ6IHJlY29yZGluZyxcclxuICAgICAgdmlkZW9jb2RlYzogdGhpcy5jb25maWcuY29kZWMsXHJcbiAgICAgIHB1Ymxpc2hlcnM6IHRoaXMuY29uZmlnLnB1Ymxpc2hlcnMsXHJcbiAgICAgIHZpZGVvb3JpZW50X2V4dDogdGhpcy5jb25maWcudmlkZW9PcmllbnRFeHRcclxuICAgIH07XHJcblxyXG4gICAgaWYgKHJlY29yZGluZykge1xyXG4gICAgICBib2R5LnJlY19kaXIgPSB0aGlzLmNvbmZpZy5yZWNvcmREaXJlY3Rvcnk7XHJcbiAgICB9XHJcbiAgICBpZiAoaGlkZGVuKSB7XHJcbiAgICAgIGJvZHkuaXNfcHJpdmF0ZSA9IGhpZGRlbjtcclxuICAgIH1cclxuICAgIGlmIChzZWNyZXQpIHtcclxuICAgICAgLy9wYXNzd29yZCB1c2VkIGZvciBtb2RpZnlpbmcvZGVzdHJveWluZyB0aGUgcm9vbVxyXG4gICAgICBib2R5LnNlY3JldCA9IHNlY3JldDtcclxuICAgIH1cclxuICAgIGlmIChwaW4pIHtcclxuICAgICAgLy9wYXNzd29yZCB1c2VkIGZvciBqb2luaW5nIHRoZSByb29tXHJcbiAgICAgIGJvZHkucGluID0gcGluO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmNvbmZpZy5iaXRyYXRlKSB7XHJcbiAgICAgIGJvZHkuYml0cmF0ZSA9IHRoaXMuY29uZmlnLmJpdHJhdGU7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5jb25maWcuZmlyU2Vjb25kcykge1xyXG4gICAgICBib2R5LmZpcl9mcmVxID0gdGhpcy5jb25maWcuZmlyU2Vjb25kcztcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbignbWVzc2FnZScsIHsgYm9keSB9LCAnc3VjY2VzcycpXHJcbiAgICAgIC50aGVuKChwYXJhbSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gcGFyYW0gfHwge31cclxuICAgICAgICBpZiAoIWRhdGEgfHwgIWRhdGEucm9vbSkge1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbUphbnVzUGx1Z2luLCBjb3VsZCBub3QgY3JlYXRlIHJvb20nLCBkYXRhKTtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVmlkZW9Sb29tSmFudXNQbHVnaW4sIGNvdWxkIG5vdCBjcmVhdGUgcm9vbScpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGRhdGEucm9vbTtcclxuICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbUphbnVzUGx1Z2luLCBjb3VsZCBub3QgY3JlYXRlIHJvb20nLCBlcnJvcik7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH0pXHJcbiAgfVxyXG5cclxuICBkZXN0cm95Um9vbSAoaWQsIHNlY3JldCA9IG51bGwpIHtcclxuICAgIGNvbnNvbGUubG9nKGBEZXN0cm95aW5nIHJvb20gJHtpZH1gKTtcclxuICAgIGNvbnN0IGJvZHkgPSB7XHJcbiAgICAgIHJlcXVlc3Q6IFwiZGVzdHJveVwiLFxyXG4gICAgICByb29tOiBpZCxcclxuICAgICAgc2VjcmV0OiBzZWNyZXRcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHRoaXMudHJhbnNhY3Rpb24oJ21lc3NhZ2UnLCB7IGJvZHkgfSwgJ3N1Y2Nlc3MnKVxyXG4gICAgICAudGhlbigocGFyYW0pID0+IHtcclxuICAgICAgICBjb25zdCB7IGRhdGEgfSA9IHBhcmFtIHx8IHt9XHJcbiAgICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLnJvb20pIHtcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWaWRlb1Jvb21KYW51c1BsdWdpbiwgY291bGQgbm90IGRlc3Ryb3kgcm9vbScsIGRhdGEpO1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWaWRlb1Jvb21KYW51c1BsdWdpbiwgY291bGQgbm90IGRlc3Ryb3kgcm9vbScpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGRhdGEucm9vbTtcclxuICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbUphbnVzUGx1Z2luLCBjb3VsZCBub3QgZGVzdHJveSByb29tJywgZXJyb3IpO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9KVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBWaWRlb1Jvb21BZG1pbjtcclxuIiwiY29uc3QgTGVhdmVDYXBhYmlsaXR5ID0gcmVxdWlyZSgnLi9MZWF2ZUNhcGFiaWxpdHknKTtcclxuXHJcbmNsYXNzIFZpZGVvUm9vbVB1Ymxpc2hlciBleHRlbmRzIExlYXZlQ2FwYWJpbGl0eSB7XHJcbiAgY29uc3RydWN0b3IgKGxvZ2dlcikge1xyXG4gICAgc3VwZXIobG9nZ2VyKTtcclxuICAgIHRoaXMucGx1Z2luTmFtZSA9ICdqYW51cy5wbHVnaW4udmlkZW9yb29tJztcclxuXHJcbiAgICB0aGlzLnJvb21JZCA9IHVuZGVmaW5lZDtcclxuICAgIHRoaXMubWVtYmVySWQgPSB1bmRlZmluZWQ7XHJcbiAgICB0aGlzLnByaXZhdGVNZW1iZXJJZCA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICB0aGlzLm9mZmVyU2RwID0gdW5kZWZpbmVkO1xyXG4gICAgdGhpcy5hbnN3ZXJTZHAgPSB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICBpbml0aWFsaXplIChwZWVyQ29ubmVjdGlvbikge1xyXG4gICAgdGhpcy5wZWVyQ29ubmVjdGlvbiA9IHBlZXJDb25uZWN0aW9uO1xyXG4gIH1cclxuICBcclxuICBqb2luUm9vbUFuZFB1Ymxpc2ggKHJvb21JZCwgZGlzcGxheU5hbWUsIHJvb21QaW4gPSBudWxsLFxyXG4gICAgICBhdWRpbyA9IHRydWUsIHZpZGVvID0gdHJ1ZSwgZGF0YSA9IHRydWUpIHtcclxuICAgIGNvbnNvbGUubG9nKGBDb25uZWN0aW5nIHRvIHRoZSByb29tICR7cm9vbUlkfWApO1xyXG4gICAgdGhpcy5yb29tSWQgPSByb29tSWQ7XHJcblxyXG4gICAgY29uc3QgYm9keSA9IHtcclxuICAgICAgcmVxdWVzdDogJ2pvaW5hbmRjb25maWd1cmUnLFxyXG4gICAgICByb29tOiB0aGlzLnJvb21JZCxcclxuICAgICAgcHR5cGU6ICdwdWJsaXNoZXInLFxyXG4gICAgICBkaXNwbGF5OiBkaXNwbGF5TmFtZSxcclxuICAgICAgYXVkaW86IGF1ZGlvLFxyXG4gICAgICB2aWRlbzogdmlkZW8sXHJcbiAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChyb29tUGluKSB7XHJcbiAgICAgIGJvZHkucGluID0gcm9vbVBpbjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKGRhdGEpIHtcclxuICAgICAgICB0aGlzLmRhdGFDaGFubmVsID0gdGhpcy5wZWVyQ29ubmVjdGlvbi5jcmVhdGVEYXRhQ2hhbm5lbChcIkphbnVzRGF0YUNoYW5uZWxcIiwgeyBvcmRlcmVkOiBmYWxzZSB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5kYXRhQ2hhbm5lbC5vbm1lc3NhZ2UgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUud2FybihcIlJlY2VpdmVkIGFuIHVuZXhwZWN0ZWQgbWVzc2FnZSBvbiBkYXRhIGNoYW5uZWxcIiwgZXZlbnQpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGxldCBvbkRhdGFDaGFubmVsU3RhdGVDaGFuZ2UgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgc3RhdGUgY2hhbmdlIG9uIGRhdGEgY2hhbm5lbFwiLCBldmVudCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLmRhdGFDaGFubmVsLm9ub3BlbiA9IG9uRGF0YUNoYW5uZWxTdGF0ZUNoYW5nZTtcclxuICAgICAgICB0aGlzLmRhdGFDaGFubmVsLm9uY2xvc2UgPSBvbkRhdGFDaGFubmVsU3RhdGVDaGFuZ2U7XHJcblxyXG4gICAgICAgIHRoaXMuZGF0YUNoYW5uZWwub25lcnJvciA9IChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihcIkdvdCBhbiBlcnJvciBvbiBkYXRhIGNoYW5uZWxcIiwgZXJyb3IpO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMucGVlckNvbm5lY3Rpb24uY3JlYXRlT2ZmZXIoe30pXHJcbiAgICAgIC50aGVuKChvZmZlcikgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU0RQIG9mZmVyIGluaXRpYWxpemVkXCIpO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5wZWVyQ29ubmVjdGlvbi5zZXRMb2NhbERlc2NyaXB0aW9uKG9mZmVyKVxyXG4gICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW3B1Yl0gTG9jYWxEZXNjcmlwdGlvbiBzZXQnLCBvZmZlcik7XHJcbiAgICAgICAgICAgIGNvbnN0IGpzZXAgPSBvZmZlcjtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZmlsdGVyRGlyZWN0Q2FuZGlkYXRlcyAmJiBqc2VwLnNkcCkge1xyXG4gICAgICAgICAgICAgIGpzZXAuc2RwID0gdGhpcy5zZHBIZWxwZXIuZmlsdGVyRGlyZWN0Q2FuZGlkYXRlcyhqc2VwLnNkcCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5vZmZlclNkcCA9IGpzZXAuc2RwO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNhY3Rpb24oJ21lc3NhZ2UnLCB7IGJvZHksIGpzZXAgfSwgJ2V2ZW50JylcclxuICAgICAgICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCB7IGRhdGEsIGpzb24gfSA9IHJlc3BvbnNlIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLmlkIHx8ICFkYXRhLnByaXZhdGVfaWQgfHwgIWRhdGEucHVibGlzaGVycykge1xyXG4gICAgICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tLCBjb3VsZCBub3Qgam9pbiByb29tJywgZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVmlkZW9Sb29tLCBjb3VsZCBub3Qgam9pbiByb29tJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoIWpzb24uanNlcCkge1xyXG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhY2tpbmcgSlNFUCBmaWVsZCBpbiByZXNwb25zZScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubWVtYmVySWQgPSBkYXRhLmlkO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5TmFtZSA9IGRpc3BsYXlOYW1lO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcml2YXRlTWVtYmVySWQgPSBkYXRhLnByaXZhdGVfaWQ7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QganNlcCA9IGpzb24uanNlcDtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmZpbHRlckRpcmVjdENhbmRpZGF0ZXMgJiYganNlcC5zZHApIHtcclxuICAgICAgICAgICAgICAgICAganNlcC5zZHAgPSB0aGlzLnNkcEhlbHBlci5maWx0ZXJEaXJlY3RDYW5kaWRhdGVzKGpzZXAuc2RwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuYW5zd2VyU2RwID0ganNlcC5zZHA7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGVlckNvbm5lY3Rpb24uc2V0UmVtb3RlRGVzY3JpcHRpb24oanNlcClcclxuICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW3B1Yl0gUmVtb3RlRGVzY3JpcHRpb24gc2V0XCIsIGpzZXApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvT24gPSBhdWRpbztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZGVvT24gPSB2aWRlbztcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5wdWJsaXNoZXJzO1xyXG4gICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbSwgZXJyb3IgY29ubmVjdGluZyB0byByb29tJywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSlcclxuICB9XHJcblxyXG4gIG1vZGlmeVB1Ymxpc2hpbmcgKGF1ZGlvID0gdHJ1ZSwgdmlkZW8gPSB0cnVlLCBkYXRhID0gdHJ1ZSkge1xyXG4gICAgY29uc29sZS5sb2coYE1vZGlmeWluZyBwdWJsaXNoaW5nIGZvciBtZW1iZXIgJHt0aGlzLm1lbWJlcklkfSBpbiByb29tICR7dGhpcy5yb29tSWR9YCk7XHJcblxyXG4gICAgbGV0IGNvbmZpZ3VyZSA9IHtcclxuICAgICAgcmVxdWVzdDogJ2NvbmZpZ3VyZScsXHJcbiAgICAgIHZpZGVvOiB2aWRlbyxcclxuICAgICAgYXVkaW86IGF1ZGlvLFxyXG4gICAgICBkYXRhOiBkYXRhXHJcbiAgICB9O1xyXG4gICAgaWYgKHRoaXMucm9vbVBpbikge1xyXG4gICAgICBjb25maWd1cmUucGluID0gdGhpcy5yb29tUGluO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uKFwibWVzc2FnZVwiLCB7IGJvZHk6IGNvbmZpZ3VyZSB9LCBcImV2ZW50XCIpXHJcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHsgZGF0YSwganNvbiB9ID0gcmVzcG9uc2UgfHwge307XHJcblxyXG4gICAgICAgIGlmICghZGF0YSB8fCBkYXRhLmNvbmZpZ3VyZWQgIT09IFwib2tcIikge1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXCJWaWRlb1Jvb20gY29uZmlndXJlIGFuc3dlciBpcyBub3QgXFxcIm9rXFxcIlwiLCBkYXRhLCBqc29uKTtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZpZGVvUm9vbSBjb25maWd1cmUgYW5zd2VyIGlzIG5vdCBcXFwib2tcXFwiXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJQdWJsaXNoaW5nIG1vZGlmaWVkXCIsIHJlc3BvbnNlKTtcclxuICAgICAgICB0aGlzLmF1ZGlvT24gPSBhdWRpbztcclxuICAgICAgICB0aGlzLnZpZGVvT24gPSB2aWRlbztcclxuICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXCJWaWRlb1Jvb20sIHVua25vd24gZXJyb3IgbW9kaWZ5aW5nIHB1Ymxpc2hpbmdcIiwgZXJyb3IsIGNvbmZpZ3VyZSk7XHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgc2VuZERhdGEgKG1lc3NhZ2Upe1xyXG4gICAgaWYgKHRoaXMuZGF0YUNoYW5uZWwpIHtcclxuICAgICAgY29uc29sZS5sb2coXCJTZW5kaW5nIHNvbWUgZGF0YSBcIiwgbWVzc2FnZSk7XHJcbiAgICAgIHRoaXMuZGF0YUNoYW5uZWwuc2VuZChtZXNzYWdlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gc2VuZCBkYXRhIG92ZXIgdGhlIERhdGFDaGFubmVsXCIsIHRoaXMuZGF0YUNoYW5uZWwpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RvcEF1ZGlvICgpIHtcclxuICAgIGlmICh0aGlzLmF1ZGlvT24pIHtcclxuICAgICAgY29uc29sZS5sb2coXCJTdG9wcGluZyBwdWJsaXNoZWQgYXVkaW9cIik7XHJcbiAgICAgIHJldHVybiB0aGlzLm1vZGlmeVB1Ymxpc2hpbmcoZmFsc2UsIHRoaXMudmlkZW9Pbik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmxvZyhgUHVibGlzaGVkIGF1ZGlvIGlzIGFscmVhZHkgdHVybmVkIG9mZmApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RhcnRBdWRpbyAoKSB7XHJcbiAgICBpZiAoIXRoaXMuYXVkaW9Pbikge1xyXG4gICAgICBjb25zb2xlLmxvZyhcIlN0YXJ0aW5nIHB1Ymxpc2hlZCBhdWRpb1wiKTtcclxuICAgICAgcmV0dXJuIHRoaXMubW9kaWZ5UHVibGlzaGluZyh0cnVlLCB0aGlzLnZpZGVvT24pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5sb2coYFB1Ymxpc2hlZCBhdWRpbyBpcyBhbHJlYWR5IHR1cm5lZCBvbmApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RvcFZpZGVvICgpIHtcclxuICAgIGlmICh0aGlzLnZpZGVvT24pIHtcclxuICAgICAgY29uc29sZS5sb2coXCJTdG9wcGluZyBwdWJsaXNoZWQgdmlkZW9cIik7XHJcbiAgICAgIHJldHVybiB0aGlzLm1vZGlmeVB1Ymxpc2hpbmcodGhpcy5hdWRpb09uLCBmYWxzZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmxvZyhgUHVibGlzaGVkIHZpZGVvIGlzIGFscmVhZHkgdHVybmVkIG9mZmApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RhcnRWaWRlbyAoKSB7XHJcbiAgICBpZiAoIXRoaXMudmlkZW9Pbikge1xyXG4gICAgICBjb25zb2xlLmxvZyhcIlN0YXJ0aW5nIHB1Ymxpc2hlZCB2aWRlb1wiKTtcclxuICAgICAgcmV0dXJuIHRoaXMubW9kaWZ5UHVibGlzaGluZyh0aGlzLmF1ZGlvT24sIHRydWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5sb2coYFZpZGVvIG9mIHB1Ymxpc2hlciAke3RoaXMucHVibGlzaGVySWR9IGlzIGFscmVhZHkgdHVybmVkIG9uYCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvbm1lc3NhZ2UgKGRhdGEsIGpzb24pIHtcclxuICAgIC8vIFRPRE8gZGF0YS52aWRlb3Jvb20gPT09ICdkZXN0cm95ZWQnIGhhbmRsaW5nXHJcbiAgICAvLyBUT0RPIHVucHVibGlzaGVkID09PSAnb2snIGhhbmRsaW5nIDogd2UgYXJlIHVucHVibGlzaGVkXHJcblxyXG4gICAgY29uc3QgeyB2aWRlb3Jvb20gfSA9IGRhdGEgfHwge307XHJcblxyXG4gICAgaWYgKCFkYXRhIHx8ICF2aWRlb3Jvb20pIHtcclxuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbSBnb3QgdW5rbm93biBtZXNzYWdlJywganNvbik7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodmlkZW9yb29tID09PSAnc2xvd19saW5rJykge1xyXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnVmlkZW9Sb29tIGdvdCBzbG93X2xpbmsnLCBkYXRhKTtcclxuICAgICAgdGhpcy5zbG93TGluaygpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHZpZGVvcm9vbSA9PT0gJ2V2ZW50Jykge1xyXG4gICAgICBjb25zdCB7IHJvb20sIGpvaW5pbmcsIHVucHVibGlzaGVkLCBsZWF2aW5nLCBwdWJsaXNoZXJzIH0gPSBkYXRhO1xyXG4gICAgICBpZiAocm9vbSAhPT0gdGhpcy5yb29tSWQpIHtcclxuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignVmlkZW9Sb29tIGdvdCB1bmtub3duIHJvb21JZCcsIHRoaXMucm9vbUlkLCBqc29uKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChqb2luaW5nKSB7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdyZW1vdGVNZW1iZXJKb2luZWQnLCBqb2luaW5nKTtcclxuICAgICAgfSBlbHNlIGlmICh1bnB1Ymxpc2hlZCkge1xyXG4gICAgICAgIHRoaXMuZW1pdCgncmVtb3RlTWVtYmVyVW5wdWJsaXNoZWQnLCB1bnB1Ymxpc2hlZCk7XHJcbiAgICAgIH0gZWxzZSBpZiAobGVhdmluZykge1xyXG4gICAgICAgIHRoaXMuZW1pdCgncmVtb3RlTWVtYmVyTGVhdmluZycsIGxlYXZpbmcpO1xyXG4gICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocHVibGlzaGVycykpIHtcclxuICAgICAgICB0aGlzLmVtaXQoJ3B1Ymxpc2hlcnNVcGRhdGVkJywgcHVibGlzaGVycyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbSBnb3QgdW5rbm93biBldmVudCcsIGpzb24pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbSB1bmhhbmRsZWQgbWVzc2FnZTonLCB2aWRlb3Jvb20sIGpzb24pO1xyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBWaWRlb1Jvb21QdWJsaXNoZXI7XHJcbiIsImNvbnN0IExlYXZlQ2FwYWJpbGl0eSA9IHJlcXVpcmUoJy4vTGVhdmVDYXBhYmlsaXR5Jyk7XHJcblxyXG5jbGFzcyBWaWRlb1Jvb21TdWJzY3JpYmVyIGV4dGVuZHMgTGVhdmVDYXBhYmlsaXR5IHtcclxuICBjb25zdHJ1Y3RvciAobG9nZ2VyKSB7XHJcbiAgICBzdXBlcihsb2dnZXIpO1xyXG4gICAgdGhpcy5wbHVnaW5OYW1lID0gXCJqYW51cy5wbHVnaW4udmlkZW9yb29tXCI7XHJcbiAgfVxyXG5cclxuICBpbml0aWFsaXplIChwZWVyQ29ubmVjdGlvbikge1xyXG4gICAgdGhpcy5wZWVyQ29ubmVjdGlvbiA9IHBlZXJDb25uZWN0aW9uO1xyXG4gIH1cclxuXHJcbiAgam9pblJvb21BbmRTdWJzY3JpYmUgKHJvb21JZCwgcHVibGlzaGVySWQsIHJvb21QaW4gPSBudWxsLCBwcml2YXRlUHVibGlzaGVySWQgPSBudWxsLFxyXG4gICAgICBhdWRpbyA9IHRydWUsIHZpZGVvID0gdHJ1ZSwgZGF0YSA9IHRydWUpIHtcclxuICAgIGNvbnNvbGUubG9nKGBTdWJzY3JpYmluZyB0byBtZW1iZXIgJHtwdWJsaXNoZXJJZH0gaW4gcm9vbSAke3Jvb21JZH1gKTtcclxuXHJcbiAgICB0aGlzLnJvb21JZCA9IHJvb21JZDtcclxuICAgIHRoaXMucm9vbVBpbiA9IHJvb21QaW47XHJcbiAgICB0aGlzLnB1Ymxpc2hlcklkID0gcHVibGlzaGVySWQ7XHJcbiAgICB0aGlzLnByaXZhdGVQdWJsaXNoZXJJZCA9IHByaXZhdGVQdWJsaXNoZXJJZDtcclxuICAgIHRoaXMuYXVkaW8gPSBhdWRpbztcclxuICAgIHRoaXMudmlkZW8gPSB2aWRlbztcclxuXHJcbiAgICBsZXQgam9pbiA9IHtcclxuICAgICAgcmVxdWVzdDogXCJqb2luXCIsXHJcbiAgICAgIHB0eXBlOiBcInN1YnNjcmliZXJcIixcclxuICAgICAgZmVlZDogcHVibGlzaGVySWQsXHJcbiAgICAgIHJvb206IHJvb21JZCxcclxuICAgICAgYXVkaW86IGF1ZGlvLFxyXG4gICAgICB2aWRlbzogdmlkZW8sXHJcbiAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgIG9mZmVyX3ZpZGVvOiB2aWRlbyxcclxuICAgICAgb2ZmZXJfYXVkaW86IGF1ZGlvLFxyXG4gICAgICBvZmZlcl9kYXRhOiBkYXRhXHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChyb29tUGluKSB7XHJcbiAgICAgIGpvaW4ucGluID0gcm9vbVBpbjtcclxuICAgIH1cclxuICAgIGlmIChwcml2YXRlUHVibGlzaGVySWQpIHtcclxuICAgICAgam9pbi5wcml2YXRlX2lkID0gcHJpdmF0ZVB1Ymxpc2hlcklkO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChkYXRhKSB7XHJcbiAgICAgIHRoaXMuZGF0YUNoYW5uZWwgPSB0aGlzLnBlZXJDb25uZWN0aW9uLmNyZWF0ZURhdGFDaGFubmVsKFwiSmFudXNEYXRhQ2hhbm5lbFwiLCB7b3JkZXJlZDpmYWxzZX0pO1xyXG5cclxuICAgICAgbGV0IG9uRGF0YUNoYW5uZWxNZXNzYWdlID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNlaXZlZCBhIG1lc3NhZ2Ugb24gZGF0YSBjaGFubmVsXCIsIGV2ZW50KTtcclxuICAgICAgICB0aGlzLmVtaXQoJ2RhdGFNZXNzYWdlJyxldmVudC5kYXRhKTtcclxuICAgICAgfTtcclxuICAgICAgdGhpcy5kYXRhQ2hhbm5lbC5vbm1lc3NhZ2UgPSBvbkRhdGFDaGFubmVsTWVzc2FnZS5iaW5kKHRoaXMpO1xyXG5cclxuICAgICAgbGV0IG9uRGF0YUNoYW5uZWxTdGF0ZUNoYW5nZSA9IChldmVudCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgc3RhdGUgY2hhbmdlIG9uIGRhdGEgY2hhbm5lbFwiLCBldmVudCk7XHJcbiAgICAgIH07XHJcbiAgICAgIHRoaXMuZGF0YUNoYW5uZWwub25vcGVuID0gb25EYXRhQ2hhbm5lbFN0YXRlQ2hhbmdlO1xyXG4gICAgICB0aGlzLmRhdGFDaGFubmVsLm9uY2xvc2UgPSBvbkRhdGFDaGFubmVsU3RhdGVDaGFuZ2U7XHJcblxyXG4gICAgICB0aGlzLmRhdGFDaGFubmVsLm9uZXJyb3IgPSAoZXJyb3IpID0+IHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKFwiR290IGFuIGVycm9yIG9uIGRhdGEgY2hhbm5lbFwiLCBlcnJvcik7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMudHJhbnNhY3Rpb24oXCJtZXNzYWdlXCIsIHsgYm9keTogam9pbiB9LCBcImV2ZW50XCIpXHJcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHsgZGF0YSwganNvbiB9ID0gcmVzcG9uc2UgfHwge307XHJcblxyXG4gICAgICAgIGlmICghZGF0YSB8fCBkYXRhLnZpZGVvcm9vbSAhPT0gXCJhdHRhY2hlZFwiKSB7XHJcbiAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihcIlZpZGVvUm9vbSBqb2luIGFuc3dlciBpcyBub3QgXFxcImF0dGFjaGVkXFxcIlwiLCBkYXRhLCBqc29uKTtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZpZGVvUm9vbSBqb2luIGFuc3dlciBpcyBub3QgXFxcImF0dGFjaGVkXFxcIlwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFqc29uLmpzZXApIHtcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFwiVmlkZW9Sb29tIGpvaW4gYW5zd2VyIGRvZXMgbm90IGNvbnRhaW5zIGpzZXBcIiwgZGF0YSwganNvbik7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWaWRlb1Jvb20gam9pbiBhbnN3ZXIgZG9lcyBub3QgY29udGFpbnMganNlcFwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGpzZXAgPSBqc29uLmpzZXA7XHJcbiAgICAgICAgaWYgKHRoaXMuZmlsdGVyRGlyZWN0Q2FuZGlkYXRlcyAmJiBqc2VwLnNkcCkge1xyXG4gICAgICAgICAganNlcC5zZHAgPSB0aGlzLnNkcEhlbHBlci5maWx0ZXJEaXJlY3RDYW5kaWRhdGVzKGpzZXAuc2RwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLnBlZXJDb25uZWN0aW9uLnNldFJlbW90ZURlc2NyaXB0aW9uKGpzZXApXHJcbiAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW3N1Yl0gUmVtb3RlRGVzY3JpcHRpb24gc2V0XCIsIGpzZXApO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wZWVyQ29ubmVjdGlvbi5jcmVhdGVBbnN3ZXIoeyBvZmZlclRvUmVjZWl2ZUF1ZGlvOiB0cnVlLCBvZmZlclRvUmVjZWl2ZVZpZGVvOiB0cnVlIH0pXHJcbiAgICAgICAgICAgICAgLnRoZW4oKGFuc3dlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGVlckNvbm5lY3Rpb24uc2V0TG9jYWxEZXNjcmlwdGlvbihhbnN3ZXIpXHJcbiAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltzdWJdIExvY2FsRGVzY3JpcHRpb24gc2V0XCIsIGFuc3dlcik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGpzZXAgPSBhbnN3ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IHsgcmVxdWVzdDogJ3N0YXJ0Jywgcm9vbTogdGhpcy5yb29tSWQgfTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbignbWVzc2FnZScsIHsgYm9keSwganNlcCB9LCAnZXZlbnQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZGF0YSwganNvbiB9ID0gcmVzcG9uc2UgfHwge307XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEgfHwgZGF0YS5zdGFydGVkICE9PSAnb2snKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1ZpZGVvUm9vbSwgY291bGQgbm90IHN0YXJ0IGEgc3RyZWFtJywgZGF0YSwganNvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWaWRlb1Jvb20sIGNvdWxkIG5vdCBzdGFydCBhIHN0cmVhbScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvT24gPSBhdWRpbztcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWRlb09uID0gdmlkZW87XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWaWRlb1Jvb20sIHVua25vd24gZXJyb3Igc2VuZGluZyBhbnN3ZXInLCBlcnJvciwganNlcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdWaWRlb1Jvb20sIHVua25vd24gZXJyb3IgY29ubmVjdGluZyB0byByb29tJywgZXJyb3IsIGpvaW4pO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIG1vZGlmeVN1YnNjcmlwdGlvbiAoYXVkaW8gPSB0cnVlLCB2aWRlbyA9IHRydWUsIGRhdGEgPSB0cnVlKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgTW9kaWZ5aW5nIHN1YnNjcmlwdGlvbiB0byBtZW1iZXIgJHt0aGlzLnB1Ymxpc2hlcklkfSBpbiByb29tICR7dGhpcy5yb29tSWR9YCk7XHJcblxyXG4gICAgbGV0IGNvbmZpZ3VyZSA9IHtcclxuICAgICAgcmVxdWVzdDogJ2NvbmZpZ3VyZScsXHJcbiAgICAgIHB0eXBlOiAnc3Vic2NyaWJlcicsXHJcbiAgICAgIGZlZWQ6IHRoaXMucHVibGlzaGVySWQsXHJcbiAgICAgIHJvb206IHRoaXMucm9vbUlkLFxyXG4gICAgICB2aWRlbzogdmlkZW8sXHJcbiAgICAgIGF1ZGlvOiBhdWRpbyxcclxuICAgICAgZGF0YTogZGF0YSxcclxuICAgICAgb2ZmZXJfdmlkZW86IHZpZGVvLFxyXG4gICAgICBvZmZlcl9hdWRpbzogYXVkaW8sXHJcbiAgICAgIG9mZmVyX2RhdGE6IGRhdGFcclxuICAgIH07XHJcbiAgICBpZiAodGhpcy5yb29tUGluKSB7XHJcbiAgICAgIGNvbmZpZ3VyZS5waW4gPSB0aGlzLnJvb21QaW47XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5wcml2YXRlUHVibGlzaGVySWQpIHtcclxuICAgICAgY29uZmlndXJlLnByaXZhdGVfaWQgPSB0aGlzLnByaXZhdGVQdWJsaXNoZXJJZDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcy50cmFuc2FjdGlvbihcIm1lc3NhZ2VcIiwgeyBib2R5OiBjb25maWd1cmUgfSwgXCJldmVudFwiKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgICAgICBjb25zdCB7IGRhdGEsIGpzb24gfSA9IHJlc3BvbnNlIHx8IHt9O1xyXG5cclxuICAgICAgICBpZiAoIWRhdGEgfHwgZGF0YS5jb25maWd1cmVkICE9PSBcIm9rXCIpIHtcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFwiVmlkZW9Sb29tIGNvbmZpZ3VyZSBhbnN3ZXIgaXMgbm90IFxcXCJva1xcXCJcIiwgZGF0YSwganNvbik7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWaWRlb1Jvb20gY29uZmlndXJlIGFuc3dlciBpcyBub3QgXFxcIm9rXFxcIlwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJTdWJzY3JpcHRpb24gbW9kaWZpZWRcIiwgcmVzcG9uc2UpO1xyXG5cclxuICAgICAgICB0aGlzLmF1ZGlvT24gPSBhdWRpbztcclxuICAgICAgICB0aGlzLnZpZGVvT24gPSB2aWRlbztcclxuICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoXCJWaWRlb1Jvb20sIHVua25vd24gZXJyb3IgbW9kaWZ5aW5nIHN1YnNjcmlwdGlvblwiLCBlcnJvciwgY29uZmlndXJlKTtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfSk7XHJcbiAgfVxyXG5cclxuICBzdG9wQXVkaW8gKCkge1xyXG4gICAgaWYgKHRoaXMuYXVkaW9Pbikge1xyXG4gICAgICBjb25zb2xlLmxvZyhgU3RvcHBpbmcgYXVkaW8gb2YgcHVibGlzaGVyICR7dGhpcy5wdWJsaXNoZXJJZH1gKTtcclxuICAgICAgcmV0dXJuIHRoaXMubW9kaWZ5U3Vic2NyaXB0aW9uKGZhbHNlLCB0aGlzLnZpZGVvT24pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5sb2coYEF1ZGlvIG9mIHB1Ymxpc2hlciAke3RoaXMucHVibGlzaGVySWR9IGlzIGFscmVhZHkgdHVybmVkIG9mZmApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RhcnRBdWRpbyAoKSB7XHJcbiAgICBpZiAoIXRoaXMuYXVkaW9Pbikge1xyXG4gICAgICBjb25zb2xlLmxvZyhgU3RhcnRpbmcgYXVkaW8gb2YgcHVibGlzaGVyICR7dGhpcy5wdWJsaXNoZXJJZH1gKTtcclxuICAgICAgcmV0dXJuIHRoaXMubW9kaWZ5U3Vic2NyaXB0aW9uKHRydWUsIHRoaXMudmlkZW9Pbik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmxvZyhgQXVkaW8gb2YgcHVibGlzaGVyICR7dGhpcy5wdWJsaXNoZXJJZH0gaXMgYWxyZWFkeSB0dXJuZWQgb25gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0b3BWaWRlbyAoKSB7XHJcbiAgICBpZiAodGhpcy52aWRlb09uKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBTdG9wcGluZyB2aWRlbyBvZiBwdWJsaXNoZXIgJHt0aGlzLnB1Ymxpc2hlcklkfWApO1xyXG4gICAgICByZXR1cm4gdGhpcy5tb2RpZnlTdWJzY3JpcHRpb24odGhpcy5hdWRpb09uLCBmYWxzZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmxvZyhgVmlkZW8gb2YgcHVibGlzaGVyICR7dGhpcy5wdWJsaXNoZXJJZH0gaXMgYWxyZWFkeSB0dXJuZWQgb2ZmYCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGFydFZpZGVvICgpIHtcclxuICAgIGlmICghdGhpcy52aWRlb09uKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBTdGFydGluZyB2aWRlbyBvZiBwdWJsaXNoZXIgJHt0aGlzLnB1Ymxpc2hlcklkfWApO1xyXG4gICAgICByZXR1cm4gdGhpcy5tb2RpZnlTdWJzY3JpcHRpb24odGhpcy5hdWRpb09uLCB0cnVlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBWaWRlbyBvZiBwdWJsaXNoZXIgJHt0aGlzLnB1Ymxpc2hlcklkfSBpcyBhbHJlYWR5IHR1cm5lZCBvbmApO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBWaWRlb1Jvb21TdWJzY3JpYmVyO1xyXG4iLCIvKlxuICogIENvcHlyaWdodCAoYykgMjAxNyBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbiAvKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFNEUFV0aWxzID0gcmVxdWlyZSgnc2RwJyk7XG5cbmZ1bmN0aW9uIGZpeFN0YXRzVHlwZShzdGF0KSB7XG4gIHJldHVybiB7XG4gICAgaW5ib3VuZHJ0cDogJ2luYm91bmQtcnRwJyxcbiAgICBvdXRib3VuZHJ0cDogJ291dGJvdW5kLXJ0cCcsXG4gICAgY2FuZGlkYXRlcGFpcjogJ2NhbmRpZGF0ZS1wYWlyJyxcbiAgICBsb2NhbGNhbmRpZGF0ZTogJ2xvY2FsLWNhbmRpZGF0ZScsXG4gICAgcmVtb3RlY2FuZGlkYXRlOiAncmVtb3RlLWNhbmRpZGF0ZSdcbiAgfVtzdGF0LnR5cGVdIHx8IHN0YXQudHlwZTtcbn1cblxuZnVuY3Rpb24gd3JpdGVNZWRpYVNlY3Rpb24odHJhbnNjZWl2ZXIsIGNhcHMsIHR5cGUsIHN0cmVhbSwgZHRsc1JvbGUpIHtcbiAgdmFyIHNkcCA9IFNEUFV0aWxzLndyaXRlUnRwRGVzY3JpcHRpb24odHJhbnNjZWl2ZXIua2luZCwgY2Fwcyk7XG5cbiAgLy8gTWFwIElDRSBwYXJhbWV0ZXJzICh1ZnJhZywgcHdkKSB0byBTRFAuXG4gIHNkcCArPSBTRFBVdGlscy53cml0ZUljZVBhcmFtZXRlcnMoXG4gICAgICB0cmFuc2NlaXZlci5pY2VHYXRoZXJlci5nZXRMb2NhbFBhcmFtZXRlcnMoKSk7XG5cbiAgLy8gTWFwIERUTFMgcGFyYW1ldGVycyB0byBTRFAuXG4gIHNkcCArPSBTRFBVdGlscy53cml0ZUR0bHNQYXJhbWV0ZXJzKFxuICAgICAgdHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydC5nZXRMb2NhbFBhcmFtZXRlcnMoKSxcbiAgICAgIHR5cGUgPT09ICdvZmZlcicgPyAnYWN0cGFzcycgOiBkdGxzUm9sZSB8fCAnYWN0aXZlJyk7XG5cbiAgc2RwICs9ICdhPW1pZDonICsgdHJhbnNjZWl2ZXIubWlkICsgJ1xcclxcbic7XG5cbiAgaWYgKHRyYW5zY2VpdmVyLnJ0cFNlbmRlciAmJiB0cmFuc2NlaXZlci5ydHBSZWNlaXZlcikge1xuICAgIHNkcCArPSAnYT1zZW5kcmVjdlxcclxcbic7XG4gIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyKSB7XG4gICAgc2RwICs9ICdhPXNlbmRvbmx5XFxyXFxuJztcbiAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5ydHBSZWNlaXZlcikge1xuICAgIHNkcCArPSAnYT1yZWN2b25seVxcclxcbic7XG4gIH0gZWxzZSB7XG4gICAgc2RwICs9ICdhPWluYWN0aXZlXFxyXFxuJztcbiAgfVxuXG4gIGlmICh0cmFuc2NlaXZlci5ydHBTZW5kZXIpIHtcbiAgICB2YXIgdHJhY2tJZCA9IHRyYW5zY2VpdmVyLnJ0cFNlbmRlci5faW5pdGlhbFRyYWNrSWQgfHxcbiAgICAgICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyLnRyYWNrLmlkO1xuICAgIHRyYW5zY2VpdmVyLnJ0cFNlbmRlci5faW5pdGlhbFRyYWNrSWQgPSB0cmFja0lkO1xuICAgIC8vIHNwZWMuXG4gICAgdmFyIG1zaWQgPSAnbXNpZDonICsgKHN0cmVhbSA/IHN0cmVhbS5pZCA6ICctJykgKyAnICcgK1xuICAgICAgICB0cmFja0lkICsgJ1xcclxcbic7XG4gICAgc2RwICs9ICdhPScgKyBtc2lkO1xuICAgIC8vIGZvciBDaHJvbWUuIExlZ2FjeSBzaG91bGQgbm8gbG9uZ2VyIGJlIHJlcXVpcmVkLlxuICAgIHNkcCArPSAnYT1zc3JjOicgKyB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnNzcmMgK1xuICAgICAgICAnICcgKyBtc2lkO1xuXG4gICAgLy8gUlRYXG4gICAgaWYgKHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4KSB7XG4gICAgICBzZHAgKz0gJ2E9c3NyYzonICsgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHguc3NyYyArXG4gICAgICAgICAgJyAnICsgbXNpZDtcbiAgICAgIHNkcCArPSAnYT1zc3JjLWdyb3VwOkZJRCAnICtcbiAgICAgICAgICB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnNzcmMgKyAnICcgK1xuICAgICAgICAgIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4LnNzcmMgK1xuICAgICAgICAgICdcXHJcXG4nO1xuICAgIH1cbiAgfVxuICAvLyBGSVhNRTogdGhpcyBzaG91bGQgYmUgd3JpdHRlbiBieSB3cml0ZVJ0cERlc2NyaXB0aW9uLlxuICBzZHAgKz0gJ2E9c3NyYzonICsgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5zc3JjICtcbiAgICAgICcgY25hbWU6JyArIFNEUFV0aWxzLmxvY2FsQ05hbWUgKyAnXFxyXFxuJztcbiAgaWYgKHRyYW5zY2VpdmVyLnJ0cFNlbmRlciAmJiB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eCkge1xuICAgIHNkcCArPSAnYT1zc3JjOicgKyB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eC5zc3JjICtcbiAgICAgICAgJyBjbmFtZTonICsgU0RQVXRpbHMubG9jYWxDTmFtZSArICdcXHJcXG4nO1xuICB9XG4gIHJldHVybiBzZHA7XG59XG5cbi8vIEVkZ2UgZG9lcyBub3QgbGlrZVxuLy8gMSkgc3R1bjogZmlsdGVyZWQgYWZ0ZXIgMTQzOTMgdW5sZXNzID90cmFuc3BvcnQ9dWRwIGlzIHByZXNlbnRcbi8vIDIpIHR1cm46IHRoYXQgZG9lcyBub3QgaGF2ZSBhbGwgb2YgdHVybjpob3N0OnBvcnQ/dHJhbnNwb3J0PXVkcFxuLy8gMykgdHVybjogd2l0aCBpcHY2IGFkZHJlc3Nlc1xuLy8gNCkgdHVybjogb2NjdXJyaW5nIG11bGlwbGUgdGltZXNcbmZ1bmN0aW9uIGZpbHRlckljZVNlcnZlcnMoaWNlU2VydmVycywgZWRnZVZlcnNpb24pIHtcbiAgdmFyIGhhc1R1cm4gPSBmYWxzZTtcbiAgaWNlU2VydmVycyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoaWNlU2VydmVycykpO1xuICByZXR1cm4gaWNlU2VydmVycy5maWx0ZXIoZnVuY3Rpb24oc2VydmVyKSB7XG4gICAgaWYgKHNlcnZlciAmJiAoc2VydmVyLnVybHMgfHwgc2VydmVyLnVybCkpIHtcbiAgICAgIHZhciB1cmxzID0gc2VydmVyLnVybHMgfHwgc2VydmVyLnVybDtcbiAgICAgIGlmIChzZXJ2ZXIudXJsICYmICFzZXJ2ZXIudXJscykge1xuICAgICAgICBjb25zb2xlLndhcm4oJ1JUQ0ljZVNlcnZlci51cmwgaXMgZGVwcmVjYXRlZCEgVXNlIHVybHMgaW5zdGVhZC4nKTtcbiAgICAgIH1cbiAgICAgIHZhciBpc1N0cmluZyA9IHR5cGVvZiB1cmxzID09PSAnc3RyaW5nJztcbiAgICAgIGlmIChpc1N0cmluZykge1xuICAgICAgICB1cmxzID0gW3VybHNdO1xuICAgICAgfVxuICAgICAgdXJscyA9IHVybHMuZmlsdGVyKGZ1bmN0aW9uKHVybCkge1xuICAgICAgICB2YXIgdmFsaWRUdXJuID0gdXJsLmluZGV4T2YoJ3R1cm46JykgPT09IDAgJiZcbiAgICAgICAgICAgIHVybC5pbmRleE9mKCd0cmFuc3BvcnQ9dWRwJykgIT09IC0xICYmXG4gICAgICAgICAgICB1cmwuaW5kZXhPZigndHVybjpbJykgPT09IC0xICYmXG4gICAgICAgICAgICAhaGFzVHVybjtcblxuICAgICAgICBpZiAodmFsaWRUdXJuKSB7XG4gICAgICAgICAgaGFzVHVybiA9IHRydWU7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVybC5pbmRleE9mKCdzdHVuOicpID09PSAwICYmIGVkZ2VWZXJzaW9uID49IDE0MzkzICYmXG4gICAgICAgICAgICB1cmwuaW5kZXhPZignP3RyYW5zcG9ydD11ZHAnKSA9PT0gLTE7XG4gICAgICB9KTtcblxuICAgICAgZGVsZXRlIHNlcnZlci51cmw7XG4gICAgICBzZXJ2ZXIudXJscyA9IGlzU3RyaW5nID8gdXJsc1swXSA6IHVybHM7XG4gICAgICByZXR1cm4gISF1cmxzLmxlbmd0aDtcbiAgICB9XG4gIH0pO1xufVxuXG4vLyBEZXRlcm1pbmVzIHRoZSBpbnRlcnNlY3Rpb24gb2YgbG9jYWwgYW5kIHJlbW90ZSBjYXBhYmlsaXRpZXMuXG5mdW5jdGlvbiBnZXRDb21tb25DYXBhYmlsaXRpZXMobG9jYWxDYXBhYmlsaXRpZXMsIHJlbW90ZUNhcGFiaWxpdGllcykge1xuICB2YXIgY29tbW9uQ2FwYWJpbGl0aWVzID0ge1xuICAgIGNvZGVjczogW10sXG4gICAgaGVhZGVyRXh0ZW5zaW9uczogW10sXG4gICAgZmVjTWVjaGFuaXNtczogW11cbiAgfTtcblxuICB2YXIgZmluZENvZGVjQnlQYXlsb2FkVHlwZSA9IGZ1bmN0aW9uKHB0LCBjb2RlY3MpIHtcbiAgICBwdCA9IHBhcnNlSW50KHB0LCAxMCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2RlY3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjb2RlY3NbaV0ucGF5bG9hZFR5cGUgPT09IHB0IHx8XG4gICAgICAgICAgY29kZWNzW2ldLnByZWZlcnJlZFBheWxvYWRUeXBlID09PSBwdCkge1xuICAgICAgICByZXR1cm4gY29kZWNzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICB2YXIgcnR4Q2FwYWJpbGl0eU1hdGNoZXMgPSBmdW5jdGlvbihsUnR4LCByUnR4LCBsQ29kZWNzLCByQ29kZWNzKSB7XG4gICAgdmFyIGxDb2RlYyA9IGZpbmRDb2RlY0J5UGF5bG9hZFR5cGUobFJ0eC5wYXJhbWV0ZXJzLmFwdCwgbENvZGVjcyk7XG4gICAgdmFyIHJDb2RlYyA9IGZpbmRDb2RlY0J5UGF5bG9hZFR5cGUoclJ0eC5wYXJhbWV0ZXJzLmFwdCwgckNvZGVjcyk7XG4gICAgcmV0dXJuIGxDb2RlYyAmJiByQ29kZWMgJiZcbiAgICAgICAgbENvZGVjLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gckNvZGVjLm5hbWUudG9Mb3dlckNhc2UoKTtcbiAgfTtcblxuICBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MuZm9yRWFjaChmdW5jdGlvbihsQ29kZWMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlbW90ZUNhcGFiaWxpdGllcy5jb2RlY3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciByQ29kZWMgPSByZW1vdGVDYXBhYmlsaXRpZXMuY29kZWNzW2ldO1xuICAgICAgaWYgKGxDb2RlYy5uYW1lLnRvTG93ZXJDYXNlKCkgPT09IHJDb2RlYy5uYW1lLnRvTG93ZXJDYXNlKCkgJiZcbiAgICAgICAgICBsQ29kZWMuY2xvY2tSYXRlID09PSByQ29kZWMuY2xvY2tSYXRlKSB7XG4gICAgICAgIGlmIChsQ29kZWMubmFtZS50b0xvd2VyQ2FzZSgpID09PSAncnR4JyAmJlxuICAgICAgICAgICAgbENvZGVjLnBhcmFtZXRlcnMgJiYgckNvZGVjLnBhcmFtZXRlcnMuYXB0KSB7XG4gICAgICAgICAgLy8gZm9yIFJUWCB3ZSBuZWVkIHRvIGZpbmQgdGhlIGxvY2FsIHJ0eCB0aGF0IGhhcyBhIGFwdFxuICAgICAgICAgIC8vIHdoaWNoIHBvaW50cyB0byB0aGUgc2FtZSBsb2NhbCBjb2RlYyBhcyB0aGUgcmVtb3RlIG9uZS5cbiAgICAgICAgICBpZiAoIXJ0eENhcGFiaWxpdHlNYXRjaGVzKGxDb2RlYywgckNvZGVjLFxuICAgICAgICAgICAgICBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MsIHJlbW90ZUNhcGFiaWxpdGllcy5jb2RlY3MpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgckNvZGVjID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShyQ29kZWMpKTsgLy8gZGVlcGNvcHlcbiAgICAgICAgLy8gbnVtYmVyIG9mIGNoYW5uZWxzIGlzIHRoZSBoaWdoZXN0IGNvbW1vbiBudW1iZXIgb2YgY2hhbm5lbHNcbiAgICAgICAgckNvZGVjLm51bUNoYW5uZWxzID0gTWF0aC5taW4obENvZGVjLm51bUNoYW5uZWxzLFxuICAgICAgICAgICAgckNvZGVjLm51bUNoYW5uZWxzKTtcbiAgICAgICAgLy8gcHVzaCByQ29kZWMgc28gd2UgcmVwbHkgd2l0aCBvZmZlcmVyIHBheWxvYWQgdHlwZVxuICAgICAgICBjb21tb25DYXBhYmlsaXRpZXMuY29kZWNzLnB1c2gockNvZGVjKTtcblxuICAgICAgICAvLyBkZXRlcm1pbmUgY29tbW9uIGZlZWRiYWNrIG1lY2hhbmlzbXNcbiAgICAgICAgckNvZGVjLnJ0Y3BGZWVkYmFjayA9IHJDb2RlYy5ydGNwRmVlZGJhY2suZmlsdGVyKGZ1bmN0aW9uKGZiKSB7XG4gICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsQ29kZWMucnRjcEZlZWRiYWNrLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBpZiAobENvZGVjLnJ0Y3BGZWVkYmFja1tqXS50eXBlID09PSBmYi50eXBlICYmXG4gICAgICAgICAgICAgICAgbENvZGVjLnJ0Y3BGZWVkYmFja1tqXS5wYXJhbWV0ZXIgPT09IGZiLnBhcmFtZXRlcikge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gRklYTUU6IGFsc28gbmVlZCB0byBkZXRlcm1pbmUgLnBhcmFtZXRlcnNcbiAgICAgICAgLy8gIHNlZSBodHRwczovL2dpdGh1Yi5jb20vb3BlbnBlZXIvb3J0Yy9pc3N1ZXMvNTY5XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgbG9jYWxDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGxIZWFkZXJFeHRlbnNpb24pIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlbW90ZUNhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zLmxlbmd0aDtcbiAgICAgICAgIGkrKykge1xuICAgICAgdmFyIHJIZWFkZXJFeHRlbnNpb24gPSByZW1vdGVDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9uc1tpXTtcbiAgICAgIGlmIChsSGVhZGVyRXh0ZW5zaW9uLnVyaSA9PT0gckhlYWRlckV4dGVuc2lvbi51cmkpIHtcbiAgICAgICAgY29tbW9uQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMucHVzaChySGVhZGVyRXh0ZW5zaW9uKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICAvLyBGSVhNRTogZmVjTWVjaGFuaXNtc1xuICByZXR1cm4gY29tbW9uQ2FwYWJpbGl0aWVzO1xufVxuXG4vLyBpcyBhY3Rpb249c2V0TG9jYWxEZXNjcmlwdGlvbiB3aXRoIHR5cGUgYWxsb3dlZCBpbiBzaWduYWxpbmdTdGF0ZVxuZnVuY3Rpb24gaXNBY3Rpb25BbGxvd2VkSW5TaWduYWxpbmdTdGF0ZShhY3Rpb24sIHR5cGUsIHNpZ25hbGluZ1N0YXRlKSB7XG4gIHJldHVybiB7XG4gICAgb2ZmZXI6IHtcbiAgICAgIHNldExvY2FsRGVzY3JpcHRpb246IFsnc3RhYmxlJywgJ2hhdmUtbG9jYWwtb2ZmZXInXSxcbiAgICAgIHNldFJlbW90ZURlc2NyaXB0aW9uOiBbJ3N0YWJsZScsICdoYXZlLXJlbW90ZS1vZmZlciddXG4gICAgfSxcbiAgICBhbnN3ZXI6IHtcbiAgICAgIHNldExvY2FsRGVzY3JpcHRpb246IFsnaGF2ZS1yZW1vdGUtb2ZmZXInLCAnaGF2ZS1sb2NhbC1wcmFuc3dlciddLFxuICAgICAgc2V0UmVtb3RlRGVzY3JpcHRpb246IFsnaGF2ZS1sb2NhbC1vZmZlcicsICdoYXZlLXJlbW90ZS1wcmFuc3dlciddXG4gICAgfVxuICB9W3R5cGVdW2FjdGlvbl0uaW5kZXhPZihzaWduYWxpbmdTdGF0ZSkgIT09IC0xO1xufVxuXG5mdW5jdGlvbiBtYXliZUFkZENhbmRpZGF0ZShpY2VUcmFuc3BvcnQsIGNhbmRpZGF0ZSkge1xuICAvLyBFZGdlJ3MgaW50ZXJuYWwgcmVwcmVzZW50YXRpb24gYWRkcyBzb21lIGZpZWxkcyB0aGVyZWZvcmVcbiAgLy8gbm90IGFsbCBmaWVsZNGVIGFyZSB0YWtlbiBpbnRvIGFjY291bnQuXG4gIHZhciBhbHJlYWR5QWRkZWQgPSBpY2VUcmFuc3BvcnQuZ2V0UmVtb3RlQ2FuZGlkYXRlcygpXG4gICAgICAuZmluZChmdW5jdGlvbihyZW1vdGVDYW5kaWRhdGUpIHtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZS5mb3VuZGF0aW9uID09PSByZW1vdGVDYW5kaWRhdGUuZm91bmRhdGlvbiAmJlxuICAgICAgICAgICAgY2FuZGlkYXRlLmlwID09PSByZW1vdGVDYW5kaWRhdGUuaXAgJiZcbiAgICAgICAgICAgIGNhbmRpZGF0ZS5wb3J0ID09PSByZW1vdGVDYW5kaWRhdGUucG9ydCAmJlxuICAgICAgICAgICAgY2FuZGlkYXRlLnByaW9yaXR5ID09PSByZW1vdGVDYW5kaWRhdGUucHJpb3JpdHkgJiZcbiAgICAgICAgICAgIGNhbmRpZGF0ZS5wcm90b2NvbCA9PT0gcmVtb3RlQ2FuZGlkYXRlLnByb3RvY29sICYmXG4gICAgICAgICAgICBjYW5kaWRhdGUudHlwZSA9PT0gcmVtb3RlQ2FuZGlkYXRlLnR5cGU7XG4gICAgICB9KTtcbiAgaWYgKCFhbHJlYWR5QWRkZWQpIHtcbiAgICBpY2VUcmFuc3BvcnQuYWRkUmVtb3RlQ2FuZGlkYXRlKGNhbmRpZGF0ZSk7XG4gIH1cbiAgcmV0dXJuICFhbHJlYWR5QWRkZWQ7XG59XG5cblxuZnVuY3Rpb24gbWFrZUVycm9yKG5hbWUsIGRlc2NyaXB0aW9uKSB7XG4gIHZhciBlID0gbmV3IEVycm9yKGRlc2NyaXB0aW9uKTtcbiAgZS5uYW1lID0gbmFtZTtcbiAgLy8gbGVnYWN5IGVycm9yIGNvZGVzIGZyb20gaHR0cHM6Ly9oZXljYW0uZ2l0aHViLmlvL3dlYmlkbC8jaWRsLURPTUV4Y2VwdGlvbi1lcnJvci1uYW1lc1xuICBlLmNvZGUgPSB7XG4gICAgTm90U3VwcG9ydGVkRXJyb3I6IDksXG4gICAgSW52YWxpZFN0YXRlRXJyb3I6IDExLFxuICAgIEludmFsaWRBY2Nlc3NFcnJvcjogMTUsXG4gICAgVHlwZUVycm9yOiB1bmRlZmluZWQsXG4gICAgT3BlcmF0aW9uRXJyb3I6IHVuZGVmaW5lZFxuICB9W25hbWVdO1xuICByZXR1cm4gZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih3aW5kb3csIGVkZ2VWZXJzaW9uKSB7XG4gIC8vIGh0dHBzOi8vdzNjLmdpdGh1Yi5pby9tZWRpYWNhcHR1cmUtbWFpbi8jbWVkaWFzdHJlYW1cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGFkZCB0aGUgdHJhY2sgdG8gdGhlIHN0cmVhbSBhbmRcbiAgLy8gZGlzcGF0Y2ggdGhlIGV2ZW50IG91cnNlbHZlcy5cbiAgZnVuY3Rpb24gYWRkVHJhY2tUb1N0cmVhbUFuZEZpcmVFdmVudCh0cmFjaywgc3RyZWFtKSB7XG4gICAgc3RyZWFtLmFkZFRyYWNrKHRyYWNrKTtcbiAgICBzdHJlYW0uZGlzcGF0Y2hFdmVudChuZXcgd2luZG93Lk1lZGlhU3RyZWFtVHJhY2tFdmVudCgnYWRkdHJhY2snLFxuICAgICAgICB7dHJhY2s6IHRyYWNrfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlVHJhY2tGcm9tU3RyZWFtQW5kRmlyZUV2ZW50KHRyYWNrLCBzdHJlYW0pIHtcbiAgICBzdHJlYW0ucmVtb3ZlVHJhY2sodHJhY2spO1xuICAgIHN0cmVhbS5kaXNwYXRjaEV2ZW50KG5ldyB3aW5kb3cuTWVkaWFTdHJlYW1UcmFja0V2ZW50KCdyZW1vdmV0cmFjaycsXG4gICAgICAgIHt0cmFjazogdHJhY2t9KSk7XG4gIH1cblxuICBmdW5jdGlvbiBmaXJlQWRkVHJhY2socGMsIHRyYWNrLCByZWNlaXZlciwgc3RyZWFtcykge1xuICAgIHZhciB0cmFja0V2ZW50ID0gbmV3IEV2ZW50KCd0cmFjaycpO1xuICAgIHRyYWNrRXZlbnQudHJhY2sgPSB0cmFjaztcbiAgICB0cmFja0V2ZW50LnJlY2VpdmVyID0gcmVjZWl2ZXI7XG4gICAgdHJhY2tFdmVudC50cmFuc2NlaXZlciA9IHtyZWNlaXZlcjogcmVjZWl2ZXJ9O1xuICAgIHRyYWNrRXZlbnQuc3RyZWFtcyA9IHN0cmVhbXM7XG4gICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBwYy5fZGlzcGF0Y2hFdmVudCgndHJhY2snLCB0cmFja0V2ZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIHZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBwYyA9IHRoaXM7XG5cbiAgICB2YXIgX2V2ZW50VGFyZ2V0ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIFsnYWRkRXZlbnRMaXN0ZW5lcicsICdyZW1vdmVFdmVudExpc3RlbmVyJywgJ2Rpc3BhdGNoRXZlbnQnXVxuICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICAgICAgICBwY1ttZXRob2RdID0gX2V2ZW50VGFyZ2V0W21ldGhvZF0uYmluZChfZXZlbnRUYXJnZXQpO1xuICAgICAgICB9KTtcblxuICAgIHRoaXMuY2FuVHJpY2tsZUljZUNhbmRpZGF0ZXMgPSBudWxsO1xuXG4gICAgdGhpcy5uZWVkTmVnb3RpYXRpb24gPSBmYWxzZTtcblxuICAgIHRoaXMubG9jYWxTdHJlYW1zID0gW107XG4gICAgdGhpcy5yZW1vdGVTdHJlYW1zID0gW107XG5cbiAgICB0aGlzLl9sb2NhbERlc2NyaXB0aW9uID0gbnVsbDtcbiAgICB0aGlzLl9yZW1vdGVEZXNjcmlwdGlvbiA9IG51bGw7XG5cbiAgICB0aGlzLnNpZ25hbGluZ1N0YXRlID0gJ3N0YWJsZSc7XG4gICAgdGhpcy5pY2VDb25uZWN0aW9uU3RhdGUgPSAnbmV3JztcbiAgICB0aGlzLmNvbm5lY3Rpb25TdGF0ZSA9ICduZXcnO1xuICAgIHRoaXMuaWNlR2F0aGVyaW5nU3RhdGUgPSAnbmV3JztcblxuICAgIGNvbmZpZyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY29uZmlnIHx8IHt9KSk7XG5cbiAgICB0aGlzLnVzaW5nQnVuZGxlID0gY29uZmlnLmJ1bmRsZVBvbGljeSA9PT0gJ21heC1idW5kbGUnO1xuICAgIGlmIChjb25maWcucnRjcE11eFBvbGljeSA9PT0gJ25lZ290aWF0ZScpIHtcbiAgICAgIHRocm93KG1ha2VFcnJvcignTm90U3VwcG9ydGVkRXJyb3InLFxuICAgICAgICAgICdydGNwTXV4UG9saWN5IFxcJ25lZ290aWF0ZVxcJyBpcyBub3Qgc3VwcG9ydGVkJykpO1xuICAgIH0gZWxzZSBpZiAoIWNvbmZpZy5ydGNwTXV4UG9saWN5KSB7XG4gICAgICBjb25maWcucnRjcE11eFBvbGljeSA9ICdyZXF1aXJlJztcbiAgICB9XG5cbiAgICBzd2l0Y2ggKGNvbmZpZy5pY2VUcmFuc3BvcnRQb2xpY3kpIHtcbiAgICAgIGNhc2UgJ2FsbCc6XG4gICAgICBjYXNlICdyZWxheSc6XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uZmlnLmljZVRyYW5zcG9ydFBvbGljeSA9ICdhbGwnO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBzd2l0Y2ggKGNvbmZpZy5idW5kbGVQb2xpY3kpIHtcbiAgICAgIGNhc2UgJ2JhbGFuY2VkJzpcbiAgICAgIGNhc2UgJ21heC1jb21wYXQnOlxuICAgICAgY2FzZSAnbWF4LWJ1bmRsZSc6XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uZmlnLmJ1bmRsZVBvbGljeSA9ICdiYWxhbmNlZCc7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNvbmZpZy5pY2VTZXJ2ZXJzID0gZmlsdGVySWNlU2VydmVycyhjb25maWcuaWNlU2VydmVycyB8fCBbXSwgZWRnZVZlcnNpb24pO1xuXG4gICAgdGhpcy5faWNlR2F0aGVyZXJzID0gW107XG4gICAgaWYgKGNvbmZpZy5pY2VDYW5kaWRhdGVQb29sU2l6ZSkge1xuICAgICAgZm9yICh2YXIgaSA9IGNvbmZpZy5pY2VDYW5kaWRhdGVQb29sU2l6ZTsgaSA+IDA7IGktLSkge1xuICAgICAgICB0aGlzLl9pY2VHYXRoZXJlcnMucHVzaChuZXcgd2luZG93LlJUQ0ljZUdhdGhlcmVyKHtcbiAgICAgICAgICBpY2VTZXJ2ZXJzOiBjb25maWcuaWNlU2VydmVycyxcbiAgICAgICAgICBnYXRoZXJQb2xpY3k6IGNvbmZpZy5pY2VUcmFuc3BvcnRQb2xpY3lcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25maWcuaWNlQ2FuZGlkYXRlUG9vbFNpemUgPSAwO1xuICAgIH1cblxuICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcblxuICAgIC8vIHBlci10cmFjayBpY2VHYXRoZXJzLCBpY2VUcmFuc3BvcnRzLCBkdGxzVHJhbnNwb3J0cywgcnRwU2VuZGVycywgLi4uXG4gICAgLy8gZXZlcnl0aGluZyB0aGF0IGlzIG5lZWRlZCB0byBkZXNjcmliZSBhIFNEUCBtLWxpbmUuXG4gICAgdGhpcy50cmFuc2NlaXZlcnMgPSBbXTtcblxuICAgIHRoaXMuX3NkcFNlc3Npb25JZCA9IFNEUFV0aWxzLmdlbmVyYXRlU2Vzc2lvbklkKCk7XG4gICAgdGhpcy5fc2RwU2Vzc2lvblZlcnNpb24gPSAwO1xuXG4gICAgdGhpcy5fZHRsc1JvbGUgPSB1bmRlZmluZWQ7IC8vIHJvbGUgZm9yIGE9c2V0dXAgdG8gdXNlIGluIGFuc3dlcnMuXG5cbiAgICB0aGlzLl9pc0Nsb3NlZCA9IGZhbHNlO1xuICB9O1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUsICdsb2NhbERlc2NyaXB0aW9uJywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2xvY2FsRGVzY3JpcHRpb247XG4gICAgfVxuICB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSwgJ3JlbW90ZURlc2NyaXB0aW9uJywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3JlbW90ZURlc2NyaXB0aW9uO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gc2V0IHVwIGV2ZW50IGhhbmRsZXJzIG9uIHByb3RvdHlwZVxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub25pY2VjYW5kaWRhdGUgPSBudWxsO1xuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub25hZGRzdHJlYW0gPSBudWxsO1xuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub250cmFjayA9IG51bGw7XG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5vbnJlbW92ZXN0cmVhbSA9IG51bGw7XG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5vbnNpZ25hbGluZ3N0YXRlY2hhbmdlID0gbnVsbDtcbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLm9uaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gbnVsbDtcbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLm9uY29ubmVjdGlvbnN0YXRlY2hhbmdlID0gbnVsbDtcbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLm9uaWNlZ2F0aGVyaW5nc3RhdGVjaGFuZ2UgPSBudWxsO1xuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUub25uZWdvdGlhdGlvbm5lZWRlZCA9IG51bGw7XG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5vbmRhdGFjaGFubmVsID0gbnVsbDtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Rpc3BhdGNoRXZlbnQgPSBmdW5jdGlvbihuYW1lLCBldmVudCkge1xuICAgIGlmICh0aGlzLl9pc0Nsb3NlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIGlmICh0eXBlb2YgdGhpc1snb24nICsgbmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXNbJ29uJyArIG5hbWVdKGV2ZW50KTtcbiAgICB9XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9lbWl0R2F0aGVyaW5nU3RhdGVDaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2ljZWdhdGhlcmluZ3N0YXRlY2hhbmdlJyk7XG4gICAgdGhpcy5fZGlzcGF0Y2hFdmVudCgnaWNlZ2F0aGVyaW5nc3RhdGVjaGFuZ2UnLCBldmVudCk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldENvbmZpZ3VyYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29uZmlnO1xuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRMb2NhbFN0cmVhbXMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhbFN0cmVhbXM7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFJlbW90ZVN0cmVhbXMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yZW1vdGVTdHJlYW1zO1xuICB9O1xuXG4gIC8vIGludGVybmFsIGhlbHBlciB0byBjcmVhdGUgYSB0cmFuc2NlaXZlciBvYmplY3QuXG4gIC8vICh3aGljaCBpcyBub3QgeWV0IHRoZSBzYW1lIGFzIHRoZSBXZWJSVEMgMS4wIHRyYW5zY2VpdmVyKVxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX2NyZWF0ZVRyYW5zY2VpdmVyID0gZnVuY3Rpb24oa2luZCwgZG9Ob3RBZGQpIHtcbiAgICB2YXIgaGFzQnVuZGxlVHJhbnNwb3J0ID0gdGhpcy50cmFuc2NlaXZlcnMubGVuZ3RoID4gMDtcbiAgICB2YXIgdHJhbnNjZWl2ZXIgPSB7XG4gICAgICB0cmFjazogbnVsbCxcbiAgICAgIGljZUdhdGhlcmVyOiBudWxsLFxuICAgICAgaWNlVHJhbnNwb3J0OiBudWxsLFxuICAgICAgZHRsc1RyYW5zcG9ydDogbnVsbCxcbiAgICAgIGxvY2FsQ2FwYWJpbGl0aWVzOiBudWxsLFxuICAgICAgcmVtb3RlQ2FwYWJpbGl0aWVzOiBudWxsLFxuICAgICAgcnRwU2VuZGVyOiBudWxsLFxuICAgICAgcnRwUmVjZWl2ZXI6IG51bGwsXG4gICAgICBraW5kOiBraW5kLFxuICAgICAgbWlkOiBudWxsLFxuICAgICAgc2VuZEVuY29kaW5nUGFyYW1ldGVyczogbnVsbCxcbiAgICAgIHJlY3ZFbmNvZGluZ1BhcmFtZXRlcnM6IG51bGwsXG4gICAgICBzdHJlYW06IG51bGwsXG4gICAgICBhc3NvY2lhdGVkUmVtb3RlTWVkaWFTdHJlYW1zOiBbXSxcbiAgICAgIHdhbnRSZWNlaXZlOiB0cnVlXG4gICAgfTtcbiAgICBpZiAodGhpcy51c2luZ0J1bmRsZSAmJiBoYXNCdW5kbGVUcmFuc3BvcnQpIHtcbiAgICAgIHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCA9IHRoaXMudHJhbnNjZWl2ZXJzWzBdLmljZVRyYW5zcG9ydDtcbiAgICAgIHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQgPSB0aGlzLnRyYW5zY2VpdmVyc1swXS5kdGxzVHJhbnNwb3J0O1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdHJhbnNwb3J0cyA9IHRoaXMuX2NyZWF0ZUljZUFuZER0bHNUcmFuc3BvcnRzKCk7XG4gICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQgPSB0cmFuc3BvcnRzLmljZVRyYW5zcG9ydDtcbiAgICAgIHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQgPSB0cmFuc3BvcnRzLmR0bHNUcmFuc3BvcnQ7XG4gICAgfVxuICAgIGlmICghZG9Ob3RBZGQpIHtcbiAgICAgIHRoaXMudHJhbnNjZWl2ZXJzLnB1c2godHJhbnNjZWl2ZXIpO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNjZWl2ZXI7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrID0gZnVuY3Rpb24odHJhY2ssIHN0cmVhbSkge1xuICAgIGlmICh0aGlzLl9pc0Nsb3NlZCkge1xuICAgICAgdGhyb3cgbWFrZUVycm9yKCdJbnZhbGlkU3RhdGVFcnJvcicsXG4gICAgICAgICAgJ0F0dGVtcHRlZCB0byBjYWxsIGFkZFRyYWNrIG9uIGEgY2xvc2VkIHBlZXJjb25uZWN0aW9uLicpO1xuICAgIH1cblxuICAgIHZhciBhbHJlYWR5RXhpc3RzID0gdGhpcy50cmFuc2NlaXZlcnMuZmluZChmdW5jdGlvbihzKSB7XG4gICAgICByZXR1cm4gcy50cmFjayA9PT0gdHJhY2s7XG4gICAgfSk7XG5cbiAgICBpZiAoYWxyZWFkeUV4aXN0cykge1xuICAgICAgdGhyb3cgbWFrZUVycm9yKCdJbnZhbGlkQWNjZXNzRXJyb3InLCAnVHJhY2sgYWxyZWFkeSBleGlzdHMuJyk7XG4gICAgfVxuXG4gICAgdmFyIHRyYW5zY2VpdmVyO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy50cmFuc2NlaXZlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghdGhpcy50cmFuc2NlaXZlcnNbaV0udHJhY2sgJiZcbiAgICAgICAgICB0aGlzLnRyYW5zY2VpdmVyc1tpXS5raW5kID09PSB0cmFjay5raW5kKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyID0gdGhpcy50cmFuc2NlaXZlcnNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdHJhbnNjZWl2ZXIpIHtcbiAgICAgIHRyYW5zY2VpdmVyID0gdGhpcy5fY3JlYXRlVHJhbnNjZWl2ZXIodHJhY2sua2luZCk7XG4gICAgfVxuXG4gICAgdGhpcy5fbWF5YmVGaXJlTmVnb3RpYXRpb25OZWVkZWQoKTtcblxuICAgIGlmICh0aGlzLmxvY2FsU3RyZWFtcy5pbmRleE9mKHN0cmVhbSkgPT09IC0xKSB7XG4gICAgICB0aGlzLmxvY2FsU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgfVxuXG4gICAgdHJhbnNjZWl2ZXIudHJhY2sgPSB0cmFjaztcbiAgICB0cmFuc2NlaXZlci5zdHJlYW0gPSBzdHJlYW07XG4gICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyID0gbmV3IHdpbmRvdy5SVENSdHBTZW5kZXIodHJhY2ssXG4gICAgICAgIHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQpO1xuICAgIHJldHVybiB0cmFuc2NlaXZlci5ydHBTZW5kZXI7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIHZhciBwYyA9IHRoaXM7XG4gICAgaWYgKGVkZ2VWZXJzaW9uID49IDE1MDI1KSB7XG4gICAgICBzdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbih0cmFjaykge1xuICAgICAgICBwYy5hZGRUcmFjayh0cmFjaywgc3RyZWFtKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDbG9uZSBpcyBuZWNlc3NhcnkgZm9yIGxvY2FsIGRlbW9zIG1vc3RseSwgYXR0YWNoaW5nIGRpcmVjdGx5XG4gICAgICAvLyB0byB0d28gZGlmZmVyZW50IHNlbmRlcnMgZG9lcyBub3Qgd29yayAoYnVpbGQgMTA1NDcpLlxuICAgICAgLy8gRml4ZWQgaW4gMTUwMjUgKG9yIGVhcmxpZXIpXG4gICAgICB2YXIgY2xvbmVkU3RyZWFtID0gc3RyZWFtLmNsb25lKCk7XG4gICAgICBzdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbih0cmFjaywgaWR4KSB7XG4gICAgICAgIHZhciBjbG9uZWRUcmFjayA9IGNsb25lZFN0cmVhbS5nZXRUcmFja3MoKVtpZHhdO1xuICAgICAgICB0cmFjay5hZGRFdmVudExpc3RlbmVyKCdlbmFibGVkJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBjbG9uZWRUcmFjay5lbmFibGVkID0gZXZlbnQuZW5hYmxlZDtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGNsb25lZFN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrKSB7XG4gICAgICAgIHBjLmFkZFRyYWNrKHRyYWNrLCBjbG9uZWRTdHJlYW0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVUcmFjayA9IGZ1bmN0aW9uKHNlbmRlcikge1xuICAgIGlmICh0aGlzLl9pc0Nsb3NlZCkge1xuICAgICAgdGhyb3cgbWFrZUVycm9yKCdJbnZhbGlkU3RhdGVFcnJvcicsXG4gICAgICAgICAgJ0F0dGVtcHRlZCB0byBjYWxsIHJlbW92ZVRyYWNrIG9uIGEgY2xvc2VkIHBlZXJjb25uZWN0aW9uLicpO1xuICAgIH1cblxuICAgIGlmICghKHNlbmRlciBpbnN0YW5jZW9mIHdpbmRvdy5SVENSdHBTZW5kZXIpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCAxIG9mIFJUQ1BlZXJDb25uZWN0aW9uLnJlbW92ZVRyYWNrICcgK1xuICAgICAgICAgICdkb2VzIG5vdCBpbXBsZW1lbnQgaW50ZXJmYWNlIFJUQ1J0cFNlbmRlci4nKTtcbiAgICB9XG5cbiAgICB2YXIgdHJhbnNjZWl2ZXIgPSB0aGlzLnRyYW5zY2VpdmVycy5maW5kKGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiB0LnJ0cFNlbmRlciA9PT0gc2VuZGVyO1xuICAgIH0pO1xuXG4gICAgaWYgKCF0cmFuc2NlaXZlcikge1xuICAgICAgdGhyb3cgbWFrZUVycm9yKCdJbnZhbGlkQWNjZXNzRXJyb3InLFxuICAgICAgICAgICdTZW5kZXIgd2FzIG5vdCBjcmVhdGVkIGJ5IHRoaXMgY29ubmVjdGlvbi4nKTtcbiAgICB9XG4gICAgdmFyIHN0cmVhbSA9IHRyYW5zY2VpdmVyLnN0cmVhbTtcblxuICAgIHRyYW5zY2VpdmVyLnJ0cFNlbmRlci5zdG9wKCk7XG4gICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyID0gbnVsbDtcbiAgICB0cmFuc2NlaXZlci50cmFjayA9IG51bGw7XG4gICAgdHJhbnNjZWl2ZXIuc3RyZWFtID0gbnVsbDtcblxuICAgIC8vIHJlbW92ZSB0aGUgc3RyZWFtIGZyb20gdGhlIHNldCBvZiBsb2NhbCBzdHJlYW1zXG4gICAgdmFyIGxvY2FsU3RyZWFtcyA9IHRoaXMudHJhbnNjZWl2ZXJzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICByZXR1cm4gdC5zdHJlYW07XG4gICAgfSk7XG4gICAgaWYgKGxvY2FsU3RyZWFtcy5pbmRleE9mKHN0cmVhbSkgPT09IC0xICYmXG4gICAgICAgIHRoaXMubG9jYWxTdHJlYW1zLmluZGV4T2Yoc3RyZWFtKSA+IC0xKSB7XG4gICAgICB0aGlzLmxvY2FsU3RyZWFtcy5zcGxpY2UodGhpcy5sb2NhbFN0cmVhbXMuaW5kZXhPZihzdHJlYW0pLCAxKTtcbiAgICB9XG5cbiAgICB0aGlzLl9tYXliZUZpcmVOZWdvdGlhdGlvbk5lZWRlZCgpO1xuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHRyYWNrKSB7XG4gICAgICB2YXIgc2VuZGVyID0gcGMuZ2V0U2VuZGVycygpLmZpbmQoZnVuY3Rpb24ocykge1xuICAgICAgICByZXR1cm4gcy50cmFjayA9PT0gdHJhY2s7XG4gICAgICB9KTtcbiAgICAgIGlmIChzZW5kZXIpIHtcbiAgICAgICAgcGMucmVtb3ZlVHJhY2soc2VuZGVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U2VuZGVycyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRyYW5zY2VpdmVycy5maWx0ZXIoZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIHJldHVybiAhIXRyYW5zY2VpdmVyLnJ0cFNlbmRlcjtcbiAgICB9KVxuICAgIC5tYXAoZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIHJldHVybiB0cmFuc2NlaXZlci5ydHBTZW5kZXI7XG4gICAgfSk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFJlY2VpdmVycyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRyYW5zY2VpdmVycy5maWx0ZXIoZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIHJldHVybiAhIXRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyO1xuICAgIH0pXG4gICAgLm1hcChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgcmV0dXJuIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyO1xuICAgIH0pO1xuICB9O1xuXG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVJY2VHYXRoZXJlciA9IGZ1bmN0aW9uKHNkcE1MaW5lSW5kZXgsXG4gICAgICB1c2luZ0J1bmRsZSkge1xuICAgIHZhciBwYyA9IHRoaXM7XG4gICAgaWYgKHVzaW5nQnVuZGxlICYmIHNkcE1MaW5lSW5kZXggPiAwKSB7XG4gICAgICByZXR1cm4gdGhpcy50cmFuc2NlaXZlcnNbMF0uaWNlR2F0aGVyZXI7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9pY2VHYXRoZXJlcnMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdGhpcy5faWNlR2F0aGVyZXJzLnNoaWZ0KCk7XG4gICAgfVxuICAgIHZhciBpY2VHYXRoZXJlciA9IG5ldyB3aW5kb3cuUlRDSWNlR2F0aGVyZXIoe1xuICAgICAgaWNlU2VydmVyczogdGhpcy5fY29uZmlnLmljZVNlcnZlcnMsXG4gICAgICBnYXRoZXJQb2xpY3k6IHRoaXMuX2NvbmZpZy5pY2VUcmFuc3BvcnRQb2xpY3lcbiAgICB9KTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoaWNlR2F0aGVyZXIsICdzdGF0ZScsXG4gICAgICAgIHt2YWx1ZTogJ25ldycsIHdyaXRhYmxlOiB0cnVlfVxuICAgICk7XG5cbiAgICB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5idWZmZXJlZENhbmRpZGF0ZUV2ZW50cyA9IFtdO1xuICAgIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmJ1ZmZlckNhbmRpZGF0ZXMgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgdmFyIGVuZCA9ICFldmVudC5jYW5kaWRhdGUgfHwgT2JqZWN0LmtleXMoZXZlbnQuY2FuZGlkYXRlKS5sZW5ndGggPT09IDA7XG4gICAgICAvLyBwb2x5ZmlsbCBzaW5jZSBSVENJY2VHYXRoZXJlci5zdGF0ZSBpcyBub3QgaW1wbGVtZW50ZWQgaW5cbiAgICAgIC8vIEVkZ2UgMTA1NDcgeWV0LlxuICAgICAgaWNlR2F0aGVyZXIuc3RhdGUgPSBlbmQgPyAnY29tcGxldGVkJyA6ICdnYXRoZXJpbmcnO1xuICAgICAgaWYgKHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5idWZmZXJlZENhbmRpZGF0ZUV2ZW50cyAhPT0gbnVsbCkge1xuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uYnVmZmVyZWRDYW5kaWRhdGVFdmVudHMucHVzaChldmVudCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBpY2VHYXRoZXJlci5hZGRFdmVudExpc3RlbmVyKCdsb2NhbGNhbmRpZGF0ZScsXG4gICAgICB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5idWZmZXJDYW5kaWRhdGVzKTtcbiAgICByZXR1cm4gaWNlR2F0aGVyZXI7XG4gIH07XG5cbiAgLy8gc3RhcnQgZ2F0aGVyaW5nIGZyb20gYW4gUlRDSWNlR2F0aGVyZXIuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5fZ2F0aGVyID0gZnVuY3Rpb24obWlkLCBzZHBNTGluZUluZGV4KSB7XG4gICAgdmFyIHBjID0gdGhpcztcbiAgICB2YXIgaWNlR2F0aGVyZXIgPSB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5pY2VHYXRoZXJlcjtcbiAgICBpZiAoaWNlR2F0aGVyZXIub25sb2NhbGNhbmRpZGF0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgYnVmZmVyZWRDYW5kaWRhdGVFdmVudHMgPVxuICAgICAgdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uYnVmZmVyZWRDYW5kaWRhdGVFdmVudHM7XG4gICAgdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uYnVmZmVyZWRDYW5kaWRhdGVFdmVudHMgPSBudWxsO1xuICAgIGljZUdhdGhlcmVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvY2FsY2FuZGlkYXRlJyxcbiAgICAgIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmJ1ZmZlckNhbmRpZGF0ZXMpO1xuICAgIGljZUdhdGhlcmVyLm9ubG9jYWxjYW5kaWRhdGUgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgIGlmIChwYy51c2luZ0J1bmRsZSAmJiBzZHBNTGluZUluZGV4ID4gMCkge1xuICAgICAgICAvLyBpZiB3ZSBrbm93IHRoYXQgd2UgdXNlIGJ1bmRsZSB3ZSBjYW4gZHJvcCBjYW5kaWRhdGVzIHdpdGhcbiAgICAgICAgLy8g0ZVkcE1MaW5lSW5kZXggPiAwLiBJZiB3ZSBkb24ndCBkbyB0aGlzIHRoZW4gb3VyIHN0YXRlIGdldHNcbiAgICAgICAgLy8gY29uZnVzZWQgc2luY2Ugd2UgZGlzcG9zZSB0aGUgZXh0cmEgaWNlIGdhdGhlcmVyLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2ljZWNhbmRpZGF0ZScpO1xuICAgICAgZXZlbnQuY2FuZGlkYXRlID0ge3NkcE1pZDogbWlkLCBzZHBNTGluZUluZGV4OiBzZHBNTGluZUluZGV4fTtcblxuICAgICAgdmFyIGNhbmQgPSBldnQuY2FuZGlkYXRlO1xuICAgICAgLy8gRWRnZSBlbWl0cyBhbiBlbXB0eSBvYmplY3QgZm9yIFJUQ0ljZUNhbmRpZGF0ZUNvbXBsZXRl4oClXG4gICAgICB2YXIgZW5kID0gIWNhbmQgfHwgT2JqZWN0LmtleXMoY2FuZCkubGVuZ3RoID09PSAwO1xuICAgICAgaWYgKGVuZCkge1xuICAgICAgICAvLyBwb2x5ZmlsbCBzaW5jZSBSVENJY2VHYXRoZXJlci5zdGF0ZSBpcyBub3QgaW1wbGVtZW50ZWQgaW5cbiAgICAgICAgLy8gRWRnZSAxMDU0NyB5ZXQuXG4gICAgICAgIGlmIChpY2VHYXRoZXJlci5zdGF0ZSA9PT0gJ25ldycgfHwgaWNlR2F0aGVyZXIuc3RhdGUgPT09ICdnYXRoZXJpbmcnKSB7XG4gICAgICAgICAgaWNlR2F0aGVyZXIuc3RhdGUgPSAnY29tcGxldGVkJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGljZUdhdGhlcmVyLnN0YXRlID09PSAnbmV3Jykge1xuICAgICAgICAgIGljZUdhdGhlcmVyLnN0YXRlID0gJ2dhdGhlcmluZyc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUlRDSWNlQ2FuZGlkYXRlIGRvZXNuJ3QgaGF2ZSBhIGNvbXBvbmVudCwgbmVlZHMgdG8gYmUgYWRkZWRcbiAgICAgICAgY2FuZC5jb21wb25lbnQgPSAxO1xuICAgICAgICAvLyBhbHNvIHRoZSB1c2VybmFtZUZyYWdtZW50LiBUT0RPOiB1cGRhdGUgU0RQIHRvIHRha2UgYm90aCB2YXJpYW50cy5cbiAgICAgICAgY2FuZC51ZnJhZyA9IGljZUdhdGhlcmVyLmdldExvY2FsUGFyYW1ldGVycygpLnVzZXJuYW1lRnJhZ21lbnQ7XG5cbiAgICAgICAgdmFyIHNlcmlhbGl6ZWRDYW5kaWRhdGUgPSBTRFBVdGlscy53cml0ZUNhbmRpZGF0ZShjYW5kKTtcbiAgICAgICAgZXZlbnQuY2FuZGlkYXRlID0gT2JqZWN0LmFzc2lnbihldmVudC5jYW5kaWRhdGUsXG4gICAgICAgICAgICBTRFBVdGlscy5wYXJzZUNhbmRpZGF0ZShzZXJpYWxpemVkQ2FuZGlkYXRlKSk7XG5cbiAgICAgICAgZXZlbnQuY2FuZGlkYXRlLmNhbmRpZGF0ZSA9IHNlcmlhbGl6ZWRDYW5kaWRhdGU7XG4gICAgICAgIGV2ZW50LmNhbmRpZGF0ZS50b0pTT04gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2FuZGlkYXRlOiBldmVudC5jYW5kaWRhdGUuY2FuZGlkYXRlLFxuICAgICAgICAgICAgc2RwTWlkOiBldmVudC5jYW5kaWRhdGUuc2RwTWlkLFxuICAgICAgICAgICAgc2RwTUxpbmVJbmRleDogZXZlbnQuY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXgsXG4gICAgICAgICAgICB1c2VybmFtZUZyYWdtZW50OiBldmVudC5jYW5kaWRhdGUudXNlcm5hbWVGcmFnbWVudFxuICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBsb2NhbCBkZXNjcmlwdGlvbi5cbiAgICAgIHZhciBzZWN0aW9ucyA9IFNEUFV0aWxzLmdldE1lZGlhU2VjdGlvbnMocGMuX2xvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgIGlmICghZW5kKSB7XG4gICAgICAgIHNlY3Rpb25zW2V2ZW50LmNhbmRpZGF0ZS5zZHBNTGluZUluZGV4XSArPVxuICAgICAgICAgICAgJ2E9JyArIGV2ZW50LmNhbmRpZGF0ZS5jYW5kaWRhdGUgKyAnXFxyXFxuJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlY3Rpb25zW2V2ZW50LmNhbmRpZGF0ZS5zZHBNTGluZUluZGV4XSArPVxuICAgICAgICAgICAgJ2E9ZW5kLW9mLWNhbmRpZGF0ZXNcXHJcXG4nO1xuICAgICAgfVxuICAgICAgcGMuX2xvY2FsRGVzY3JpcHRpb24uc2RwID1cbiAgICAgICAgICBTRFBVdGlscy5nZXREZXNjcmlwdGlvbihwYy5fbG9jYWxEZXNjcmlwdGlvbi5zZHApICtcbiAgICAgICAgICBzZWN0aW9ucy5qb2luKCcnKTtcbiAgICAgIHZhciBjb21wbGV0ZSA9IHBjLnRyYW5zY2VpdmVycy5ldmVyeShmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgICByZXR1cm4gdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIgJiZcbiAgICAgICAgICAgIHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyLnN0YXRlID09PSAnY29tcGxldGVkJztcbiAgICAgIH0pO1xuXG4gICAgICBpZiAocGMuaWNlR2F0aGVyaW5nU3RhdGUgIT09ICdnYXRoZXJpbmcnKSB7XG4gICAgICAgIHBjLmljZUdhdGhlcmluZ1N0YXRlID0gJ2dhdGhlcmluZyc7XG4gICAgICAgIHBjLl9lbWl0R2F0aGVyaW5nU3RhdGVDaGFuZ2UoKTtcbiAgICAgIH1cblxuICAgICAgLy8gRW1pdCBjYW5kaWRhdGUuIEFsc28gZW1pdCBudWxsIGNhbmRpZGF0ZSB3aGVuIGFsbCBnYXRoZXJlcnMgYXJlXG4gICAgICAvLyBjb21wbGV0ZS5cbiAgICAgIGlmICghZW5kKSB7XG4gICAgICAgIHBjLl9kaXNwYXRjaEV2ZW50KCdpY2VjYW5kaWRhdGUnLCBldmVudCk7XG4gICAgICB9XG4gICAgICBpZiAoY29tcGxldGUpIHtcbiAgICAgICAgcGMuX2Rpc3BhdGNoRXZlbnQoJ2ljZWNhbmRpZGF0ZScsIG5ldyBFdmVudCgnaWNlY2FuZGlkYXRlJykpO1xuICAgICAgICBwYy5pY2VHYXRoZXJpbmdTdGF0ZSA9ICdjb21wbGV0ZSc7XG4gICAgICAgIHBjLl9lbWl0R2F0aGVyaW5nU3RhdGVDaGFuZ2UoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gZW1pdCBhbHJlYWR5IGdhdGhlcmVkIGNhbmRpZGF0ZXMuXG4gICAgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBidWZmZXJlZENhbmRpZGF0ZUV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWNlR2F0aGVyZXIub25sb2NhbGNhbmRpZGF0ZShlKTtcbiAgICAgIH0pO1xuICAgIH0sIDApO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBJQ0UgdHJhbnNwb3J0IGFuZCBEVExTIHRyYW5zcG9ydC5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVJY2VBbmREdGxzVHJhbnNwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYyA9IHRoaXM7XG4gICAgdmFyIGljZVRyYW5zcG9ydCA9IG5ldyB3aW5kb3cuUlRDSWNlVHJhbnNwb3J0KG51bGwpO1xuICAgIGljZVRyYW5zcG9ydC5vbmljZXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICBwYy5fdXBkYXRlSWNlQ29ubmVjdGlvblN0YXRlKCk7XG4gICAgICBwYy5fdXBkYXRlQ29ubmVjdGlvblN0YXRlKCk7XG4gICAgfTtcblxuICAgIHZhciBkdGxzVHJhbnNwb3J0ID0gbmV3IHdpbmRvdy5SVENEdGxzVHJhbnNwb3J0KGljZVRyYW5zcG9ydCk7XG4gICAgZHRsc1RyYW5zcG9ydC5vbmR0bHNzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcGMuX3VwZGF0ZUNvbm5lY3Rpb25TdGF0ZSgpO1xuICAgIH07XG4gICAgZHRsc1RyYW5zcG9ydC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBvbmVycm9yIGRvZXMgbm90IHNldCBzdGF0ZSB0byBmYWlsZWQgYnkgaXRzZWxmLlxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGR0bHNUcmFuc3BvcnQsICdzdGF0ZScsXG4gICAgICAgICAge3ZhbHVlOiAnZmFpbGVkJywgd3JpdGFibGU6IHRydWV9KTtcbiAgICAgIHBjLl91cGRhdGVDb25uZWN0aW9uU3RhdGUoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGljZVRyYW5zcG9ydDogaWNlVHJhbnNwb3J0LFxuICAgICAgZHRsc1RyYW5zcG9ydDogZHRsc1RyYW5zcG9ydFxuICAgIH07XG4gIH07XG5cbiAgLy8gRGVzdHJveSBJQ0UgZ2F0aGVyZXIsIElDRSB0cmFuc3BvcnQgYW5kIERUTFMgdHJhbnNwb3J0LlxuICAvLyBXaXRob3V0IHRyaWdnZXJpbmcgdGhlIGNhbGxiYWNrcy5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl9kaXNwb3NlSWNlQW5kRHRsc1RyYW5zcG9ydHMgPSBmdW5jdGlvbihcbiAgICAgIHNkcE1MaW5lSW5kZXgpIHtcbiAgICB2YXIgaWNlR2F0aGVyZXIgPSB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5pY2VHYXRoZXJlcjtcbiAgICBpZiAoaWNlR2F0aGVyZXIpIHtcbiAgICAgIGRlbGV0ZSBpY2VHYXRoZXJlci5vbmxvY2FsY2FuZGlkYXRlO1xuICAgICAgZGVsZXRlIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmljZUdhdGhlcmVyO1xuICAgIH1cbiAgICB2YXIgaWNlVHJhbnNwb3J0ID0gdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uaWNlVHJhbnNwb3J0O1xuICAgIGlmIChpY2VUcmFuc3BvcnQpIHtcbiAgICAgIGRlbGV0ZSBpY2VUcmFuc3BvcnQub25pY2VzdGF0ZWNoYW5nZTtcbiAgICAgIGRlbGV0ZSB0aGlzLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5pY2VUcmFuc3BvcnQ7XG4gICAgfVxuICAgIHZhciBkdGxzVHJhbnNwb3J0ID0gdGhpcy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uZHRsc1RyYW5zcG9ydDtcbiAgICBpZiAoZHRsc1RyYW5zcG9ydCkge1xuICAgICAgZGVsZXRlIGR0bHNUcmFuc3BvcnQub25kdGxzc3RhdGVjaGFuZ2U7XG4gICAgICBkZWxldGUgZHRsc1RyYW5zcG9ydC5vbmVycm9yO1xuICAgICAgZGVsZXRlIHRoaXMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLmR0bHNUcmFuc3BvcnQ7XG4gICAgfVxuICB9O1xuXG4gIC8vIFN0YXJ0IHRoZSBSVFAgU2VuZGVyIGFuZCBSZWNlaXZlciBmb3IgYSB0cmFuc2NlaXZlci5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl90cmFuc2NlaXZlID0gZnVuY3Rpb24odHJhbnNjZWl2ZXIsXG4gICAgICBzZW5kLCByZWN2KSB7XG4gICAgdmFyIHBhcmFtcyA9IGdldENvbW1vbkNhcGFiaWxpdGllcyh0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcyxcbiAgICAgICAgdHJhbnNjZWl2ZXIucmVtb3RlQ2FwYWJpbGl0aWVzKTtcbiAgICBpZiAoc2VuZCAmJiB0cmFuc2NlaXZlci5ydHBTZW5kZXIpIHtcbiAgICAgIHBhcmFtcy5lbmNvZGluZ3MgPSB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgICAgcGFyYW1zLnJ0Y3AgPSB7XG4gICAgICAgIGNuYW1lOiBTRFBVdGlscy5sb2NhbENOYW1lLFxuICAgICAgICBjb21wb3VuZDogdHJhbnNjZWl2ZXIucnRjcFBhcmFtZXRlcnMuY29tcG91bmRcbiAgICAgIH07XG4gICAgICBpZiAodHJhbnNjZWl2ZXIucmVjdkVuY29kaW5nUGFyYW1ldGVycy5sZW5ndGgpIHtcbiAgICAgICAgcGFyYW1zLnJ0Y3Auc3NyYyA9IHRyYW5zY2VpdmVyLnJlY3ZFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYztcbiAgICAgIH1cbiAgICAgIHRyYW5zY2VpdmVyLnJ0cFNlbmRlci5zZW5kKHBhcmFtcyk7XG4gICAgfVxuICAgIGlmIChyZWN2ICYmIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyICYmIHBhcmFtcy5jb2RlY3MubGVuZ3RoID4gMCkge1xuICAgICAgLy8gcmVtb3ZlIFJUWCBmaWVsZCBpbiBFZGdlIDE0OTQyXG4gICAgICBpZiAodHJhbnNjZWl2ZXIua2luZCA9PT0gJ3ZpZGVvJ1xuICAgICAgICAgICYmIHRyYW5zY2VpdmVyLnJlY3ZFbmNvZGluZ1BhcmFtZXRlcnNcbiAgICAgICAgICAmJiBlZGdlVmVyc2lvbiA8IDE1MDE5KSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJlY3ZFbmNvZGluZ1BhcmFtZXRlcnMuZm9yRWFjaChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgZGVsZXRlIHAucnR4O1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmICh0cmFuc2NlaXZlci5yZWN2RW5jb2RpbmdQYXJhbWV0ZXJzLmxlbmd0aCkge1xuICAgICAgICBwYXJhbXMuZW5jb2RpbmdzID0gdHJhbnNjZWl2ZXIucmVjdkVuY29kaW5nUGFyYW1ldGVycztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcmFtcy5lbmNvZGluZ3MgPSBbe31dO1xuICAgICAgfVxuICAgICAgcGFyYW1zLnJ0Y3AgPSB7XG4gICAgICAgIGNvbXBvdW5kOiB0cmFuc2NlaXZlci5ydGNwUGFyYW1ldGVycy5jb21wb3VuZFxuICAgICAgfTtcbiAgICAgIGlmICh0cmFuc2NlaXZlci5ydGNwUGFyYW1ldGVycy5jbmFtZSkge1xuICAgICAgICBwYXJhbXMucnRjcC5jbmFtZSA9IHRyYW5zY2VpdmVyLnJ0Y3BQYXJhbWV0ZXJzLmNuYW1lO1xuICAgICAgfVxuICAgICAgaWYgKHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnMubGVuZ3RoKSB7XG4gICAgICAgIHBhcmFtcy5ydGNwLnNzcmMgPSB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnNzcmM7XG4gICAgICB9XG4gICAgICB0cmFuc2NlaXZlci5ydHBSZWNlaXZlci5yZWNlaXZlKHBhcmFtcyk7XG4gICAgfVxuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRMb2NhbERlc2NyaXB0aW9uID0gZnVuY3Rpb24oZGVzY3JpcHRpb24pIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuXG4gICAgLy8gTm90ZTogcHJhbnN3ZXIgaXMgbm90IHN1cHBvcnRlZC5cbiAgICBpZiAoWydvZmZlcicsICdhbnN3ZXInXS5pbmRleE9mKGRlc2NyaXB0aW9uLnR5cGUpID09PSAtMSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG1ha2VFcnJvcignVHlwZUVycm9yJyxcbiAgICAgICAgICAnVW5zdXBwb3J0ZWQgdHlwZSBcIicgKyBkZXNjcmlwdGlvbi50eXBlICsgJ1wiJykpO1xuICAgIH1cblxuICAgIGlmICghaXNBY3Rpb25BbGxvd2VkSW5TaWduYWxpbmdTdGF0ZSgnc2V0TG9jYWxEZXNjcmlwdGlvbicsXG4gICAgICAgIGRlc2NyaXB0aW9uLnR5cGUsIHBjLnNpZ25hbGluZ1N0YXRlKSB8fCBwYy5faXNDbG9zZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChtYWtlRXJyb3IoJ0ludmFsaWRTdGF0ZUVycm9yJyxcbiAgICAgICAgICAnQ2FuIG5vdCBzZXQgbG9jYWwgJyArIGRlc2NyaXB0aW9uLnR5cGUgK1xuICAgICAgICAgICcgaW4gc3RhdGUgJyArIHBjLnNpZ25hbGluZ1N0YXRlKSk7XG4gICAgfVxuXG4gICAgdmFyIHNlY3Rpb25zO1xuICAgIHZhciBzZXNzaW9ucGFydDtcbiAgICBpZiAoZGVzY3JpcHRpb24udHlwZSA9PT0gJ29mZmVyJykge1xuICAgICAgLy8gVkVSWSBsaW1pdGVkIHN1cHBvcnQgZm9yIFNEUCBtdW5naW5nLiBMaW1pdGVkIHRvOlxuICAgICAgLy8gKiBjaGFuZ2luZyB0aGUgb3JkZXIgb2YgY29kZWNzXG4gICAgICBzZWN0aW9ucyA9IFNEUFV0aWxzLnNwbGl0U2VjdGlvbnMoZGVzY3JpcHRpb24uc2RwKTtcbiAgICAgIHNlc3Npb25wYXJ0ID0gc2VjdGlvbnMuc2hpZnQoKTtcbiAgICAgIHNlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24obWVkaWFTZWN0aW9uLCBzZHBNTGluZUluZGV4KSB7XG4gICAgICAgIHZhciBjYXBzID0gU0RQVXRpbHMucGFyc2VSdHBQYXJhbWV0ZXJzKG1lZGlhU2VjdGlvbik7XG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5sb2NhbENhcGFiaWxpdGllcyA9IGNhcHM7XG4gICAgICB9KTtcblxuICAgICAgcGMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIsIHNkcE1MaW5lSW5kZXgpIHtcbiAgICAgICAgcGMuX2dhdGhlcih0cmFuc2NlaXZlci5taWQsIHNkcE1MaW5lSW5kZXgpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChkZXNjcmlwdGlvbi50eXBlID09PSAnYW5zd2VyJykge1xuICAgICAgc2VjdGlvbnMgPSBTRFBVdGlscy5zcGxpdFNlY3Rpb25zKHBjLl9yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgc2Vzc2lvbnBhcnQgPSBzZWN0aW9ucy5zaGlmdCgpO1xuICAgICAgdmFyIGlzSWNlTGl0ZSA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KHNlc3Npb25wYXJ0LFxuICAgICAgICAgICdhPWljZS1saXRlJykubGVuZ3RoID4gMDtcbiAgICAgIHNlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24obWVkaWFTZWN0aW9uLCBzZHBNTGluZUluZGV4KSB7XG4gICAgICAgIHZhciB0cmFuc2NlaXZlciA9IHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XTtcbiAgICAgICAgdmFyIGljZUdhdGhlcmVyID0gdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXI7XG4gICAgICAgIHZhciBpY2VUcmFuc3BvcnQgPSB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQ7XG4gICAgICAgIHZhciBkdGxzVHJhbnNwb3J0ID0gdHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydDtcbiAgICAgICAgdmFyIGxvY2FsQ2FwYWJpbGl0aWVzID0gdHJhbnNjZWl2ZXIubG9jYWxDYXBhYmlsaXRpZXM7XG4gICAgICAgIHZhciByZW1vdGVDYXBhYmlsaXRpZXMgPSB0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXM7XG5cbiAgICAgICAgLy8gdHJlYXQgYnVuZGxlLW9ubHkgYXMgbm90LXJlamVjdGVkLlxuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBTRFBVdGlscy5pc1JlamVjdGVkKG1lZGlhU2VjdGlvbikgJiZcbiAgICAgICAgICAgIFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9YnVuZGxlLW9ubHknKS5sZW5ndGggPT09IDA7XG5cbiAgICAgICAgaWYgKCFyZWplY3RlZCAmJiAhdHJhbnNjZWl2ZXIucmVqZWN0ZWQpIHtcbiAgICAgICAgICB2YXIgcmVtb3RlSWNlUGFyYW1ldGVycyA9IFNEUFV0aWxzLmdldEljZVBhcmFtZXRlcnMoXG4gICAgICAgICAgICAgIG1lZGlhU2VjdGlvbiwgc2Vzc2lvbnBhcnQpO1xuICAgICAgICAgIHZhciByZW1vdGVEdGxzUGFyYW1ldGVycyA9IFNEUFV0aWxzLmdldER0bHNQYXJhbWV0ZXJzKFxuICAgICAgICAgICAgICBtZWRpYVNlY3Rpb24sIHNlc3Npb25wYXJ0KTtcbiAgICAgICAgICBpZiAoaXNJY2VMaXRlKSB7XG4gICAgICAgICAgICByZW1vdGVEdGxzUGFyYW1ldGVycy5yb2xlID0gJ3NlcnZlcic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFwYy51c2luZ0J1bmRsZSB8fCBzZHBNTGluZUluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICBwYy5fZ2F0aGVyKHRyYW5zY2VpdmVyLm1pZCwgc2RwTUxpbmVJbmRleCk7XG4gICAgICAgICAgICBpZiAoaWNlVHJhbnNwb3J0LnN0YXRlID09PSAnbmV3Jykge1xuICAgICAgICAgICAgICBpY2VUcmFuc3BvcnQuc3RhcnQoaWNlR2F0aGVyZXIsIHJlbW90ZUljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgICBpc0ljZUxpdGUgPyAnY29udHJvbGxpbmcnIDogJ2NvbnRyb2xsZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkdGxzVHJhbnNwb3J0LnN0YXRlID09PSAnbmV3Jykge1xuICAgICAgICAgICAgICBkdGxzVHJhbnNwb3J0LnN0YXJ0KHJlbW90ZUR0bHNQYXJhbWV0ZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBDYWxjdWxhdGUgaW50ZXJzZWN0aW9uIG9mIGNhcGFiaWxpdGllcy5cbiAgICAgICAgICB2YXIgcGFyYW1zID0gZ2V0Q29tbW9uQ2FwYWJpbGl0aWVzKGxvY2FsQ2FwYWJpbGl0aWVzLFxuICAgICAgICAgICAgICByZW1vdGVDYXBhYmlsaXRpZXMpO1xuXG4gICAgICAgICAgLy8gU3RhcnQgdGhlIFJUQ1J0cFNlbmRlci4gVGhlIFJUQ1J0cFJlY2VpdmVyIGZvciB0aGlzXG4gICAgICAgICAgLy8gdHJhbnNjZWl2ZXIgaGFzIGFscmVhZHkgYmVlbiBzdGFydGVkIGluIHNldFJlbW90ZURlc2NyaXB0aW9uLlxuICAgICAgICAgIHBjLl90cmFuc2NlaXZlKHRyYW5zY2VpdmVyLFxuICAgICAgICAgICAgICBwYXJhbXMuY29kZWNzLmxlbmd0aCA+IDAsXG4gICAgICAgICAgICAgIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcGMuX2xvY2FsRGVzY3JpcHRpb24gPSB7XG4gICAgICB0eXBlOiBkZXNjcmlwdGlvbi50eXBlLFxuICAgICAgc2RwOiBkZXNjcmlwdGlvbi5zZHBcbiAgICB9O1xuICAgIGlmIChkZXNjcmlwdGlvbi50eXBlID09PSAnb2ZmZXInKSB7XG4gICAgICBwYy5fdXBkYXRlU2lnbmFsaW5nU3RhdGUoJ2hhdmUtbG9jYWwtb2ZmZXInKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGMuX3VwZGF0ZVNpZ25hbGluZ1N0YXRlKCdzdGFibGUnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uID0gZnVuY3Rpb24oZGVzY3JpcHRpb24pIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuXG4gICAgLy8gTm90ZTogcHJhbnN3ZXIgaXMgbm90IHN1cHBvcnRlZC5cbiAgICBpZiAoWydvZmZlcicsICdhbnN3ZXInXS5pbmRleE9mKGRlc2NyaXB0aW9uLnR5cGUpID09PSAtMSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG1ha2VFcnJvcignVHlwZUVycm9yJyxcbiAgICAgICAgICAnVW5zdXBwb3J0ZWQgdHlwZSBcIicgKyBkZXNjcmlwdGlvbi50eXBlICsgJ1wiJykpO1xuICAgIH1cblxuICAgIGlmICghaXNBY3Rpb25BbGxvd2VkSW5TaWduYWxpbmdTdGF0ZSgnc2V0UmVtb3RlRGVzY3JpcHRpb24nLFxuICAgICAgICBkZXNjcmlwdGlvbi50eXBlLCBwYy5zaWduYWxpbmdTdGF0ZSkgfHwgcGMuX2lzQ2xvc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobWFrZUVycm9yKCdJbnZhbGlkU3RhdGVFcnJvcicsXG4gICAgICAgICAgJ0NhbiBub3Qgc2V0IHJlbW90ZSAnICsgZGVzY3JpcHRpb24udHlwZSArXG4gICAgICAgICAgJyBpbiBzdGF0ZSAnICsgcGMuc2lnbmFsaW5nU3RhdGUpKTtcbiAgICB9XG5cbiAgICB2YXIgc3RyZWFtcyA9IHt9O1xuICAgIHBjLnJlbW90ZVN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHN0cmVhbXNbc3RyZWFtLmlkXSA9IHN0cmVhbTtcbiAgICB9KTtcbiAgICB2YXIgcmVjZWl2ZXJMaXN0ID0gW107XG4gICAgdmFyIHNlY3Rpb25zID0gU0RQVXRpbHMuc3BsaXRTZWN0aW9ucyhkZXNjcmlwdGlvbi5zZHApO1xuICAgIHZhciBzZXNzaW9ucGFydCA9IHNlY3Rpb25zLnNoaWZ0KCk7XG4gICAgdmFyIGlzSWNlTGl0ZSA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KHNlc3Npb25wYXJ0LFxuICAgICAgICAnYT1pY2UtbGl0ZScpLmxlbmd0aCA+IDA7XG4gICAgdmFyIHVzaW5nQnVuZGxlID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgoc2Vzc2lvbnBhcnQsXG4gICAgICAgICdhPWdyb3VwOkJVTkRMRSAnKS5sZW5ndGggPiAwO1xuICAgIHBjLnVzaW5nQnVuZGxlID0gdXNpbmdCdW5kbGU7XG4gICAgdmFyIGljZU9wdGlvbnMgPSBTRFBVdGlscy5tYXRjaFByZWZpeChzZXNzaW9ucGFydCxcbiAgICAgICAgJ2E9aWNlLW9wdGlvbnM6JylbMF07XG4gICAgaWYgKGljZU9wdGlvbnMpIHtcbiAgICAgIHBjLmNhblRyaWNrbGVJY2VDYW5kaWRhdGVzID0gaWNlT3B0aW9ucy5zdWJzdHIoMTQpLnNwbGl0KCcgJylcbiAgICAgICAgICAuaW5kZXhPZigndHJpY2tsZScpID49IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBjLmNhblRyaWNrbGVJY2VDYW5kaWRhdGVzID0gZmFsc2U7XG4gICAgfVxuXG4gICAgc2VjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihtZWRpYVNlY3Rpb24sIHNkcE1MaW5lSW5kZXgpIHtcbiAgICAgIHZhciBsaW5lcyA9IFNEUFV0aWxzLnNwbGl0TGluZXMobWVkaWFTZWN0aW9uKTtcbiAgICAgIHZhciBraW5kID0gU0RQVXRpbHMuZ2V0S2luZChtZWRpYVNlY3Rpb24pO1xuICAgICAgLy8gdHJlYXQgYnVuZGxlLW9ubHkgYXMgbm90LXJlamVjdGVkLlxuICAgICAgdmFyIHJlamVjdGVkID0gU0RQVXRpbHMuaXNSZWplY3RlZChtZWRpYVNlY3Rpb24pICYmXG4gICAgICAgICAgU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1idW5kbGUtb25seScpLmxlbmd0aCA9PT0gMDtcbiAgICAgIHZhciBwcm90b2NvbCA9IGxpbmVzWzBdLnN1YnN0cigyKS5zcGxpdCgnICcpWzJdO1xuXG4gICAgICB2YXIgZGlyZWN0aW9uID0gU0RQVXRpbHMuZ2V0RGlyZWN0aW9uKG1lZGlhU2VjdGlvbiwgc2Vzc2lvbnBhcnQpO1xuICAgICAgdmFyIHJlbW90ZU1zaWQgPSBTRFBVdGlscy5wYXJzZU1zaWQobWVkaWFTZWN0aW9uKTtcblxuICAgICAgdmFyIG1pZCA9IFNEUFV0aWxzLmdldE1pZChtZWRpYVNlY3Rpb24pIHx8IFNEUFV0aWxzLmdlbmVyYXRlSWRlbnRpZmllcigpO1xuXG4gICAgICAvLyBSZWplY3QgZGF0YWNoYW5uZWxzIHdoaWNoIGFyZSBub3QgaW1wbGVtZW50ZWQgeWV0LlxuICAgICAgaWYgKHJlamVjdGVkIHx8IChraW5kID09PSAnYXBwbGljYXRpb24nICYmIChwcm90b2NvbCA9PT0gJ0RUTFMvU0NUUCcgfHxcbiAgICAgICAgICBwcm90b2NvbCA9PT0gJ1VEUC9EVExTL1NDVFAnKSkpIHtcbiAgICAgICAgLy8gVE9ETzogdGhpcyBpcyBkYW5nZXJvdXMgaW4gdGhlIGNhc2Ugd2hlcmUgYSBub24tcmVqZWN0ZWQgbS1saW5lXG4gICAgICAgIC8vICAgICBiZWNvbWVzIHJlamVjdGVkLlxuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0gPSB7XG4gICAgICAgICAgbWlkOiBtaWQsXG4gICAgICAgICAga2luZDoga2luZCxcbiAgICAgICAgICBwcm90b2NvbDogcHJvdG9jb2wsXG4gICAgICAgICAgcmVqZWN0ZWQ6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXJlamVjdGVkICYmIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XSAmJlxuICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5yZWplY3RlZCkge1xuICAgICAgICAvLyByZWN5Y2xlIGEgcmVqZWN0ZWQgdHJhbnNjZWl2ZXIuXG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XSA9IHBjLl9jcmVhdGVUcmFuc2NlaXZlcihraW5kLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHRyYW5zY2VpdmVyO1xuICAgICAgdmFyIGljZUdhdGhlcmVyO1xuICAgICAgdmFyIGljZVRyYW5zcG9ydDtcbiAgICAgIHZhciBkdGxzVHJhbnNwb3J0O1xuICAgICAgdmFyIHJ0cFJlY2VpdmVyO1xuICAgICAgdmFyIHNlbmRFbmNvZGluZ1BhcmFtZXRlcnM7XG4gICAgICB2YXIgcmVjdkVuY29kaW5nUGFyYW1ldGVycztcbiAgICAgIHZhciBsb2NhbENhcGFiaWxpdGllcztcblxuICAgICAgdmFyIHRyYWNrO1xuICAgICAgLy8gRklYTUU6IGVuc3VyZSB0aGUgbWVkaWFTZWN0aW9uIGhhcyBydGNwLW11eCBzZXQuXG4gICAgICB2YXIgcmVtb3RlQ2FwYWJpbGl0aWVzID0gU0RQVXRpbHMucGFyc2VSdHBQYXJhbWV0ZXJzKG1lZGlhU2VjdGlvbik7XG4gICAgICB2YXIgcmVtb3RlSWNlUGFyYW1ldGVycztcbiAgICAgIHZhciByZW1vdGVEdGxzUGFyYW1ldGVycztcbiAgICAgIGlmICghcmVqZWN0ZWQpIHtcbiAgICAgICAgcmVtb3RlSWNlUGFyYW1ldGVycyA9IFNEUFV0aWxzLmdldEljZVBhcmFtZXRlcnMobWVkaWFTZWN0aW9uLFxuICAgICAgICAgICAgc2Vzc2lvbnBhcnQpO1xuICAgICAgICByZW1vdGVEdGxzUGFyYW1ldGVycyA9IFNEUFV0aWxzLmdldER0bHNQYXJhbWV0ZXJzKG1lZGlhU2VjdGlvbixcbiAgICAgICAgICAgIHNlc3Npb25wYXJ0KTtcbiAgICAgICAgcmVtb3RlRHRsc1BhcmFtZXRlcnMucm9sZSA9ICdjbGllbnQnO1xuICAgICAgfVxuICAgICAgcmVjdkVuY29kaW5nUGFyYW1ldGVycyA9XG4gICAgICAgICAgU0RQVXRpbHMucGFyc2VSdHBFbmNvZGluZ1BhcmFtZXRlcnMobWVkaWFTZWN0aW9uKTtcblxuICAgICAgdmFyIHJ0Y3BQYXJhbWV0ZXJzID0gU0RQVXRpbHMucGFyc2VSdGNwUGFyYW1ldGVycyhtZWRpYVNlY3Rpb24pO1xuXG4gICAgICB2YXIgaXNDb21wbGV0ZSA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbixcbiAgICAgICAgICAnYT1lbmQtb2YtY2FuZGlkYXRlcycsIHNlc3Npb25wYXJ0KS5sZW5ndGggPiAwO1xuICAgICAgdmFyIGNhbmRzID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1jYW5kaWRhdGU6JylcbiAgICAgICAgICAubWFwKGZ1bmN0aW9uKGNhbmQpIHtcbiAgICAgICAgICAgIHJldHVybiBTRFBVdGlscy5wYXJzZUNhbmRpZGF0ZShjYW5kKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oY2FuZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbmQuY29tcG9uZW50ID09PSAxO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAvLyBDaGVjayBpZiB3ZSBjYW4gdXNlIEJVTkRMRSBhbmQgZGlzcG9zZSB0cmFuc3BvcnRzLlxuICAgICAgaWYgKChkZXNjcmlwdGlvbi50eXBlID09PSAnb2ZmZXInIHx8IGRlc2NyaXB0aW9uLnR5cGUgPT09ICdhbnN3ZXInKSAmJlxuICAgICAgICAgICFyZWplY3RlZCAmJiB1c2luZ0J1bmRsZSAmJiBzZHBNTGluZUluZGV4ID4gMCAmJlxuICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XSkge1xuICAgICAgICBwYy5fZGlzcG9zZUljZUFuZER0bHNUcmFuc3BvcnRzKHNkcE1MaW5lSW5kZXgpO1xuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uaWNlR2F0aGVyZXIgPVxuICAgICAgICAgICAgcGMudHJhbnNjZWl2ZXJzWzBdLmljZUdhdGhlcmVyO1xuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0uaWNlVHJhbnNwb3J0ID1cbiAgICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1swXS5pY2VUcmFuc3BvcnQ7XG4gICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5kdGxzVHJhbnNwb3J0ID1cbiAgICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1swXS5kdGxzVHJhbnNwb3J0O1xuICAgICAgICBpZiAocGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLnJ0cFNlbmRlcikge1xuICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5ydHBTZW5kZXIuc2V0VHJhbnNwb3J0KFxuICAgICAgICAgICAgICBwYy50cmFuc2NlaXZlcnNbMF0uZHRsc1RyYW5zcG9ydCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5ydHBSZWNlaXZlcikge1xuICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XS5ydHBSZWNlaXZlci5zZXRUcmFuc3BvcnQoXG4gICAgICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1swXS5kdGxzVHJhbnNwb3J0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGRlc2NyaXB0aW9uLnR5cGUgPT09ICdvZmZlcicgJiYgIXJlamVjdGVkKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyID0gcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdIHx8XG4gICAgICAgICAgICBwYy5fY3JlYXRlVHJhbnNjZWl2ZXIoa2luZCk7XG4gICAgICAgIHRyYW5zY2VpdmVyLm1pZCA9IG1pZDtcblxuICAgICAgICBpZiAoIXRyYW5zY2VpdmVyLmljZUdhdGhlcmVyKSB7XG4gICAgICAgICAgdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIgPSBwYy5fY3JlYXRlSWNlR2F0aGVyZXIoc2RwTUxpbmVJbmRleCxcbiAgICAgICAgICAgICAgdXNpbmdCdW5kbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbmRzLmxlbmd0aCAmJiB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuc3RhdGUgPT09ICduZXcnKSB7XG4gICAgICAgICAgaWYgKGlzQ29tcGxldGUgJiYgKCF1c2luZ0J1bmRsZSB8fCBzZHBNTGluZUluZGV4ID09PSAwKSkge1xuICAgICAgICAgICAgdHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0LnNldFJlbW90ZUNhbmRpZGF0ZXMoY2FuZHMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYW5kcy5mb3JFYWNoKGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICBtYXliZUFkZENhbmRpZGF0ZSh0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQsIGNhbmRpZGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsb2NhbENhcGFiaWxpdGllcyA9IHdpbmRvdy5SVENSdHBSZWNlaXZlci5nZXRDYXBhYmlsaXRpZXMoa2luZCk7XG5cbiAgICAgICAgLy8gZmlsdGVyIFJUWCB1bnRpbCBhZGRpdGlvbmFsIHN0dWZmIG5lZWRlZCBmb3IgUlRYIGlzIGltcGxlbWVudGVkXG4gICAgICAgIC8vIGluIGFkYXB0ZXIuanNcbiAgICAgICAgaWYgKGVkZ2VWZXJzaW9uIDwgMTUwMTkpIHtcbiAgICAgICAgICBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MgPSBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MuZmlsdGVyKFxuICAgICAgICAgICAgICBmdW5jdGlvbihjb2RlYykge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb2RlYy5uYW1lICE9PSAncnR4JztcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzID0gdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVycyB8fCBbe1xuICAgICAgICAgIHNzcmM6ICgyICogc2RwTUxpbmVJbmRleCArIDIpICogMTAwMVxuICAgICAgICB9XTtcblxuICAgICAgICAvLyBUT0RPOiByZXdyaXRlIHRvIHVzZSBodHRwOi8vdzNjLmdpdGh1Yi5pby93ZWJydGMtcGMvI3NldC1hc3NvY2lhdGVkLXJlbW90ZS1zdHJlYW1zXG4gICAgICAgIHZhciBpc05ld1RyYWNrID0gZmFsc2U7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICdzZW5kcmVjdicgfHwgZGlyZWN0aW9uID09PSAnc2VuZG9ubHknKSB7XG4gICAgICAgICAgaXNOZXdUcmFjayA9ICF0cmFuc2NlaXZlci5ydHBSZWNlaXZlcjtcbiAgICAgICAgICBydHBSZWNlaXZlciA9IHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyIHx8XG4gICAgICAgICAgICAgIG5ldyB3aW5kb3cuUlRDUnRwUmVjZWl2ZXIodHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydCwga2luZCk7XG5cbiAgICAgICAgICBpZiAoaXNOZXdUcmFjaykge1xuICAgICAgICAgICAgdmFyIHN0cmVhbTtcbiAgICAgICAgICAgIHRyYWNrID0gcnRwUmVjZWl2ZXIudHJhY2s7XG4gICAgICAgICAgICAvLyBGSVhNRTogZG9lcyBub3Qgd29yayB3aXRoIFBsYW4gQi5cbiAgICAgICAgICAgIGlmIChyZW1vdGVNc2lkICYmIHJlbW90ZU1zaWQuc3RyZWFtID09PSAnLScpIHtcbiAgICAgICAgICAgICAgLy8gbm8tb3AuIGEgc3RyZWFtIGlkIG9mICctJyBtZWFuczogbm8gYXNzb2NpYXRlZCBzdHJlYW0uXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlbW90ZU1zaWQpIHtcbiAgICAgICAgICAgICAgaWYgKCFzdHJlYW1zW3JlbW90ZU1zaWQuc3RyZWFtXSkge1xuICAgICAgICAgICAgICAgIHN0cmVhbXNbcmVtb3RlTXNpZC5zdHJlYW1dID0gbmV3IHdpbmRvdy5NZWRpYVN0cmVhbSgpO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzdHJlYW1zW3JlbW90ZU1zaWQuc3RyZWFtXSwgJ2lkJywge1xuICAgICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlbW90ZU1zaWQuc3RyZWFtO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0cmFjaywgJ2lkJywge1xuICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gcmVtb3RlTXNpZC50cmFjaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBzdHJlYW0gPSBzdHJlYW1zW3JlbW90ZU1zaWQuc3RyZWFtXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmICghc3RyZWFtcy5kZWZhdWx0KSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtcy5kZWZhdWx0ID0gbmV3IHdpbmRvdy5NZWRpYVN0cmVhbSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHN0cmVhbSA9IHN0cmVhbXMuZGVmYXVsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdHJlYW0pIHtcbiAgICAgICAgICAgICAgYWRkVHJhY2tUb1N0cmVhbUFuZEZpcmVFdmVudCh0cmFjaywgc3RyZWFtKTtcbiAgICAgICAgICAgICAgdHJhbnNjZWl2ZXIuYXNzb2NpYXRlZFJlbW90ZU1lZGlhU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWNlaXZlckxpc3QucHVzaChbdHJhY2ssIHJ0cFJlY2VpdmVyLCBzdHJlYW1dKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIgJiYgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIudHJhY2spIHtcbiAgICAgICAgICB0cmFuc2NlaXZlci5hc3NvY2lhdGVkUmVtb3RlTWVkaWFTdHJlYW1zLmZvckVhY2goZnVuY3Rpb24ocykge1xuICAgICAgICAgICAgdmFyIG5hdGl2ZVRyYWNrID0gcy5nZXRUcmFja3MoKS5maW5kKGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHQuaWQgPT09IHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyLnRyYWNrLmlkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAobmF0aXZlVHJhY2spIHtcbiAgICAgICAgICAgICAgcmVtb3ZlVHJhY2tGcm9tU3RyZWFtQW5kRmlyZUV2ZW50KG5hdGl2ZVRyYWNrLCBzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0cmFuc2NlaXZlci5hc3NvY2lhdGVkUmVtb3RlTWVkaWFTdHJlYW1zID0gW107XG4gICAgICAgIH1cblxuICAgICAgICB0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcyA9IGxvY2FsQ2FwYWJpbGl0aWVzO1xuICAgICAgICB0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXMgPSByZW1vdGVDYXBhYmlsaXRpZXM7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyID0gcnRwUmVjZWl2ZXI7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJ0Y3BQYXJhbWV0ZXJzID0gcnRjcFBhcmFtZXRlcnM7XG4gICAgICAgIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnMgPSBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgICAgICB0cmFuc2NlaXZlci5yZWN2RW5jb2RpbmdQYXJhbWV0ZXJzID0gcmVjdkVuY29kaW5nUGFyYW1ldGVycztcblxuICAgICAgICAvLyBTdGFydCB0aGUgUlRDUnRwUmVjZWl2ZXIgbm93LiBUaGUgUlRQU2VuZGVyIGlzIHN0YXJ0ZWQgaW5cbiAgICAgICAgLy8gc2V0TG9jYWxEZXNjcmlwdGlvbi5cbiAgICAgICAgcGMuX3RyYW5zY2VpdmUocGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLFxuICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICBpc05ld1RyYWNrKTtcbiAgICAgIH0gZWxzZSBpZiAoZGVzY3JpcHRpb24udHlwZSA9PT0gJ2Fuc3dlcicgJiYgIXJlamVjdGVkKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyID0gcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdO1xuICAgICAgICBpY2VHYXRoZXJlciA9IHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyO1xuICAgICAgICBpY2VUcmFuc3BvcnQgPSB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQ7XG4gICAgICAgIGR0bHNUcmFuc3BvcnQgPSB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0O1xuICAgICAgICBydHBSZWNlaXZlciA9IHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyO1xuICAgICAgICBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzID0gdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVycztcbiAgICAgICAgbG9jYWxDYXBhYmlsaXRpZXMgPSB0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcztcblxuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0ucmVjdkVuY29kaW5nUGFyYW1ldGVycyA9XG4gICAgICAgICAgICByZWN2RW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgICAgICBwYy50cmFuc2NlaXZlcnNbc2RwTUxpbmVJbmRleF0ucmVtb3RlQ2FwYWJpbGl0aWVzID1cbiAgICAgICAgICAgIHJlbW90ZUNhcGFiaWxpdGllcztcbiAgICAgICAgcGMudHJhbnNjZWl2ZXJzW3NkcE1MaW5lSW5kZXhdLnJ0Y3BQYXJhbWV0ZXJzID0gcnRjcFBhcmFtZXRlcnM7XG5cbiAgICAgICAgaWYgKGNhbmRzLmxlbmd0aCAmJiBpY2VUcmFuc3BvcnQuc3RhdGUgPT09ICduZXcnKSB7XG4gICAgICAgICAgaWYgKChpc0ljZUxpdGUgfHwgaXNDb21wbGV0ZSkgJiZcbiAgICAgICAgICAgICAgKCF1c2luZ0J1bmRsZSB8fCBzZHBNTGluZUluZGV4ID09PSAwKSkge1xuICAgICAgICAgICAgaWNlVHJhbnNwb3J0LnNldFJlbW90ZUNhbmRpZGF0ZXMoY2FuZHMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYW5kcy5mb3JFYWNoKGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICBtYXliZUFkZENhbmRpZGF0ZSh0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQsIGNhbmRpZGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXVzaW5nQnVuZGxlIHx8IHNkcE1MaW5lSW5kZXggPT09IDApIHtcbiAgICAgICAgICBpZiAoaWNlVHJhbnNwb3J0LnN0YXRlID09PSAnbmV3Jykge1xuICAgICAgICAgICAgaWNlVHJhbnNwb3J0LnN0YXJ0KGljZUdhdGhlcmVyLCByZW1vdGVJY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICdjb250cm9sbGluZycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZHRsc1RyYW5zcG9ydC5zdGF0ZSA9PT0gJ25ldycpIHtcbiAgICAgICAgICAgIGR0bHNUcmFuc3BvcnQuc3RhcnQocmVtb3RlRHRsc1BhcmFtZXRlcnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSBvZmZlciBjb250YWluZWQgUlRYIGJ1dCB0aGUgYW5zd2VyIGRpZCBub3QsXG4gICAgICAgIC8vIHJlbW92ZSBSVFggZnJvbSBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzLlxuICAgICAgICB2YXIgY29tbW9uQ2FwYWJpbGl0aWVzID0gZ2V0Q29tbW9uQ2FwYWJpbGl0aWVzKFxuICAgICAgICAgIHRyYW5zY2VpdmVyLmxvY2FsQ2FwYWJpbGl0aWVzLFxuICAgICAgICAgIHRyYW5zY2VpdmVyLnJlbW90ZUNhcGFiaWxpdGllcyk7XG5cbiAgICAgICAgdmFyIGhhc1J0eCA9IGNvbW1vbkNhcGFiaWxpdGllcy5jb2RlY3MuZmlsdGVyKGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgICByZXR1cm4gYy5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdydHgnO1xuICAgICAgICB9KS5sZW5ndGg7XG4gICAgICAgIGlmICghaGFzUnR4ICYmIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4KSB7XG4gICAgICAgICAgZGVsZXRlIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4O1xuICAgICAgICB9XG5cbiAgICAgICAgcGMuX3RyYW5zY2VpdmUodHJhbnNjZWl2ZXIsXG4gICAgICAgICAgICBkaXJlY3Rpb24gPT09ICdzZW5kcmVjdicgfHwgZGlyZWN0aW9uID09PSAncmVjdm9ubHknLFxuICAgICAgICAgICAgZGlyZWN0aW9uID09PSAnc2VuZHJlY3YnIHx8IGRpcmVjdGlvbiA9PT0gJ3NlbmRvbmx5Jyk7XG5cbiAgICAgICAgLy8gVE9ETzogcmV3cml0ZSB0byB1c2UgaHR0cDovL3czYy5naXRodWIuaW8vd2VicnRjLXBjLyNzZXQtYXNzb2NpYXRlZC1yZW1vdGUtc3RyZWFtc1xuICAgICAgICBpZiAocnRwUmVjZWl2ZXIgJiZcbiAgICAgICAgICAgIChkaXJlY3Rpb24gPT09ICdzZW5kcmVjdicgfHwgZGlyZWN0aW9uID09PSAnc2VuZG9ubHknKSkge1xuICAgICAgICAgIHRyYWNrID0gcnRwUmVjZWl2ZXIudHJhY2s7XG4gICAgICAgICAgaWYgKHJlbW90ZU1zaWQpIHtcbiAgICAgICAgICAgIGlmICghc3RyZWFtc1tyZW1vdGVNc2lkLnN0cmVhbV0pIHtcbiAgICAgICAgICAgICAgc3RyZWFtc1tyZW1vdGVNc2lkLnN0cmVhbV0gPSBuZXcgd2luZG93Lk1lZGlhU3RyZWFtKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZGRUcmFja1RvU3RyZWFtQW5kRmlyZUV2ZW50KHRyYWNrLCBzdHJlYW1zW3JlbW90ZU1zaWQuc3RyZWFtXSk7XG4gICAgICAgICAgICByZWNlaXZlckxpc3QucHVzaChbdHJhY2ssIHJ0cFJlY2VpdmVyLCBzdHJlYW1zW3JlbW90ZU1zaWQuc3RyZWFtXV0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXN0cmVhbXMuZGVmYXVsdCkge1xuICAgICAgICAgICAgICBzdHJlYW1zLmRlZmF1bHQgPSBuZXcgd2luZG93Lk1lZGlhU3RyZWFtKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhZGRUcmFja1RvU3RyZWFtQW5kRmlyZUV2ZW50KHRyYWNrLCBzdHJlYW1zLmRlZmF1bHQpO1xuICAgICAgICAgICAgcmVjZWl2ZXJMaXN0LnB1c2goW3RyYWNrLCBydHBSZWNlaXZlciwgc3RyZWFtcy5kZWZhdWx0XSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEZJWE1FOiBhY3R1YWxseSB0aGUgcmVjZWl2ZXIgc2hvdWxkIGJlIGNyZWF0ZWQgbGF0ZXIuXG4gICAgICAgICAgZGVsZXRlIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAocGMuX2R0bHNSb2xlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHBjLl9kdGxzUm9sZSA9IGRlc2NyaXB0aW9uLnR5cGUgPT09ICdvZmZlcicgPyAnYWN0aXZlJyA6ICdwYXNzaXZlJztcbiAgICB9XG5cbiAgICBwYy5fcmVtb3RlRGVzY3JpcHRpb24gPSB7XG4gICAgICB0eXBlOiBkZXNjcmlwdGlvbi50eXBlLFxuICAgICAgc2RwOiBkZXNjcmlwdGlvbi5zZHBcbiAgICB9O1xuICAgIGlmIChkZXNjcmlwdGlvbi50eXBlID09PSAnb2ZmZXInKSB7XG4gICAgICBwYy5fdXBkYXRlU2lnbmFsaW5nU3RhdGUoJ2hhdmUtcmVtb3RlLW9mZmVyJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBjLl91cGRhdGVTaWduYWxpbmdTdGF0ZSgnc3RhYmxlJyk7XG4gICAgfVxuICAgIE9iamVjdC5rZXlzKHN0cmVhbXMpLmZvckVhY2goZnVuY3Rpb24oc2lkKSB7XG4gICAgICB2YXIgc3RyZWFtID0gc3RyZWFtc1tzaWRdO1xuICAgICAgaWYgKHN0cmVhbS5nZXRUcmFja3MoKS5sZW5ndGgpIHtcbiAgICAgICAgaWYgKHBjLnJlbW90ZVN0cmVhbXMuaW5kZXhPZihzdHJlYW0pID09PSAtMSkge1xuICAgICAgICAgIHBjLnJlbW90ZVN0cmVhbXMucHVzaChzdHJlYW0pO1xuICAgICAgICAgIHZhciBldmVudCA9IG5ldyBFdmVudCgnYWRkc3RyZWFtJyk7XG4gICAgICAgICAgZXZlbnQuc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcGMuX2Rpc3BhdGNoRXZlbnQoJ2FkZHN0cmVhbScsIGV2ZW50KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlY2VpdmVyTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICB2YXIgdHJhY2sgPSBpdGVtWzBdO1xuICAgICAgICAgIHZhciByZWNlaXZlciA9IGl0ZW1bMV07XG4gICAgICAgICAgaWYgKHN0cmVhbS5pZCAhPT0gaXRlbVsyXS5pZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmaXJlQWRkVHJhY2socGMsIHRyYWNrLCByZWNlaXZlciwgW3N0cmVhbV0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZWNlaXZlckxpc3QuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBmaXJlQWRkVHJhY2socGMsIGl0ZW1bMF0sIGl0ZW1bMV0sIFtdKTtcbiAgICB9KTtcblxuICAgIC8vIGNoZWNrIHdoZXRoZXIgYWRkSWNlQ2FuZGlkYXRlKHt9KSB3YXMgY2FsbGVkIHdpdGhpbiBmb3VyIHNlY29uZHMgYWZ0ZXJcbiAgICAvLyBzZXRSZW1vdGVEZXNjcmlwdGlvbi5cbiAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIGlmICghKHBjICYmIHBjLnRyYW5zY2VpdmVycykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgcGMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgICAgaWYgKHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCAmJlxuICAgICAgICAgICAgdHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0LnN0YXRlID09PSAnbmV3JyAmJlxuICAgICAgICAgICAgdHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0LmdldFJlbW90ZUNhbmRpZGF0ZXMoKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCdUaW1lb3V0IGZvciBhZGRSZW1vdGVDYW5kaWRhdGUuIENvbnNpZGVyIHNlbmRpbmcgJyArXG4gICAgICAgICAgICAgICdhbiBlbmQtb2YtY2FuZGlkYXRlcyBub3RpZmljYXRpb24nKTtcbiAgICAgICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuYWRkUmVtb3RlQ2FuZGlkYXRlKHt9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSwgNDAwMCk7XG5cbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgLyogbm90IHlldFxuICAgICAgaWYgKHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyLmNsb3NlKCk7XG4gICAgICB9XG4gICAgICAqL1xuICAgICAgaWYgKHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCkge1xuICAgICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuc3RvcCgpO1xuICAgICAgfVxuICAgICAgaWYgKHRyYW5zY2VpdmVyLmR0bHNUcmFuc3BvcnQpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydC5zdG9wKCk7XG4gICAgICB9XG4gICAgICBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLnJ0cFNlbmRlci5zdG9wKCk7XG4gICAgICB9XG4gICAgICBpZiAodHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIpIHtcbiAgICAgICAgdHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIuc3RvcCgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8vIEZJWE1FOiBjbGVhbiB1cCB0cmFja3MsIGxvY2FsIHN0cmVhbXMsIHJlbW90ZSBzdHJlYW1zLCBldGNcbiAgICB0aGlzLl9pc0Nsb3NlZCA9IHRydWU7XG4gICAgdGhpcy5fdXBkYXRlU2lnbmFsaW5nU3RhdGUoJ2Nsb3NlZCcpO1xuICB9O1xuXG4gIC8vIFVwZGF0ZSB0aGUgc2lnbmFsaW5nIHN0YXRlLlxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZVNpZ25hbGluZ1N0YXRlID0gZnVuY3Rpb24obmV3U3RhdGUpIHtcbiAgICB0aGlzLnNpZ25hbGluZ1N0YXRlID0gbmV3U3RhdGU7XG4gICAgdmFyIGV2ZW50ID0gbmV3IEV2ZW50KCdzaWduYWxpbmdzdGF0ZWNoYW5nZScpO1xuICAgIHRoaXMuX2Rpc3BhdGNoRXZlbnQoJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJywgZXZlbnQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIHRvIGZpcmUgdGhlIG5lZ290aWF0aW9ubmVlZGVkIGV2ZW50LlxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuX21heWJlRmlyZU5lZ290aWF0aW9uTmVlZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBjID0gdGhpcztcbiAgICBpZiAodGhpcy5zaWduYWxpbmdTdGF0ZSAhPT0gJ3N0YWJsZScgfHwgdGhpcy5uZWVkTmVnb3RpYXRpb24gPT09IHRydWUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5uZWVkTmVnb3RpYXRpb24gPSB0cnVlO1xuICAgIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHBjLm5lZWROZWdvdGlhdGlvbikge1xuICAgICAgICBwYy5uZWVkTmVnb3RpYXRpb24gPSBmYWxzZTtcbiAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEV2ZW50KCduZWdvdGlhdGlvbm5lZWRlZCcpO1xuICAgICAgICBwYy5fZGlzcGF0Y2hFdmVudCgnbmVnb3RpYXRpb25uZWVkZWQnLCBldmVudCk7XG4gICAgICB9XG4gICAgfSwgMCk7XG4gIH07XG5cbiAgLy8gVXBkYXRlIHRoZSBpY2UgY29ubmVjdGlvbiBzdGF0ZS5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLl91cGRhdGVJY2VDb25uZWN0aW9uU3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmV3U3RhdGU7XG4gICAgdmFyIHN0YXRlcyA9IHtcbiAgICAgICduZXcnOiAwLFxuICAgICAgY2xvc2VkOiAwLFxuICAgICAgY2hlY2tpbmc6IDAsXG4gICAgICBjb25uZWN0ZWQ6IDAsXG4gICAgICBjb21wbGV0ZWQ6IDAsXG4gICAgICBkaXNjb25uZWN0ZWQ6IDAsXG4gICAgICBmYWlsZWQ6IDBcbiAgICB9O1xuICAgIHRoaXMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIGlmICh0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQgJiYgIXRyYW5zY2VpdmVyLnJlamVjdGVkKSB7XG4gICAgICAgIHN0YXRlc1t0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQuc3RhdGVdKys7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBuZXdTdGF0ZSA9ICduZXcnO1xuICAgIGlmIChzdGF0ZXMuZmFpbGVkID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnZmFpbGVkJztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5jaGVja2luZyA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2NoZWNraW5nJztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5kaXNjb25uZWN0ZWQgPiAwKSB7XG4gICAgICBuZXdTdGF0ZSA9ICdkaXNjb25uZWN0ZWQnO1xuICAgIH0gZWxzZSBpZiAoc3RhdGVzLm5ldyA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ25ldyc7XG4gICAgfSBlbHNlIGlmIChzdGF0ZXMuY29ubmVjdGVkID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnY29ubmVjdGVkJztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5jb21wbGV0ZWQgPiAwKSB7XG4gICAgICBuZXdTdGF0ZSA9ICdjb21wbGV0ZWQnO1xuICAgIH1cblxuICAgIGlmIChuZXdTdGF0ZSAhPT0gdGhpcy5pY2VDb25uZWN0aW9uU3RhdGUpIHtcbiAgICAgIHRoaXMuaWNlQ29ubmVjdGlvblN0YXRlID0gbmV3U3RhdGU7XG4gICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2ljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZScpO1xuICAgICAgdGhpcy5fZGlzcGF0Y2hFdmVudCgnaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgZXZlbnQpO1xuICAgIH1cbiAgfTtcblxuICAvLyBVcGRhdGUgdGhlIGNvbm5lY3Rpb24gc3RhdGUuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5fdXBkYXRlQ29ubmVjdGlvblN0YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5ld1N0YXRlO1xuICAgIHZhciBzdGF0ZXMgPSB7XG4gICAgICAnbmV3JzogMCxcbiAgICAgIGNsb3NlZDogMCxcbiAgICAgIGNvbm5lY3Rpbmc6IDAsXG4gICAgICBjb25uZWN0ZWQ6IDAsXG4gICAgICBjb21wbGV0ZWQ6IDAsXG4gICAgICBkaXNjb25uZWN0ZWQ6IDAsXG4gICAgICBmYWlsZWQ6IDBcbiAgICB9O1xuICAgIHRoaXMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgIGlmICh0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQgJiYgdHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydCAmJlxuICAgICAgICAgICF0cmFuc2NlaXZlci5yZWplY3RlZCkge1xuICAgICAgICBzdGF0ZXNbdHJhbnNjZWl2ZXIuaWNlVHJhbnNwb3J0LnN0YXRlXSsrO1xuICAgICAgICBzdGF0ZXNbdHJhbnNjZWl2ZXIuZHRsc1RyYW5zcG9ydC5zdGF0ZV0rKztcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBJQ0VUcmFuc3BvcnQuY29tcGxldGVkIGFuZCBjb25uZWN0ZWQgYXJlIHRoZSBzYW1lIGZvciB0aGlzIHB1cnBvc2UuXG4gICAgc3RhdGVzLmNvbm5lY3RlZCArPSBzdGF0ZXMuY29tcGxldGVkO1xuXG4gICAgbmV3U3RhdGUgPSAnbmV3JztcbiAgICBpZiAoc3RhdGVzLmZhaWxlZCA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2ZhaWxlZCc7XG4gICAgfSBlbHNlIGlmIChzdGF0ZXMuY29ubmVjdGluZyA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2Nvbm5lY3RpbmcnO1xuICAgIH0gZWxzZSBpZiAoc3RhdGVzLmRpc2Nvbm5lY3RlZCA+IDApIHtcbiAgICAgIG5ld1N0YXRlID0gJ2Rpc2Nvbm5lY3RlZCc7XG4gICAgfSBlbHNlIGlmIChzdGF0ZXMubmV3ID4gMCkge1xuICAgICAgbmV3U3RhdGUgPSAnbmV3JztcbiAgICB9IGVsc2UgaWYgKHN0YXRlcy5jb25uZWN0ZWQgPiAwKSB7XG4gICAgICBuZXdTdGF0ZSA9ICdjb25uZWN0ZWQnO1xuICAgIH1cblxuICAgIGlmIChuZXdTdGF0ZSAhPT0gdGhpcy5jb25uZWN0aW9uU3RhdGUpIHtcbiAgICAgIHRoaXMuY29ubmVjdGlvblN0YXRlID0gbmV3U3RhdGU7XG4gICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2Nvbm5lY3Rpb25zdGF0ZWNoYW5nZScpO1xuICAgICAgdGhpcy5fZGlzcGF0Y2hFdmVudCgnY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgZXZlbnQpO1xuICAgIH1cbiAgfTtcblxuICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlT2ZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuXG4gICAgaWYgKHBjLl9pc0Nsb3NlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG1ha2VFcnJvcignSW52YWxpZFN0YXRlRXJyb3InLFxuICAgICAgICAgICdDYW4gbm90IGNhbGwgY3JlYXRlT2ZmZXIgYWZ0ZXIgY2xvc2UnKSk7XG4gICAgfVxuXG4gICAgdmFyIG51bUF1ZGlvVHJhY2tzID0gcGMudHJhbnNjZWl2ZXJzLmZpbHRlcihmdW5jdGlvbih0KSB7XG4gICAgICByZXR1cm4gdC5raW5kID09PSAnYXVkaW8nO1xuICAgIH0pLmxlbmd0aDtcbiAgICB2YXIgbnVtVmlkZW9UcmFja3MgPSBwYy50cmFuc2NlaXZlcnMuZmlsdGVyKGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiB0LmtpbmQgPT09ICd2aWRlbyc7XG4gICAgfSkubGVuZ3RoO1xuXG4gICAgLy8gRGV0ZXJtaW5lIG51bWJlciBvZiBhdWRpbyBhbmQgdmlkZW8gdHJhY2tzIHdlIG5lZWQgdG8gc2VuZC9yZWN2LlxuICAgIHZhciBvZmZlck9wdGlvbnMgPSBhcmd1bWVudHNbMF07XG4gICAgaWYgKG9mZmVyT3B0aW9ucykge1xuICAgICAgLy8gUmVqZWN0IENocm9tZSBsZWdhY3kgY29uc3RyYWludHMuXG4gICAgICBpZiAob2ZmZXJPcHRpb25zLm1hbmRhdG9yeSB8fCBvZmZlck9wdGlvbnMub3B0aW9uYWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICdMZWdhY3kgbWFuZGF0b3J5L29wdGlvbmFsIGNvbnN0cmFpbnRzIG5vdCBzdXBwb3J0ZWQuJyk7XG4gICAgICB9XG4gICAgICBpZiAob2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAob2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gPT09IHRydWUpIHtcbiAgICAgICAgICBudW1BdWRpb1RyYWNrcyA9IDE7XG4gICAgICAgIH0gZWxzZSBpZiAob2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW8gPT09IGZhbHNlKSB7XG4gICAgICAgICAgbnVtQXVkaW9UcmFja3MgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG51bUF1ZGlvVHJhY2tzID0gb2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlQXVkaW87XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIG51bVZpZGVvVHJhY2tzID0gMTtcbiAgICAgICAgfSBlbHNlIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBudW1WaWRlb1RyYWNrcyA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbnVtVmlkZW9UcmFja3MgPSBvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHBjLnRyYW5zY2VpdmVycy5mb3JFYWNoKGZ1bmN0aW9uKHRyYW5zY2VpdmVyKSB7XG4gICAgICBpZiAodHJhbnNjZWl2ZXIua2luZCA9PT0gJ2F1ZGlvJykge1xuICAgICAgICBudW1BdWRpb1RyYWNrcy0tO1xuICAgICAgICBpZiAobnVtQXVkaW9UcmFja3MgPCAwKSB7XG4gICAgICAgICAgdHJhbnNjZWl2ZXIud2FudFJlY2VpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5raW5kID09PSAndmlkZW8nKSB7XG4gICAgICAgIG51bVZpZGVvVHJhY2tzLS07XG4gICAgICAgIGlmIChudW1WaWRlb1RyYWNrcyA8IDApIHtcbiAgICAgICAgICB0cmFuc2NlaXZlci53YW50UmVjZWl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgTS1saW5lcyBmb3IgcmVjdm9ubHkgc3RyZWFtcy5cbiAgICB3aGlsZSAobnVtQXVkaW9UcmFja3MgPiAwIHx8IG51bVZpZGVvVHJhY2tzID4gMCkge1xuICAgICAgaWYgKG51bUF1ZGlvVHJhY2tzID4gMCkge1xuICAgICAgICBwYy5fY3JlYXRlVHJhbnNjZWl2ZXIoJ2F1ZGlvJyk7XG4gICAgICAgIG51bUF1ZGlvVHJhY2tzLS07XG4gICAgICB9XG4gICAgICBpZiAobnVtVmlkZW9UcmFja3MgPiAwKSB7XG4gICAgICAgIHBjLl9jcmVhdGVUcmFuc2NlaXZlcigndmlkZW8nKTtcbiAgICAgICAgbnVtVmlkZW9UcmFja3MtLTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgc2RwID0gU0RQVXRpbHMud3JpdGVTZXNzaW9uQm9pbGVycGxhdGUocGMuX3NkcFNlc3Npb25JZCxcbiAgICAgICAgcGMuX3NkcFNlc3Npb25WZXJzaW9uKyspO1xuICAgIHBjLnRyYW5zY2VpdmVycy5mb3JFYWNoKGZ1bmN0aW9uKHRyYW5zY2VpdmVyLCBzZHBNTGluZUluZGV4KSB7XG4gICAgICAvLyBGb3IgZWFjaCB0cmFjaywgY3JlYXRlIGFuIGljZSBnYXRoZXJlciwgaWNlIHRyYW5zcG9ydCxcbiAgICAgIC8vIGR0bHMgdHJhbnNwb3J0LCBwb3RlbnRpYWxseSBydHBzZW5kZXIgYW5kIHJ0cHJlY2VpdmVyLlxuICAgICAgdmFyIHRyYWNrID0gdHJhbnNjZWl2ZXIudHJhY2s7XG4gICAgICB2YXIga2luZCA9IHRyYW5zY2VpdmVyLmtpbmQ7XG4gICAgICB2YXIgbWlkID0gdHJhbnNjZWl2ZXIubWlkIHx8IFNEUFV0aWxzLmdlbmVyYXRlSWRlbnRpZmllcigpO1xuICAgICAgdHJhbnNjZWl2ZXIubWlkID0gbWlkO1xuXG4gICAgICBpZiAoIXRyYW5zY2VpdmVyLmljZUdhdGhlcmVyKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyID0gcGMuX2NyZWF0ZUljZUdhdGhlcmVyKHNkcE1MaW5lSW5kZXgsXG4gICAgICAgICAgICBwYy51c2luZ0J1bmRsZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBsb2NhbENhcGFiaWxpdGllcyA9IHdpbmRvdy5SVENSdHBTZW5kZXIuZ2V0Q2FwYWJpbGl0aWVzKGtpbmQpO1xuICAgICAgLy8gZmlsdGVyIFJUWCB1bnRpbCBhZGRpdGlvbmFsIHN0dWZmIG5lZWRlZCBmb3IgUlRYIGlzIGltcGxlbWVudGVkXG4gICAgICAvLyBpbiBhZGFwdGVyLmpzXG4gICAgICBpZiAoZWRnZVZlcnNpb24gPCAxNTAxOSkge1xuICAgICAgICBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MgPSBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MuZmlsdGVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oY29kZWMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNvZGVjLm5hbWUgIT09ICdydHgnO1xuICAgICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBsb2NhbENhcGFiaWxpdGllcy5jb2RlY3MuZm9yRWFjaChmdW5jdGlvbihjb2RlYykge1xuICAgICAgICAvLyB3b3JrIGFyb3VuZCBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3Avd2VicnRjL2lzc3Vlcy9kZXRhaWw/aWQ9NjU1MlxuICAgICAgICAvLyBieSBhZGRpbmcgbGV2ZWwtYXN5bW1ldHJ5LWFsbG93ZWQ9MVxuICAgICAgICBpZiAoY29kZWMubmFtZSA9PT0gJ0gyNjQnICYmXG4gICAgICAgICAgICBjb2RlYy5wYXJhbWV0ZXJzWydsZXZlbC1hc3ltbWV0cnktYWxsb3dlZCddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb2RlYy5wYXJhbWV0ZXJzWydsZXZlbC1hc3ltbWV0cnktYWxsb3dlZCddID0gJzEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZm9yIHN1YnNlcXVlbnQgb2ZmZXJzLCB3ZSBtaWdodCBoYXZlIHRvIHJlLXVzZSB0aGUgcGF5bG9hZFxuICAgICAgICAvLyB0eXBlIG9mIHRoZSBsYXN0IG9mZmVyLlxuICAgICAgICBpZiAodHJhbnNjZWl2ZXIucmVtb3RlQ2FwYWJpbGl0aWVzICYmXG4gICAgICAgICAgICB0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXMuY29kZWNzKSB7XG4gICAgICAgICAgdHJhbnNjZWl2ZXIucmVtb3RlQ2FwYWJpbGl0aWVzLmNvZGVjcy5mb3JFYWNoKGZ1bmN0aW9uKHJlbW90ZUNvZGVjKSB7XG4gICAgICAgICAgICBpZiAoY29kZWMubmFtZS50b0xvd2VyQ2FzZSgpID09PSByZW1vdGVDb2RlYy5uYW1lLnRvTG93ZXJDYXNlKCkgJiZcbiAgICAgICAgICAgICAgICBjb2RlYy5jbG9ja1JhdGUgPT09IHJlbW90ZUNvZGVjLmNsb2NrUmF0ZSkge1xuICAgICAgICAgICAgICBjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZSA9IHJlbW90ZUNvZGVjLnBheWxvYWRUeXBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGxvY2FsQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMuZm9yRWFjaChmdW5jdGlvbihoZHJFeHQpIHtcbiAgICAgICAgdmFyIHJlbW90ZUV4dGVuc2lvbnMgPSB0cmFuc2NlaXZlci5yZW1vdGVDYXBhYmlsaXRpZXMgJiZcbiAgICAgICAgICAgIHRyYW5zY2VpdmVyLnJlbW90ZUNhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zIHx8IFtdO1xuICAgICAgICByZW1vdGVFeHRlbnNpb25zLmZvckVhY2goZnVuY3Rpb24ockhkckV4dCkge1xuICAgICAgICAgIGlmIChoZHJFeHQudXJpID09PSBySGRyRXh0LnVyaSkge1xuICAgICAgICAgICAgaGRyRXh0LmlkID0gckhkckV4dC5pZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIGdlbmVyYXRlIGFuIHNzcmMgbm93LCB0byBiZSB1c2VkIGxhdGVyIGluIHJ0cFNlbmRlci5zZW5kXG4gICAgICB2YXIgc2VuZEVuY29kaW5nUGFyYW1ldGVycyA9IHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnMgfHwgW3tcbiAgICAgICAgc3NyYzogKDIgKiBzZHBNTGluZUluZGV4ICsgMSkgKiAxMDAxXG4gICAgICB9XTtcbiAgICAgIGlmICh0cmFjaykge1xuICAgICAgICAvLyBhZGQgUlRYXG4gICAgICAgIGlmIChlZGdlVmVyc2lvbiA+PSAxNTAxOSAmJiBraW5kID09PSAndmlkZW8nICYmXG4gICAgICAgICAgICAhc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHgpIHtcbiAgICAgICAgICBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eCA9IHtcbiAgICAgICAgICAgIHNzcmM6IHNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYyArIDFcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0cmFuc2NlaXZlci53YW50UmVjZWl2ZSkge1xuICAgICAgICB0cmFuc2NlaXZlci5ydHBSZWNlaXZlciA9IG5ldyB3aW5kb3cuUlRDUnRwUmVjZWl2ZXIoXG4gICAgICAgICAgICB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0LCBraW5kKTtcbiAgICAgIH1cblxuICAgICAgdHJhbnNjZWl2ZXIubG9jYWxDYXBhYmlsaXRpZXMgPSBsb2NhbENhcGFiaWxpdGllcztcbiAgICAgIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnMgPSBzZW5kRW5jb2RpbmdQYXJhbWV0ZXJzO1xuICAgIH0pO1xuXG4gICAgLy8gYWx3YXlzIG9mZmVyIEJVTkRMRSBhbmQgZGlzcG9zZSBvbiByZXR1cm4gaWYgbm90IHN1cHBvcnRlZC5cbiAgICBpZiAocGMuX2NvbmZpZy5idW5kbGVQb2xpY3kgIT09ICdtYXgtY29tcGF0Jykge1xuICAgICAgc2RwICs9ICdhPWdyb3VwOkJVTkRMRSAnICsgcGMudHJhbnNjZWl2ZXJzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgIHJldHVybiB0Lm1pZDtcbiAgICAgIH0pLmpvaW4oJyAnKSArICdcXHJcXG4nO1xuICAgIH1cbiAgICBzZHAgKz0gJ2E9aWNlLW9wdGlvbnM6dHJpY2tsZVxcclxcbic7XG5cbiAgICBwYy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlciwgc2RwTUxpbmVJbmRleCkge1xuICAgICAgc2RwICs9IHdyaXRlTWVkaWFTZWN0aW9uKHRyYW5zY2VpdmVyLCB0cmFuc2NlaXZlci5sb2NhbENhcGFiaWxpdGllcyxcbiAgICAgICAgICAnb2ZmZXInLCB0cmFuc2NlaXZlci5zdHJlYW0sIHBjLl9kdGxzUm9sZSk7XG4gICAgICBzZHAgKz0gJ2E9cnRjcC1yc2l6ZVxcclxcbic7XG5cbiAgICAgIGlmICh0cmFuc2NlaXZlci5pY2VHYXRoZXJlciAmJiBwYy5pY2VHYXRoZXJpbmdTdGF0ZSAhPT0gJ25ldycgJiZcbiAgICAgICAgICAoc2RwTUxpbmVJbmRleCA9PT0gMCB8fCAhcGMudXNpbmdCdW5kbGUpKSB7XG4gICAgICAgIHRyYW5zY2VpdmVyLmljZUdhdGhlcmVyLmdldExvY2FsQ2FuZGlkYXRlcygpLmZvckVhY2goZnVuY3Rpb24oY2FuZCkge1xuICAgICAgICAgIGNhbmQuY29tcG9uZW50ID0gMTtcbiAgICAgICAgICBzZHAgKz0gJ2E9JyArIFNEUFV0aWxzLndyaXRlQ2FuZGlkYXRlKGNhbmQpICsgJ1xcclxcbic7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0cmFuc2NlaXZlci5pY2VHYXRoZXJlci5zdGF0ZSA9PT0gJ2NvbXBsZXRlZCcpIHtcbiAgICAgICAgICBzZHAgKz0gJ2E9ZW5kLW9mLWNhbmRpZGF0ZXNcXHJcXG4nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgZGVzYyA9IG5ldyB3aW5kb3cuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHtcbiAgICAgIHR5cGU6ICdvZmZlcicsXG4gICAgICBzZHA6IHNkcFxuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZGVzYyk7XG4gIH07XG5cbiAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZUFuc3dlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYyA9IHRoaXM7XG5cbiAgICBpZiAocGMuX2lzQ2xvc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobWFrZUVycm9yKCdJbnZhbGlkU3RhdGVFcnJvcicsXG4gICAgICAgICAgJ0NhbiBub3QgY2FsbCBjcmVhdGVBbnN3ZXIgYWZ0ZXIgY2xvc2UnKSk7XG4gICAgfVxuXG4gICAgaWYgKCEocGMuc2lnbmFsaW5nU3RhdGUgPT09ICdoYXZlLXJlbW90ZS1vZmZlcicgfHxcbiAgICAgICAgcGMuc2lnbmFsaW5nU3RhdGUgPT09ICdoYXZlLWxvY2FsLXByYW5zd2VyJykpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChtYWtlRXJyb3IoJ0ludmFsaWRTdGF0ZUVycm9yJyxcbiAgICAgICAgICAnQ2FuIG5vdCBjYWxsIGNyZWF0ZUFuc3dlciBpbiBzaWduYWxpbmdTdGF0ZSAnICsgcGMuc2lnbmFsaW5nU3RhdGUpKTtcbiAgICB9XG5cbiAgICB2YXIgc2RwID0gU0RQVXRpbHMud3JpdGVTZXNzaW9uQm9pbGVycGxhdGUocGMuX3NkcFNlc3Npb25JZCxcbiAgICAgICAgcGMuX3NkcFNlc3Npb25WZXJzaW9uKyspO1xuICAgIGlmIChwYy51c2luZ0J1bmRsZSkge1xuICAgICAgc2RwICs9ICdhPWdyb3VwOkJVTkRMRSAnICsgcGMudHJhbnNjZWl2ZXJzLm1hcChmdW5jdGlvbih0KSB7XG4gICAgICAgIHJldHVybiB0Lm1pZDtcbiAgICAgIH0pLmpvaW4oJyAnKSArICdcXHJcXG4nO1xuICAgIH1cbiAgICBzZHAgKz0gJ2E9aWNlLW9wdGlvbnM6dHJpY2tsZVxcclxcbic7XG5cbiAgICB2YXIgbWVkaWFTZWN0aW9uc0luT2ZmZXIgPSBTRFBVdGlscy5nZXRNZWRpYVNlY3Rpb25zKFxuICAgICAgICBwYy5fcmVtb3RlRGVzY3JpcHRpb24uc2RwKS5sZW5ndGg7XG4gICAgcGMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIsIHNkcE1MaW5lSW5kZXgpIHtcbiAgICAgIGlmIChzZHBNTGluZUluZGV4ICsgMSA+IG1lZGlhU2VjdGlvbnNJbk9mZmVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0cmFuc2NlaXZlci5yZWplY3RlZCkge1xuICAgICAgICBpZiAodHJhbnNjZWl2ZXIua2luZCA9PT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgICAgIGlmICh0cmFuc2NlaXZlci5wcm90b2NvbCA9PT0gJ0RUTFMvU0NUUCcpIHsgLy8gbGVnYWN5IGZtdFxuICAgICAgICAgICAgc2RwICs9ICdtPWFwcGxpY2F0aW9uIDAgRFRMUy9TQ1RQIDUwMDBcXHJcXG4nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZHAgKz0gJ209YXBwbGljYXRpb24gMCAnICsgdHJhbnNjZWl2ZXIucHJvdG9jb2wgK1xuICAgICAgICAgICAgICAgICcgd2VicnRjLWRhdGFjaGFubmVsXFxyXFxuJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIua2luZCA9PT0gJ2F1ZGlvJykge1xuICAgICAgICAgIHNkcCArPSAnbT1hdWRpbyAwIFVEUC9UTFMvUlRQL1NBVlBGIDBcXHJcXG4nICtcbiAgICAgICAgICAgICAgJ2E9cnRwbWFwOjAgUENNVS84MDAwXFxyXFxuJztcbiAgICAgICAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5raW5kID09PSAndmlkZW8nKSB7XG4gICAgICAgICAgc2RwICs9ICdtPXZpZGVvIDAgVURQL1RMUy9SVFAvU0FWUEYgMTIwXFxyXFxuJyArXG4gICAgICAgICAgICAgICdhPXJ0cG1hcDoxMjAgVlA4LzkwMDAwXFxyXFxuJztcbiAgICAgICAgfVxuICAgICAgICBzZHAgKz0gJ2M9SU4gSVA0IDAuMC4wLjBcXHJcXG4nICtcbiAgICAgICAgICAgICdhPWluYWN0aXZlXFxyXFxuJyArXG4gICAgICAgICAgICAnYT1taWQ6JyArIHRyYW5zY2VpdmVyLm1pZCArICdcXHJcXG4nO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIEZJWE1FOiBsb29rIGF0IGRpcmVjdGlvbi5cbiAgICAgIGlmICh0cmFuc2NlaXZlci5zdHJlYW0pIHtcbiAgICAgICAgdmFyIGxvY2FsVHJhY2s7XG4gICAgICAgIGlmICh0cmFuc2NlaXZlci5raW5kID09PSAnYXVkaW8nKSB7XG4gICAgICAgICAgbG9jYWxUcmFjayA9IHRyYW5zY2VpdmVyLnN0cmVhbS5nZXRBdWRpb1RyYWNrcygpWzBdO1xuICAgICAgICB9IGVsc2UgaWYgKHRyYW5zY2VpdmVyLmtpbmQgPT09ICd2aWRlbycpIHtcbiAgICAgICAgICBsb2NhbFRyYWNrID0gdHJhbnNjZWl2ZXIuc3RyZWFtLmdldFZpZGVvVHJhY2tzKClbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxvY2FsVHJhY2spIHtcbiAgICAgICAgICAvLyBhZGQgUlRYXG4gICAgICAgICAgaWYgKGVkZ2VWZXJzaW9uID49IDE1MDE5ICYmIHRyYW5zY2VpdmVyLmtpbmQgPT09ICd2aWRlbycgJiZcbiAgICAgICAgICAgICAgIXRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4KSB7XG4gICAgICAgICAgICB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eCA9IHtcbiAgICAgICAgICAgICAgc3NyYzogdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5zc3JjICsgMVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQ2FsY3VsYXRlIGludGVyc2VjdGlvbiBvZiBjYXBhYmlsaXRpZXMuXG4gICAgICB2YXIgY29tbW9uQ2FwYWJpbGl0aWVzID0gZ2V0Q29tbW9uQ2FwYWJpbGl0aWVzKFxuICAgICAgICAgIHRyYW5zY2VpdmVyLmxvY2FsQ2FwYWJpbGl0aWVzLFxuICAgICAgICAgIHRyYW5zY2VpdmVyLnJlbW90ZUNhcGFiaWxpdGllcyk7XG5cbiAgICAgIHZhciBoYXNSdHggPSBjb21tb25DYXBhYmlsaXRpZXMuY29kZWNzLmZpbHRlcihmdW5jdGlvbihjKSB7XG4gICAgICAgIHJldHVybiBjLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3J0eCc7XG4gICAgICB9KS5sZW5ndGg7XG4gICAgICBpZiAoIWhhc1J0eCAmJiB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eCkge1xuICAgICAgICBkZWxldGUgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHg7XG4gICAgICB9XG5cbiAgICAgIHNkcCArPSB3cml0ZU1lZGlhU2VjdGlvbih0cmFuc2NlaXZlciwgY29tbW9uQ2FwYWJpbGl0aWVzLFxuICAgICAgICAgICdhbnN3ZXInLCB0cmFuc2NlaXZlci5zdHJlYW0sIHBjLl9kdGxzUm9sZSk7XG4gICAgICBpZiAodHJhbnNjZWl2ZXIucnRjcFBhcmFtZXRlcnMgJiZcbiAgICAgICAgICB0cmFuc2NlaXZlci5ydGNwUGFyYW1ldGVycy5yZWR1Y2VkU2l6ZSkge1xuICAgICAgICBzZHAgKz0gJ2E9cnRjcC1yc2l6ZVxcclxcbic7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgZGVzYyA9IG5ldyB3aW5kb3cuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHtcbiAgICAgIHR5cGU6ICdhbnN3ZXInLFxuICAgICAgc2RwOiBzZHBcbiAgICB9KTtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGRlc2MpO1xuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbihjYW5kaWRhdGUpIHtcbiAgICB2YXIgcGMgPSB0aGlzO1xuICAgIHZhciBzZWN0aW9ucztcbiAgICBpZiAoY2FuZGlkYXRlICYmICEoY2FuZGlkYXRlLnNkcE1MaW5lSW5kZXggIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBjYW5kaWRhdGUuc2RwTWlkKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ3NkcE1MaW5lSW5kZXggb3Igc2RwTWlkIHJlcXVpcmVkJykpO1xuICAgIH1cblxuICAgIC8vIFRPRE86IG5lZWRzIHRvIGdvIGludG8gb3BzIHF1ZXVlLlxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlmICghcGMuX3JlbW90ZURlc2NyaXB0aW9uKSB7XG4gICAgICAgIHJldHVybiByZWplY3QobWFrZUVycm9yKCdJbnZhbGlkU3RhdGVFcnJvcicsXG4gICAgICAgICAgICAnQ2FuIG5vdCBhZGQgSUNFIGNhbmRpZGF0ZSB3aXRob3V0IGEgcmVtb3RlIGRlc2NyaXB0aW9uJykpO1xuICAgICAgfSBlbHNlIGlmICghY2FuZGlkYXRlIHx8IGNhbmRpZGF0ZS5jYW5kaWRhdGUgPT09ICcnKSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcGMudHJhbnNjZWl2ZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgaWYgKHBjLnRyYW5zY2VpdmVyc1tqXS5yZWplY3RlZCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBjLnRyYW5zY2VpdmVyc1tqXS5pY2VUcmFuc3BvcnQuYWRkUmVtb3RlQ2FuZGlkYXRlKHt9KTtcbiAgICAgICAgICBzZWN0aW9ucyA9IFNEUFV0aWxzLmdldE1lZGlhU2VjdGlvbnMocGMuX3JlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgICAgc2VjdGlvbnNbal0gKz0gJ2E9ZW5kLW9mLWNhbmRpZGF0ZXNcXHJcXG4nO1xuICAgICAgICAgIHBjLl9yZW1vdGVEZXNjcmlwdGlvbi5zZHAgPVxuICAgICAgICAgICAgICBTRFBVdGlscy5nZXREZXNjcmlwdGlvbihwYy5fcmVtb3RlRGVzY3JpcHRpb24uc2RwKSArXG4gICAgICAgICAgICAgIHNlY3Rpb25zLmpvaW4oJycpO1xuICAgICAgICAgIGlmIChwYy51c2luZ0J1bmRsZSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgc2RwTUxpbmVJbmRleCA9IGNhbmRpZGF0ZS5zZHBNTGluZUluZGV4O1xuICAgICAgICBpZiAoY2FuZGlkYXRlLnNkcE1pZCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGMudHJhbnNjZWl2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAocGMudHJhbnNjZWl2ZXJzW2ldLm1pZCA9PT0gY2FuZGlkYXRlLnNkcE1pZCkge1xuICAgICAgICAgICAgICBzZHBNTGluZUluZGV4ID0gaTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0cmFuc2NlaXZlciA9IHBjLnRyYW5zY2VpdmVyc1tzZHBNTGluZUluZGV4XTtcbiAgICAgICAgaWYgKHRyYW5zY2VpdmVyKSB7XG4gICAgICAgICAgaWYgKHRyYW5zY2VpdmVyLnJlamVjdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgY2FuZCA9IE9iamVjdC5rZXlzKGNhbmRpZGF0ZS5jYW5kaWRhdGUpLmxlbmd0aCA+IDAgP1xuICAgICAgICAgICAgICBTRFBVdGlscy5wYXJzZUNhbmRpZGF0ZShjYW5kaWRhdGUuY2FuZGlkYXRlKSA6IHt9O1xuICAgICAgICAgIC8vIElnbm9yZSBDaHJvbWUncyBpbnZhbGlkIGNhbmRpZGF0ZXMgc2luY2UgRWRnZSBkb2VzIG5vdCBsaWtlIHRoZW0uXG4gICAgICAgICAgaWYgKGNhbmQucHJvdG9jb2wgPT09ICd0Y3AnICYmIChjYW5kLnBvcnQgPT09IDAgfHwgY2FuZC5wb3J0ID09PSA5KSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSWdub3JlIFJUQ1AgY2FuZGlkYXRlcywgd2UgYXNzdW1lIFJUQ1AtTVVYLlxuICAgICAgICAgIGlmIChjYW5kLmNvbXBvbmVudCAmJiBjYW5kLmNvbXBvbmVudCAhPT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gd2hlbiB1c2luZyBidW5kbGUsIGF2b2lkIGFkZGluZyBjYW5kaWRhdGVzIHRvIHRoZSB3cm9uZ1xuICAgICAgICAgIC8vIGljZSB0cmFuc3BvcnQuIEFuZCBhdm9pZCBhZGRpbmcgY2FuZGlkYXRlcyBhZGRlZCBpbiB0aGUgU0RQLlxuICAgICAgICAgIGlmIChzZHBNTGluZUluZGV4ID09PSAwIHx8IChzZHBNTGluZUluZGV4ID4gMCAmJlxuICAgICAgICAgICAgICB0cmFuc2NlaXZlci5pY2VUcmFuc3BvcnQgIT09IHBjLnRyYW5zY2VpdmVyc1swXS5pY2VUcmFuc3BvcnQpKSB7XG4gICAgICAgICAgICBpZiAoIW1heWJlQWRkQ2FuZGlkYXRlKHRyYW5zY2VpdmVyLmljZVRyYW5zcG9ydCwgY2FuZCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChtYWtlRXJyb3IoJ09wZXJhdGlvbkVycm9yJyxcbiAgICAgICAgICAgICAgICAgICdDYW4gbm90IGFkZCBJQ0UgY2FuZGlkYXRlJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgcmVtb3RlRGVzY3JpcHRpb24uXG4gICAgICAgICAgdmFyIGNhbmRpZGF0ZVN0cmluZyA9IGNhbmRpZGF0ZS5jYW5kaWRhdGUudHJpbSgpO1xuICAgICAgICAgIGlmIChjYW5kaWRhdGVTdHJpbmcuaW5kZXhPZignYT0nKSA9PT0gMCkge1xuICAgICAgICAgICAgY2FuZGlkYXRlU3RyaW5nID0gY2FuZGlkYXRlU3RyaW5nLnN1YnN0cigyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2VjdGlvbnMgPSBTRFBVdGlscy5nZXRNZWRpYVNlY3Rpb25zKHBjLl9yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICAgIHNlY3Rpb25zW3NkcE1MaW5lSW5kZXhdICs9ICdhPScgK1xuICAgICAgICAgICAgICAoY2FuZC50eXBlID8gY2FuZGlkYXRlU3RyaW5nIDogJ2VuZC1vZi1jYW5kaWRhdGVzJylcbiAgICAgICAgICAgICAgKyAnXFxyXFxuJztcbiAgICAgICAgICBwYy5fcmVtb3RlRGVzY3JpcHRpb24uc2RwID1cbiAgICAgICAgICAgICAgU0RQVXRpbHMuZ2V0RGVzY3JpcHRpb24ocGMuX3JlbW90ZURlc2NyaXB0aW9uLnNkcCkgK1xuICAgICAgICAgICAgICBzZWN0aW9ucy5qb2luKCcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KG1ha2VFcnJvcignT3BlcmF0aW9uRXJyb3InLFxuICAgICAgICAgICAgICAnQ2FuIG5vdCBhZGQgSUNFIGNhbmRpZGF0ZScpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pO1xuICB9O1xuXG4gIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgaWYgKHNlbGVjdG9yICYmIHNlbGVjdG9yIGluc3RhbmNlb2Ygd2luZG93Lk1lZGlhU3RyZWFtVHJhY2spIHtcbiAgICAgIHZhciBzZW5kZXJPclJlY2VpdmVyID0gbnVsbDtcbiAgICAgIHRoaXMudHJhbnNjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24odHJhbnNjZWl2ZXIpIHtcbiAgICAgICAgaWYgKHRyYW5zY2VpdmVyLnJ0cFNlbmRlciAmJlxuICAgICAgICAgICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyLnRyYWNrID09PSBzZWxlY3Rvcikge1xuICAgICAgICAgIHNlbmRlck9yUmVjZWl2ZXIgPSB0cmFuc2NlaXZlci5ydHBTZW5kZXI7XG4gICAgICAgIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIucnRwUmVjZWl2ZXIgJiZcbiAgICAgICAgICAgIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyLnRyYWNrID09PSBzZWxlY3Rvcikge1xuICAgICAgICAgIHNlbmRlck9yUmVjZWl2ZXIgPSB0cmFuc2NlaXZlci5ydHBSZWNlaXZlcjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoIXNlbmRlck9yUmVjZWl2ZXIpIHtcbiAgICAgICAgdGhyb3cgbWFrZUVycm9yKCdJbnZhbGlkQWNjZXNzRXJyb3InLCAnSW52YWxpZCBzZWxlY3Rvci4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzZW5kZXJPclJlY2VpdmVyLmdldFN0YXRzKCk7XG4gICAgfVxuXG4gICAgdmFyIHByb21pc2VzID0gW107XG4gICAgdGhpcy50cmFuc2NlaXZlcnMuZm9yRWFjaChmdW5jdGlvbih0cmFuc2NlaXZlcikge1xuICAgICAgWydydHBTZW5kZXInLCAncnRwUmVjZWl2ZXInLCAnaWNlR2F0aGVyZXInLCAnaWNlVHJhbnNwb3J0JyxcbiAgICAgICAgICAnZHRsc1RyYW5zcG9ydCddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgICAgICAgICBpZiAodHJhbnNjZWl2ZXJbbWV0aG9kXSkge1xuICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRyYW5zY2VpdmVyW21ldGhvZF0uZ2V0U3RhdHMoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFsbFN0YXRzKSB7XG4gICAgICB2YXIgcmVzdWx0cyA9IG5ldyBNYXAoKTtcbiAgICAgIGFsbFN0YXRzLmZvckVhY2goZnVuY3Rpb24oc3RhdHMpIHtcbiAgICAgICAgc3RhdHMuZm9yRWFjaChmdW5jdGlvbihzdGF0KSB7XG4gICAgICAgICAgcmVzdWx0cy5zZXQoc3RhdC5pZCwgc3RhdCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9KTtcbiAgfTtcblxuICAvLyBmaXggbG93LWxldmVsIHN0YXQgbmFtZXMgYW5kIHJldHVybiBNYXAgaW5zdGVhZCBvZiBvYmplY3QuXG4gIHZhciBvcnRjT2JqZWN0cyA9IFsnUlRDUnRwU2VuZGVyJywgJ1JUQ1J0cFJlY2VpdmVyJywgJ1JUQ0ljZUdhdGhlcmVyJyxcbiAgICAnUlRDSWNlVHJhbnNwb3J0JywgJ1JUQ0R0bHNUcmFuc3BvcnQnXTtcbiAgb3J0Y09iamVjdHMuZm9yRWFjaChmdW5jdGlvbihvcnRjT2JqZWN0TmFtZSkge1xuICAgIHZhciBvYmogPSB3aW5kb3dbb3J0Y09iamVjdE5hbWVdO1xuICAgIGlmIChvYmogJiYgb2JqLnByb3RvdHlwZSAmJiBvYmoucHJvdG90eXBlLmdldFN0YXRzKSB7XG4gICAgICB2YXIgbmF0aXZlR2V0c3RhdHMgPSBvYmoucHJvdG90eXBlLmdldFN0YXRzO1xuICAgICAgb2JqLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbmF0aXZlR2V0c3RhdHMuYXBwbHkodGhpcylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24obmF0aXZlU3RhdHMpIHtcbiAgICAgICAgICB2YXIgbWFwU3RhdHMgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgT2JqZWN0LmtleXMobmF0aXZlU3RhdHMpLmZvckVhY2goZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIG5hdGl2ZVN0YXRzW2lkXS50eXBlID0gZml4U3RhdHNUeXBlKG5hdGl2ZVN0YXRzW2lkXSk7XG4gICAgICAgICAgICBtYXBTdGF0cy5zZXQoaWQsIG5hdGl2ZVN0YXRzW2lkXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIG1hcFN0YXRzO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfVxuICB9KTtcblxuICAvLyBsZWdhY3kgY2FsbGJhY2sgc2hpbXMuIFNob3VsZCBiZSBtb3ZlZCB0byBhZGFwdGVyLmpzIHNvbWUgZGF5cy5cbiAgdmFyIG1ldGhvZHMgPSBbJ2NyZWF0ZU9mZmVyJywgJ2NyZWF0ZUFuc3dlciddO1xuICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgdmFyIG5hdGl2ZU1ldGhvZCA9IFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdO1xuICAgIFJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICAgIHR5cGVvZiBhcmdzWzFdID09PSAnZnVuY3Rpb24nKSB7IC8vIGxlZ2FjeVxuICAgICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIFthcmd1bWVudHNbMl1dKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkZXNjcmlwdGlvbikge1xuICAgICAgICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXJnc1swXS5hcHBseShudWxsLCBbZGVzY3JpcHRpb25dKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhcmdzWzFdLmFwcGx5KG51bGwsIFtlcnJvcl0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfSk7XG5cbiAgbWV0aG9kcyA9IFsnc2V0TG9jYWxEZXNjcmlwdGlvbicsICdzZXRSZW1vdGVEZXNjcmlwdGlvbicsICdhZGRJY2VDYW5kaWRhdGUnXTtcbiAgbWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIHZhciBuYXRpdmVNZXRob2QgPSBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXTtcbiAgICBSVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgICB0eXBlb2YgYXJnc1syXSA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBsZWdhY3lcbiAgICAgICAgcmV0dXJuIG5hdGl2ZU1ldGhvZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXJnc1sxXS5hcHBseShudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBhcmdzWzJdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhcmdzWzJdLmFwcGx5KG51bGwsIFtlcnJvcl0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gZ2V0U3RhdHMgaXMgc3BlY2lhbC4gSXQgZG9lc24ndCBoYXZlIGEgc3BlYyBsZWdhY3kgbWV0aG9kIHlldCB3ZSBzdXBwb3J0XG4gIC8vIGdldFN0YXRzKHNvbWV0aGluZywgY2IpIHdpdGhvdXQgZXJyb3IgY2FsbGJhY2tzLlxuICBbJ2dldFN0YXRzJ10uZm9yRWFjaChmdW5jdGlvbihtZXRob2QpIHtcbiAgICB2YXIgbmF0aXZlTWV0aG9kID0gUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF07XG4gICAgUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBuYXRpdmVNZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFyZ3NbMV0uYXBwbHkobnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuYXRpdmVNZXRob2QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9KTtcblxuICByZXR1cm4gUlRDUGVlckNvbm5lY3Rpb247XG59O1xuIiwiLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG5cbi8vIFNEUCBoZWxwZXJzLlxudmFyIFNEUFV0aWxzID0ge307XG5cbi8vIEdlbmVyYXRlIGFuIGFscGhhbnVtZXJpYyBpZGVudGlmaWVyIGZvciBjbmFtZSBvciBtaWRzLlxuLy8gVE9ETzogdXNlIFVVSURzIGluc3RlYWQ/IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL2plZC85ODI4ODNcblNEUFV0aWxzLmdlbmVyYXRlSWRlbnRpZmllciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDEwKTtcbn07XG5cbi8vIFRoZSBSVENQIENOQU1FIHVzZWQgYnkgYWxsIHBlZXJjb25uZWN0aW9ucyBmcm9tIHRoZSBzYW1lIEpTLlxuU0RQVXRpbHMubG9jYWxDTmFtZSA9IFNEUFV0aWxzLmdlbmVyYXRlSWRlbnRpZmllcigpO1xuXG4vLyBTcGxpdHMgU0RQIGludG8gbGluZXMsIGRlYWxpbmcgd2l0aCBib3RoIENSTEYgYW5kIExGLlxuU0RQVXRpbHMuc3BsaXRMaW5lcyA9IGZ1bmN0aW9uKGJsb2IpIHtcbiAgcmV0dXJuIGJsb2IudHJpbSgpLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgIHJldHVybiBsaW5lLnRyaW0oKTtcbiAgfSk7XG59O1xuLy8gU3BsaXRzIFNEUCBpbnRvIHNlc3Npb25wYXJ0IGFuZCBtZWRpYXNlY3Rpb25zLiBFbnN1cmVzIENSTEYuXG5TRFBVdGlscy5zcGxpdFNlY3Rpb25zID0gZnVuY3Rpb24oYmxvYikge1xuICB2YXIgcGFydHMgPSBibG9iLnNwbGl0KCdcXG5tPScpO1xuICByZXR1cm4gcGFydHMubWFwKGZ1bmN0aW9uKHBhcnQsIGluZGV4KSB7XG4gICAgcmV0dXJuIChpbmRleCA+IDAgPyAnbT0nICsgcGFydCA6IHBhcnQpLnRyaW0oKSArICdcXHJcXG4nO1xuICB9KTtcbn07XG5cbi8vIHJldHVybnMgdGhlIHNlc3Npb24gZGVzY3JpcHRpb24uXG5TRFBVdGlscy5nZXREZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKGJsb2IpIHtcbiAgdmFyIHNlY3Rpb25zID0gU0RQVXRpbHMuc3BsaXRTZWN0aW9ucyhibG9iKTtcbiAgcmV0dXJuIHNlY3Rpb25zICYmIHNlY3Rpb25zWzBdO1xufTtcblxuLy8gcmV0dXJucyB0aGUgaW5kaXZpZHVhbCBtZWRpYSBzZWN0aW9ucy5cblNEUFV0aWxzLmdldE1lZGlhU2VjdGlvbnMgPSBmdW5jdGlvbihibG9iKSB7XG4gIHZhciBzZWN0aW9ucyA9IFNEUFV0aWxzLnNwbGl0U2VjdGlvbnMoYmxvYik7XG4gIHNlY3Rpb25zLnNoaWZ0KCk7XG4gIHJldHVybiBzZWN0aW9ucztcbn07XG5cbi8vIFJldHVybnMgbGluZXMgdGhhdCBzdGFydCB3aXRoIGEgY2VydGFpbiBwcmVmaXguXG5TRFBVdGlscy5tYXRjaFByZWZpeCA9IGZ1bmN0aW9uKGJsb2IsIHByZWZpeCkge1xuICByZXR1cm4gU0RQVXRpbHMuc3BsaXRMaW5lcyhibG9iKS5maWx0ZXIoZnVuY3Rpb24obGluZSkge1xuICAgIHJldHVybiBsaW5lLmluZGV4T2YocHJlZml4KSA9PT0gMDtcbiAgfSk7XG59O1xuXG4vLyBQYXJzZXMgYW4gSUNFIGNhbmRpZGF0ZSBsaW5lLiBTYW1wbGUgaW5wdXQ6XG4vLyBjYW5kaWRhdGU6NzAyNzg2MzUwIDIgdWRwIDQxODE5OTAyIDguOC44LjggNjA3NjkgdHlwIHJlbGF5IHJhZGRyIDguOC44Ljhcbi8vIHJwb3J0IDU1OTk2XCJcblNEUFV0aWxzLnBhcnNlQ2FuZGlkYXRlID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFydHM7XG4gIC8vIFBhcnNlIGJvdGggdmFyaWFudHMuXG4gIGlmIChsaW5lLmluZGV4T2YoJ2E9Y2FuZGlkYXRlOicpID09PSAwKSB7XG4gICAgcGFydHMgPSBsaW5lLnN1YnN0cmluZygxMikuc3BsaXQoJyAnKTtcbiAgfSBlbHNlIHtcbiAgICBwYXJ0cyA9IGxpbmUuc3Vic3RyaW5nKDEwKS5zcGxpdCgnICcpO1xuICB9XG5cbiAgdmFyIGNhbmRpZGF0ZSA9IHtcbiAgICBmb3VuZGF0aW9uOiBwYXJ0c1swXSxcbiAgICBjb21wb25lbnQ6IHBhcnNlSW50KHBhcnRzWzFdLCAxMCksXG4gICAgcHJvdG9jb2w6IHBhcnRzWzJdLnRvTG93ZXJDYXNlKCksXG4gICAgcHJpb3JpdHk6IHBhcnNlSW50KHBhcnRzWzNdLCAxMCksXG4gICAgaXA6IHBhcnRzWzRdLFxuICAgIGFkZHJlc3M6IHBhcnRzWzRdLCAvLyBhZGRyZXNzIGlzIGFuIGFsaWFzIGZvciBpcC5cbiAgICBwb3J0OiBwYXJzZUludChwYXJ0c1s1XSwgMTApLFxuICAgIC8vIHNraXAgcGFydHNbNl0gPT0gJ3R5cCdcbiAgICB0eXBlOiBwYXJ0c1s3XVxuICB9O1xuXG4gIGZvciAodmFyIGkgPSA4OyBpIDwgcGFydHMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICBzd2l0Y2ggKHBhcnRzW2ldKSB7XG4gICAgICBjYXNlICdyYWRkcic6XG4gICAgICAgIGNhbmRpZGF0ZS5yZWxhdGVkQWRkcmVzcyA9IHBhcnRzW2kgKyAxXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdycG9ydCc6XG4gICAgICAgIGNhbmRpZGF0ZS5yZWxhdGVkUG9ydCA9IHBhcnNlSW50KHBhcnRzW2kgKyAxXSwgMTApO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3RjcHR5cGUnOlxuICAgICAgICBjYW5kaWRhdGUudGNwVHlwZSA9IHBhcnRzW2kgKyAxXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd1ZnJhZyc6XG4gICAgICAgIGNhbmRpZGF0ZS51ZnJhZyA9IHBhcnRzW2kgKyAxXTsgLy8gZm9yIGJhY2t3YXJkIGNvbXBhYmlsaXR5LlxuICAgICAgICBjYW5kaWRhdGUudXNlcm5hbWVGcmFnbWVudCA9IHBhcnRzW2kgKyAxXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OiAvLyBleHRlbnNpb24gaGFuZGxpbmcsIGluIHBhcnRpY3VsYXIgdWZyYWdcbiAgICAgICAgY2FuZGlkYXRlW3BhcnRzW2ldXSA9IHBhcnRzW2kgKyAxXTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiBjYW5kaWRhdGU7XG59O1xuXG4vLyBUcmFuc2xhdGVzIGEgY2FuZGlkYXRlIG9iamVjdCBpbnRvIFNEUCBjYW5kaWRhdGUgYXR0cmlidXRlLlxuU0RQVXRpbHMud3JpdGVDYW5kaWRhdGUgPSBmdW5jdGlvbihjYW5kaWRhdGUpIHtcbiAgdmFyIHNkcCA9IFtdO1xuICBzZHAucHVzaChjYW5kaWRhdGUuZm91bmRhdGlvbik7XG4gIHNkcC5wdXNoKGNhbmRpZGF0ZS5jb21wb25lbnQpO1xuICBzZHAucHVzaChjYW5kaWRhdGUucHJvdG9jb2wudG9VcHBlckNhc2UoKSk7XG4gIHNkcC5wdXNoKGNhbmRpZGF0ZS5wcmlvcml0eSk7XG4gIHNkcC5wdXNoKGNhbmRpZGF0ZS5hZGRyZXNzIHx8IGNhbmRpZGF0ZS5pcCk7XG4gIHNkcC5wdXNoKGNhbmRpZGF0ZS5wb3J0KTtcblxuICB2YXIgdHlwZSA9IGNhbmRpZGF0ZS50eXBlO1xuICBzZHAucHVzaCgndHlwJyk7XG4gIHNkcC5wdXNoKHR5cGUpO1xuICBpZiAodHlwZSAhPT0gJ2hvc3QnICYmIGNhbmRpZGF0ZS5yZWxhdGVkQWRkcmVzcyAmJlxuICAgICAgY2FuZGlkYXRlLnJlbGF0ZWRQb3J0KSB7XG4gICAgc2RwLnB1c2goJ3JhZGRyJyk7XG4gICAgc2RwLnB1c2goY2FuZGlkYXRlLnJlbGF0ZWRBZGRyZXNzKTtcbiAgICBzZHAucHVzaCgncnBvcnQnKTtcbiAgICBzZHAucHVzaChjYW5kaWRhdGUucmVsYXRlZFBvcnQpO1xuICB9XG4gIGlmIChjYW5kaWRhdGUudGNwVHlwZSAmJiBjYW5kaWRhdGUucHJvdG9jb2wudG9Mb3dlckNhc2UoKSA9PT0gJ3RjcCcpIHtcbiAgICBzZHAucHVzaCgndGNwdHlwZScpO1xuICAgIHNkcC5wdXNoKGNhbmRpZGF0ZS50Y3BUeXBlKTtcbiAgfVxuICBpZiAoY2FuZGlkYXRlLnVzZXJuYW1lRnJhZ21lbnQgfHwgY2FuZGlkYXRlLnVmcmFnKSB7XG4gICAgc2RwLnB1c2goJ3VmcmFnJyk7XG4gICAgc2RwLnB1c2goY2FuZGlkYXRlLnVzZXJuYW1lRnJhZ21lbnQgfHwgY2FuZGlkYXRlLnVmcmFnKTtcbiAgfVxuICByZXR1cm4gJ2NhbmRpZGF0ZTonICsgc2RwLmpvaW4oJyAnKTtcbn07XG5cbi8vIFBhcnNlcyBhbiBpY2Utb3B0aW9ucyBsaW5lLCByZXR1cm5zIGFuIGFycmF5IG9mIG9wdGlvbiB0YWdzLlxuLy8gYT1pY2Utb3B0aW9uczpmb28gYmFyXG5TRFBVdGlscy5wYXJzZUljZU9wdGlvbnMgPSBmdW5jdGlvbihsaW5lKSB7XG4gIHJldHVybiBsaW5lLnN1YnN0cigxNCkuc3BsaXQoJyAnKTtcbn07XG5cbi8vIFBhcnNlcyBhbiBydHBtYXAgbGluZSwgcmV0dXJucyBSVENSdHBDb2RkZWNQYXJhbWV0ZXJzLiBTYW1wbGUgaW5wdXQ6XG4vLyBhPXJ0cG1hcDoxMTEgb3B1cy80ODAwMC8yXG5TRFBVdGlscy5wYXJzZVJ0cE1hcCA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHIoOSkuc3BsaXQoJyAnKTtcbiAgdmFyIHBhcnNlZCA9IHtcbiAgICBwYXlsb2FkVHlwZTogcGFyc2VJbnQocGFydHMuc2hpZnQoKSwgMTApIC8vIHdhczogaWRcbiAgfTtcblxuICBwYXJ0cyA9IHBhcnRzWzBdLnNwbGl0KCcvJyk7XG5cbiAgcGFyc2VkLm5hbWUgPSBwYXJ0c1swXTtcbiAgcGFyc2VkLmNsb2NrUmF0ZSA9IHBhcnNlSW50KHBhcnRzWzFdLCAxMCk7IC8vIHdhczogY2xvY2tyYXRlXG4gIHBhcnNlZC5jaGFubmVscyA9IHBhcnRzLmxlbmd0aCA9PT0gMyA/IHBhcnNlSW50KHBhcnRzWzJdLCAxMCkgOiAxO1xuICAvLyBsZWdhY3kgYWxpYXMsIGdvdCByZW5hbWVkIGJhY2sgdG8gY2hhbm5lbHMgaW4gT1JUQy5cbiAgcGFyc2VkLm51bUNoYW5uZWxzID0gcGFyc2VkLmNoYW5uZWxzO1xuICByZXR1cm4gcGFyc2VkO1xufTtcblxuLy8gR2VuZXJhdGUgYW4gYT1ydHBtYXAgbGluZSBmcm9tIFJUQ1J0cENvZGVjQ2FwYWJpbGl0eSBvclxuLy8gUlRDUnRwQ29kZWNQYXJhbWV0ZXJzLlxuU0RQVXRpbHMud3JpdGVSdHBNYXAgPSBmdW5jdGlvbihjb2RlYykge1xuICB2YXIgcHQgPSBjb2RlYy5wYXlsb2FkVHlwZTtcbiAgaWYgKGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICBwdCA9IGNvZGVjLnByZWZlcnJlZFBheWxvYWRUeXBlO1xuICB9XG4gIHZhciBjaGFubmVscyA9IGNvZGVjLmNoYW5uZWxzIHx8IGNvZGVjLm51bUNoYW5uZWxzIHx8IDE7XG4gIHJldHVybiAnYT1ydHBtYXA6JyArIHB0ICsgJyAnICsgY29kZWMubmFtZSArICcvJyArIGNvZGVjLmNsb2NrUmF0ZSArXG4gICAgICAoY2hhbm5lbHMgIT09IDEgPyAnLycgKyBjaGFubmVscyA6ICcnKSArICdcXHJcXG4nO1xufTtcblxuLy8gUGFyc2VzIGFuIGE9ZXh0bWFwIGxpbmUgKGhlYWRlcmV4dGVuc2lvbiBmcm9tIFJGQyA1Mjg1KS4gU2FtcGxlIGlucHV0OlxuLy8gYT1leHRtYXA6MiB1cm46aWV0ZjpwYXJhbXM6cnRwLWhkcmV4dDp0b2Zmc2V0XG4vLyBhPWV4dG1hcDoyL3NlbmRvbmx5IHVybjppZXRmOnBhcmFtczpydHAtaGRyZXh0OnRvZmZzZXRcblNEUFV0aWxzLnBhcnNlRXh0bWFwID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cig5KS5zcGxpdCgnICcpO1xuICByZXR1cm4ge1xuICAgIGlkOiBwYXJzZUludChwYXJ0c1swXSwgMTApLFxuICAgIGRpcmVjdGlvbjogcGFydHNbMF0uaW5kZXhPZignLycpID4gMCA/IHBhcnRzWzBdLnNwbGl0KCcvJylbMV0gOiAnc2VuZHJlY3YnLFxuICAgIHVyaTogcGFydHNbMV1cbiAgfTtcbn07XG5cbi8vIEdlbmVyYXRlcyBhPWV4dG1hcCBsaW5lIGZyb20gUlRDUnRwSGVhZGVyRXh0ZW5zaW9uUGFyYW1ldGVycyBvclxuLy8gUlRDUnRwSGVhZGVyRXh0ZW5zaW9uLlxuU0RQVXRpbHMud3JpdGVFeHRtYXAgPSBmdW5jdGlvbihoZWFkZXJFeHRlbnNpb24pIHtcbiAgcmV0dXJuICdhPWV4dG1hcDonICsgKGhlYWRlckV4dGVuc2lvbi5pZCB8fCBoZWFkZXJFeHRlbnNpb24ucHJlZmVycmVkSWQpICtcbiAgICAgIChoZWFkZXJFeHRlbnNpb24uZGlyZWN0aW9uICYmIGhlYWRlckV4dGVuc2lvbi5kaXJlY3Rpb24gIT09ICdzZW5kcmVjdidcbiAgICAgICAgPyAnLycgKyBoZWFkZXJFeHRlbnNpb24uZGlyZWN0aW9uXG4gICAgICAgIDogJycpICtcbiAgICAgICcgJyArIGhlYWRlckV4dGVuc2lvbi51cmkgKyAnXFxyXFxuJztcbn07XG5cbi8vIFBhcnNlcyBhbiBmdG1wIGxpbmUsIHJldHVybnMgZGljdGlvbmFyeS4gU2FtcGxlIGlucHV0OlxuLy8gYT1mbXRwOjk2IHZicj1vbjtjbmc9b25cbi8vIEFsc28gZGVhbHMgd2l0aCB2YnI9b247IGNuZz1vblxuU0RQVXRpbHMucGFyc2VGbXRwID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFyc2VkID0ge307XG4gIHZhciBrdjtcbiAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHIobGluZS5pbmRleE9mKCcgJykgKyAxKS5zcGxpdCgnOycpO1xuICBmb3IgKHZhciBqID0gMDsgaiA8IHBhcnRzLmxlbmd0aDsgaisrKSB7XG4gICAga3YgPSBwYXJ0c1tqXS50cmltKCkuc3BsaXQoJz0nKTtcbiAgICBwYXJzZWRba3ZbMF0udHJpbSgpXSA9IGt2WzFdO1xuICB9XG4gIHJldHVybiBwYXJzZWQ7XG59O1xuXG4vLyBHZW5lcmF0ZXMgYW4gYT1mdG1wIGxpbmUgZnJvbSBSVENSdHBDb2RlY0NhcGFiaWxpdHkgb3IgUlRDUnRwQ29kZWNQYXJhbWV0ZXJzLlxuU0RQVXRpbHMud3JpdGVGbXRwID0gZnVuY3Rpb24oY29kZWMpIHtcbiAgdmFyIGxpbmUgPSAnJztcbiAgdmFyIHB0ID0gY29kZWMucGF5bG9hZFR5cGU7XG4gIGlmIChjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcHQgPSBjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZTtcbiAgfVxuICBpZiAoY29kZWMucGFyYW1ldGVycyAmJiBPYmplY3Qua2V5cyhjb2RlYy5wYXJhbWV0ZXJzKS5sZW5ndGgpIHtcbiAgICB2YXIgcGFyYW1zID0gW107XG4gICAgT2JqZWN0LmtleXMoY29kZWMucGFyYW1ldGVycykuZm9yRWFjaChmdW5jdGlvbihwYXJhbSkge1xuICAgICAgaWYgKGNvZGVjLnBhcmFtZXRlcnNbcGFyYW1dKSB7XG4gICAgICAgIHBhcmFtcy5wdXNoKHBhcmFtICsgJz0nICsgY29kZWMucGFyYW1ldGVyc1twYXJhbV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGxpbmUgKz0gJ2E9Zm10cDonICsgcHQgKyAnICcgKyBwYXJhbXMuam9pbignOycpICsgJ1xcclxcbic7XG4gIH1cbiAgcmV0dXJuIGxpbmU7XG59O1xuXG4vLyBQYXJzZXMgYW4gcnRjcC1mYiBsaW5lLCByZXR1cm5zIFJUQ1BSdGNwRmVlZGJhY2sgb2JqZWN0LiBTYW1wbGUgaW5wdXQ6XG4vLyBhPXJ0Y3AtZmI6OTggbmFjayBycHNpXG5TRFBVdGlscy5wYXJzZVJ0Y3BGYiA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHIobGluZS5pbmRleE9mKCcgJykgKyAxKS5zcGxpdCgnICcpO1xuICByZXR1cm4ge1xuICAgIHR5cGU6IHBhcnRzLnNoaWZ0KCksXG4gICAgcGFyYW1ldGVyOiBwYXJ0cy5qb2luKCcgJylcbiAgfTtcbn07XG4vLyBHZW5lcmF0ZSBhPXJ0Y3AtZmIgbGluZXMgZnJvbSBSVENSdHBDb2RlY0NhcGFiaWxpdHkgb3IgUlRDUnRwQ29kZWNQYXJhbWV0ZXJzLlxuU0RQVXRpbHMud3JpdGVSdGNwRmIgPSBmdW5jdGlvbihjb2RlYykge1xuICB2YXIgbGluZXMgPSAnJztcbiAgdmFyIHB0ID0gY29kZWMucGF5bG9hZFR5cGU7XG4gIGlmIChjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcHQgPSBjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZTtcbiAgfVxuICBpZiAoY29kZWMucnRjcEZlZWRiYWNrICYmIGNvZGVjLnJ0Y3BGZWVkYmFjay5sZW5ndGgpIHtcbiAgICAvLyBGSVhNRTogc3BlY2lhbCBoYW5kbGluZyBmb3IgdHJyLWludD9cbiAgICBjb2RlYy5ydGNwRmVlZGJhY2suZm9yRWFjaChmdW5jdGlvbihmYikge1xuICAgICAgbGluZXMgKz0gJ2E9cnRjcC1mYjonICsgcHQgKyAnICcgKyBmYi50eXBlICtcbiAgICAgIChmYi5wYXJhbWV0ZXIgJiYgZmIucGFyYW1ldGVyLmxlbmd0aCA/ICcgJyArIGZiLnBhcmFtZXRlciA6ICcnKSArXG4gICAgICAgICAgJ1xcclxcbic7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzO1xufTtcblxuLy8gUGFyc2VzIGFuIFJGQyA1NTc2IHNzcmMgbWVkaWEgYXR0cmlidXRlLiBTYW1wbGUgaW5wdXQ6XG4vLyBhPXNzcmM6MzczNTkyODU1OSBjbmFtZTpzb21ldGhpbmdcblNEUFV0aWxzLnBhcnNlU3NyY01lZGlhID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgc3AgPSBsaW5lLmluZGV4T2YoJyAnKTtcbiAgdmFyIHBhcnRzID0ge1xuICAgIHNzcmM6IHBhcnNlSW50KGxpbmUuc3Vic3RyKDcsIHNwIC0gNyksIDEwKVxuICB9O1xuICB2YXIgY29sb24gPSBsaW5lLmluZGV4T2YoJzonLCBzcCk7XG4gIGlmIChjb2xvbiA+IC0xKSB7XG4gICAgcGFydHMuYXR0cmlidXRlID0gbGluZS5zdWJzdHIoc3AgKyAxLCBjb2xvbiAtIHNwIC0gMSk7XG4gICAgcGFydHMudmFsdWUgPSBsaW5lLnN1YnN0cihjb2xvbiArIDEpO1xuICB9IGVsc2Uge1xuICAgIHBhcnRzLmF0dHJpYnV0ZSA9IGxpbmUuc3Vic3RyKHNwICsgMSk7XG4gIH1cbiAgcmV0dXJuIHBhcnRzO1xufTtcblxuU0RQVXRpbHMucGFyc2VTc3JjR3JvdXAgPSBmdW5jdGlvbihsaW5lKSB7XG4gIHZhciBwYXJ0cyA9IGxpbmUuc3Vic3RyKDEzKS5zcGxpdCgnICcpO1xuICByZXR1cm4ge1xuICAgIHNlbWFudGljczogcGFydHMuc2hpZnQoKSxcbiAgICBzc3JjczogcGFydHMubWFwKGZ1bmN0aW9uKHNzcmMpIHtcbiAgICAgIHJldHVybiBwYXJzZUludChzc3JjLCAxMCk7XG4gICAgfSlcbiAgfTtcbn07XG5cbi8vIEV4dHJhY3RzIHRoZSBNSUQgKFJGQyA1ODg4KSBmcm9tIGEgbWVkaWEgc2VjdGlvbi5cbi8vIHJldHVybnMgdGhlIE1JRCBvciB1bmRlZmluZWQgaWYgbm8gbWlkIGxpbmUgd2FzIGZvdW5kLlxuU0RQVXRpbHMuZ2V0TWlkID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uKSB7XG4gIHZhciBtaWQgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPW1pZDonKVswXTtcbiAgaWYgKG1pZCkge1xuICAgIHJldHVybiBtaWQuc3Vic3RyKDYpO1xuICB9XG59O1xuXG5TRFBVdGlscy5wYXJzZUZpbmdlcnByaW50ID0gZnVuY3Rpb24obGluZSkge1xuICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cigxNCkuc3BsaXQoJyAnKTtcbiAgcmV0dXJuIHtcbiAgICBhbGdvcml0aG06IHBhcnRzWzBdLnRvTG93ZXJDYXNlKCksIC8vIGFsZ29yaXRobSBpcyBjYXNlLXNlbnNpdGl2ZSBpbiBFZGdlLlxuICAgIHZhbHVlOiBwYXJ0c1sxXVxuICB9O1xufTtcblxuLy8gRXh0cmFjdHMgRFRMUyBwYXJhbWV0ZXJzIGZyb20gU0RQIG1lZGlhIHNlY3Rpb24gb3Igc2Vzc2lvbnBhcnQuXG4vLyBGSVhNRTogZm9yIGNvbnNpc3RlbmN5IHdpdGggb3RoZXIgZnVuY3Rpb25zIHRoaXMgc2hvdWxkIG9ubHlcbi8vICAgZ2V0IHRoZSBmaW5nZXJwcmludCBsaW5lIGFzIGlucHV0LiBTZWUgYWxzbyBnZXRJY2VQYXJhbWV0ZXJzLlxuU0RQVXRpbHMuZ2V0RHRsc1BhcmFtZXRlcnMgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24sIHNlc3Npb25wYXJ0KSB7XG4gIHZhciBsaW5lcyA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiArIHNlc3Npb25wYXJ0LFxuICAgICdhPWZpbmdlcnByaW50OicpO1xuICAvLyBOb3RlOiBhPXNldHVwIGxpbmUgaXMgaWdub3JlZCBzaW5jZSB3ZSB1c2UgdGhlICdhdXRvJyByb2xlLlxuICAvLyBOb3RlMjogJ2FsZ29yaXRobScgaXMgbm90IGNhc2Ugc2Vuc2l0aXZlIGV4Y2VwdCBpbiBFZGdlLlxuICByZXR1cm4ge1xuICAgIHJvbGU6ICdhdXRvJyxcbiAgICBmaW5nZXJwcmludHM6IGxpbmVzLm1hcChTRFBVdGlscy5wYXJzZUZpbmdlcnByaW50KVxuICB9O1xufTtcblxuLy8gU2VyaWFsaXplcyBEVExTIHBhcmFtZXRlcnMgdG8gU0RQLlxuU0RQVXRpbHMud3JpdGVEdGxzUGFyYW1ldGVycyA9IGZ1bmN0aW9uKHBhcmFtcywgc2V0dXBUeXBlKSB7XG4gIHZhciBzZHAgPSAnYT1zZXR1cDonICsgc2V0dXBUeXBlICsgJ1xcclxcbic7XG4gIHBhcmFtcy5maW5nZXJwcmludHMuZm9yRWFjaChmdW5jdGlvbihmcCkge1xuICAgIHNkcCArPSAnYT1maW5nZXJwcmludDonICsgZnAuYWxnb3JpdGhtICsgJyAnICsgZnAudmFsdWUgKyAnXFxyXFxuJztcbiAgfSk7XG4gIHJldHVybiBzZHA7XG59O1xuXG4vLyBQYXJzZXMgYT1jcnlwdG8gbGluZXMgaW50b1xuLy8gICBodHRwczovL3Jhd2dpdC5jb20vYWJvYmEvZWRnZXJ0Yy9tYXN0ZXIvbXNvcnRjLXJzNC5odG1sI2RpY3Rpb25hcnktcnRjc3J0cHNkZXNwYXJhbWV0ZXJzLW1lbWJlcnNcblNEUFV0aWxzLnBhcnNlQ3J5cHRvTGluZSA9IGZ1bmN0aW9uKGxpbmUpIHtcbiAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHIoOSkuc3BsaXQoJyAnKTtcbiAgcmV0dXJuIHtcbiAgICB0YWc6IHBhcnNlSW50KHBhcnRzWzBdLCAxMCksXG4gICAgY3J5cHRvU3VpdGU6IHBhcnRzWzFdLFxuICAgIGtleVBhcmFtczogcGFydHNbMl0sXG4gICAgc2Vzc2lvblBhcmFtczogcGFydHMuc2xpY2UoMyksXG4gIH07XG59O1xuXG5TRFBVdGlscy53cml0ZUNyeXB0b0xpbmUgPSBmdW5jdGlvbihwYXJhbWV0ZXJzKSB7XG4gIHJldHVybiAnYT1jcnlwdG86JyArIHBhcmFtZXRlcnMudGFnICsgJyAnICtcbiAgICBwYXJhbWV0ZXJzLmNyeXB0b1N1aXRlICsgJyAnICtcbiAgICAodHlwZW9mIHBhcmFtZXRlcnMua2V5UGFyYW1zID09PSAnb2JqZWN0J1xuICAgICAgPyBTRFBVdGlscy53cml0ZUNyeXB0b0tleVBhcmFtcyhwYXJhbWV0ZXJzLmtleVBhcmFtcylcbiAgICAgIDogcGFyYW1ldGVycy5rZXlQYXJhbXMpICtcbiAgICAocGFyYW1ldGVycy5zZXNzaW9uUGFyYW1zID8gJyAnICsgcGFyYW1ldGVycy5zZXNzaW9uUGFyYW1zLmpvaW4oJyAnKSA6ICcnKSArXG4gICAgJ1xcclxcbic7XG59O1xuXG4vLyBQYXJzZXMgdGhlIGNyeXB0byBrZXkgcGFyYW1ldGVycyBpbnRvXG4vLyAgIGh0dHBzOi8vcmF3Z2l0LmNvbS9hYm9iYS9lZGdlcnRjL21hc3Rlci9tc29ydGMtcnM0Lmh0bWwjcnRjc3J0cGtleXBhcmFtKlxuU0RQVXRpbHMucGFyc2VDcnlwdG9LZXlQYXJhbXMgPSBmdW5jdGlvbihrZXlQYXJhbXMpIHtcbiAgaWYgKGtleVBhcmFtcy5pbmRleE9mKCdpbmxpbmU6JykgIT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICB2YXIgcGFydHMgPSBrZXlQYXJhbXMuc3Vic3RyKDcpLnNwbGl0KCd8Jyk7XG4gIHJldHVybiB7XG4gICAga2V5TWV0aG9kOiAnaW5saW5lJyxcbiAgICBrZXlTYWx0OiBwYXJ0c1swXSxcbiAgICBsaWZlVGltZTogcGFydHNbMV0sXG4gICAgbWtpVmFsdWU6IHBhcnRzWzJdID8gcGFydHNbMl0uc3BsaXQoJzonKVswXSA6IHVuZGVmaW5lZCxcbiAgICBta2lMZW5ndGg6IHBhcnRzWzJdID8gcGFydHNbMl0uc3BsaXQoJzonKVsxXSA6IHVuZGVmaW5lZCxcbiAgfTtcbn07XG5cblNEUFV0aWxzLndyaXRlQ3J5cHRvS2V5UGFyYW1zID0gZnVuY3Rpb24oa2V5UGFyYW1zKSB7XG4gIHJldHVybiBrZXlQYXJhbXMua2V5TWV0aG9kICsgJzonXG4gICAgKyBrZXlQYXJhbXMua2V5U2FsdCArXG4gICAgKGtleVBhcmFtcy5saWZlVGltZSA/ICd8JyArIGtleVBhcmFtcy5saWZlVGltZSA6ICcnKSArXG4gICAgKGtleVBhcmFtcy5ta2lWYWx1ZSAmJiBrZXlQYXJhbXMubWtpTGVuZ3RoXG4gICAgICA/ICd8JyArIGtleVBhcmFtcy5ta2lWYWx1ZSArICc6JyArIGtleVBhcmFtcy5ta2lMZW5ndGhcbiAgICAgIDogJycpO1xufTtcblxuLy8gRXh0cmFjdHMgYWxsIFNERVMgcGFyYW10ZXJzLlxuU0RQVXRpbHMuZ2V0Q3J5cHRvUGFyYW1ldGVycyA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbiwgc2Vzc2lvbnBhcnQpIHtcbiAgdmFyIGxpbmVzID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uICsgc2Vzc2lvbnBhcnQsXG4gICAgJ2E9Y3J5cHRvOicpO1xuICByZXR1cm4gbGluZXMubWFwKFNEUFV0aWxzLnBhcnNlQ3J5cHRvTGluZSk7XG59O1xuXG4vLyBQYXJzZXMgSUNFIGluZm9ybWF0aW9uIGZyb20gU0RQIG1lZGlhIHNlY3Rpb24gb3Igc2Vzc2lvbnBhcnQuXG4vLyBGSVhNRTogZm9yIGNvbnNpc3RlbmN5IHdpdGggb3RoZXIgZnVuY3Rpb25zIHRoaXMgc2hvdWxkIG9ubHlcbi8vICAgZ2V0IHRoZSBpY2UtdWZyYWcgYW5kIGljZS1wd2QgbGluZXMgYXMgaW5wdXQuXG5TRFBVdGlscy5nZXRJY2VQYXJhbWV0ZXJzID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uLCBzZXNzaW9ucGFydCkge1xuICB2YXIgdWZyYWcgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24gKyBzZXNzaW9ucGFydCxcbiAgICAnYT1pY2UtdWZyYWc6JylbMF07XG4gIHZhciBwd2QgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24gKyBzZXNzaW9ucGFydCxcbiAgICAnYT1pY2UtcHdkOicpWzBdO1xuICBpZiAoISh1ZnJhZyAmJiBwd2QpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICB1c2VybmFtZUZyYWdtZW50OiB1ZnJhZy5zdWJzdHIoMTIpLFxuICAgIHBhc3N3b3JkOiBwd2Quc3Vic3RyKDEwKSxcbiAgfTtcbn07XG5cbi8vIFNlcmlhbGl6ZXMgSUNFIHBhcmFtZXRlcnMgdG8gU0RQLlxuU0RQVXRpbHMud3JpdGVJY2VQYXJhbWV0ZXJzID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gIHJldHVybiAnYT1pY2UtdWZyYWc6JyArIHBhcmFtcy51c2VybmFtZUZyYWdtZW50ICsgJ1xcclxcbicgK1xuICAgICAgJ2E9aWNlLXB3ZDonICsgcGFyYW1zLnBhc3N3b3JkICsgJ1xcclxcbic7XG59O1xuXG4vLyBQYXJzZXMgdGhlIFNEUCBtZWRpYSBzZWN0aW9uIGFuZCByZXR1cm5zIFJUQ1J0cFBhcmFtZXRlcnMuXG5TRFBVdGlscy5wYXJzZVJ0cFBhcmFtZXRlcnMgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24pIHtcbiAgdmFyIGRlc2NyaXB0aW9uID0ge1xuICAgIGNvZGVjczogW10sXG4gICAgaGVhZGVyRXh0ZW5zaW9uczogW10sXG4gICAgZmVjTWVjaGFuaXNtczogW10sXG4gICAgcnRjcDogW11cbiAgfTtcbiAgdmFyIGxpbmVzID0gU0RQVXRpbHMuc3BsaXRMaW5lcyhtZWRpYVNlY3Rpb24pO1xuICB2YXIgbWxpbmUgPSBsaW5lc1swXS5zcGxpdCgnICcpO1xuICBmb3IgKHZhciBpID0gMzsgaSA8IG1saW5lLmxlbmd0aDsgaSsrKSB7IC8vIGZpbmQgYWxsIGNvZGVjcyBmcm9tIG1saW5lWzMuLl1cbiAgICB2YXIgcHQgPSBtbGluZVtpXTtcbiAgICB2YXIgcnRwbWFwbGluZSA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KFxuICAgICAgbWVkaWFTZWN0aW9uLCAnYT1ydHBtYXA6JyArIHB0ICsgJyAnKVswXTtcbiAgICBpZiAocnRwbWFwbGluZSkge1xuICAgICAgdmFyIGNvZGVjID0gU0RQVXRpbHMucGFyc2VSdHBNYXAocnRwbWFwbGluZSk7XG4gICAgICB2YXIgZm10cHMgPSBTRFBVdGlscy5tYXRjaFByZWZpeChcbiAgICAgICAgbWVkaWFTZWN0aW9uLCAnYT1mbXRwOicgKyBwdCArICcgJyk7XG4gICAgICAvLyBPbmx5IHRoZSBmaXJzdCBhPWZtdHA6PHB0PiBpcyBjb25zaWRlcmVkLlxuICAgICAgY29kZWMucGFyYW1ldGVycyA9IGZtdHBzLmxlbmd0aCA/IFNEUFV0aWxzLnBhcnNlRm10cChmbXRwc1swXSkgOiB7fTtcbiAgICAgIGNvZGVjLnJ0Y3BGZWVkYmFjayA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KFxuICAgICAgICBtZWRpYVNlY3Rpb24sICdhPXJ0Y3AtZmI6JyArIHB0ICsgJyAnKVxuICAgICAgICAubWFwKFNEUFV0aWxzLnBhcnNlUnRjcEZiKTtcbiAgICAgIGRlc2NyaXB0aW9uLmNvZGVjcy5wdXNoKGNvZGVjKTtcbiAgICAgIC8vIHBhcnNlIEZFQyBtZWNoYW5pc21zIGZyb20gcnRwbWFwIGxpbmVzLlxuICAgICAgc3dpdGNoIChjb2RlYy5uYW1lLnRvVXBwZXJDYXNlKCkpIHtcbiAgICAgICAgY2FzZSAnUkVEJzpcbiAgICAgICAgY2FzZSAnVUxQRkVDJzpcbiAgICAgICAgICBkZXNjcmlwdGlvbi5mZWNNZWNoYW5pc21zLnB1c2goY29kZWMubmFtZS50b1VwcGVyQ2FzZSgpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDogLy8gb25seSBSRUQgYW5kIFVMUEZFQyBhcmUgcmVjb2duaXplZCBhcyBGRUMgbWVjaGFuaXNtcy5cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1leHRtYXA6JykuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgZGVzY3JpcHRpb24uaGVhZGVyRXh0ZW5zaW9ucy5wdXNoKFNEUFV0aWxzLnBhcnNlRXh0bWFwKGxpbmUpKTtcbiAgfSk7XG4gIC8vIEZJWE1FOiBwYXJzZSBydGNwLlxuICByZXR1cm4gZGVzY3JpcHRpb247XG59O1xuXG4vLyBHZW5lcmF0ZXMgcGFydHMgb2YgdGhlIFNEUCBtZWRpYSBzZWN0aW9uIGRlc2NyaWJpbmcgdGhlIGNhcGFiaWxpdGllcyAvXG4vLyBwYXJhbWV0ZXJzLlxuU0RQVXRpbHMud3JpdGVSdHBEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKGtpbmQsIGNhcHMpIHtcbiAgdmFyIHNkcCA9ICcnO1xuXG4gIC8vIEJ1aWxkIHRoZSBtbGluZS5cbiAgc2RwICs9ICdtPScgKyBraW5kICsgJyAnO1xuICBzZHAgKz0gY2Fwcy5jb2RlY3MubGVuZ3RoID4gMCA/ICc5JyA6ICcwJzsgLy8gcmVqZWN0IGlmIG5vIGNvZGVjcy5cbiAgc2RwICs9ICcgVURQL1RMUy9SVFAvU0FWUEYgJztcbiAgc2RwICs9IGNhcHMuY29kZWNzLm1hcChmdW5jdGlvbihjb2RlYykge1xuICAgIGlmIChjb2RlYy5wcmVmZXJyZWRQYXlsb2FkVHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gY29kZWMucHJlZmVycmVkUGF5bG9hZFR5cGU7XG4gICAgfVxuICAgIHJldHVybiBjb2RlYy5wYXlsb2FkVHlwZTtcbiAgfSkuam9pbignICcpICsgJ1xcclxcbic7XG5cbiAgc2RwICs9ICdjPUlOIElQNCAwLjAuMC4wXFxyXFxuJztcbiAgc2RwICs9ICdhPXJ0Y3A6OSBJTiBJUDQgMC4wLjAuMFxcclxcbic7XG5cbiAgLy8gQWRkIGE9cnRwbWFwIGxpbmVzIGZvciBlYWNoIGNvZGVjLiBBbHNvIGZtdHAgYW5kIHJ0Y3AtZmIuXG4gIGNhcHMuY29kZWNzLmZvckVhY2goZnVuY3Rpb24oY29kZWMpIHtcbiAgICBzZHAgKz0gU0RQVXRpbHMud3JpdGVSdHBNYXAoY29kZWMpO1xuICAgIHNkcCArPSBTRFBVdGlscy53cml0ZUZtdHAoY29kZWMpO1xuICAgIHNkcCArPSBTRFBVdGlscy53cml0ZVJ0Y3BGYihjb2RlYyk7XG4gIH0pO1xuICB2YXIgbWF4cHRpbWUgPSAwO1xuICBjYXBzLmNvZGVjcy5mb3JFYWNoKGZ1bmN0aW9uKGNvZGVjKSB7XG4gICAgaWYgKGNvZGVjLm1heHB0aW1lID4gbWF4cHRpbWUpIHtcbiAgICAgIG1heHB0aW1lID0gY29kZWMubWF4cHRpbWU7XG4gICAgfVxuICB9KTtcbiAgaWYgKG1heHB0aW1lID4gMCkge1xuICAgIHNkcCArPSAnYT1tYXhwdGltZTonICsgbWF4cHRpbWUgKyAnXFxyXFxuJztcbiAgfVxuICBzZHAgKz0gJ2E9cnRjcC1tdXhcXHJcXG4nO1xuXG4gIGlmIChjYXBzLmhlYWRlckV4dGVuc2lvbnMpIHtcbiAgICBjYXBzLmhlYWRlckV4dGVuc2lvbnMuZm9yRWFjaChmdW5jdGlvbihleHRlbnNpb24pIHtcbiAgICAgIHNkcCArPSBTRFBVdGlscy53cml0ZUV4dG1hcChleHRlbnNpb24pO1xuICAgIH0pO1xuICB9XG4gIC8vIEZJWE1FOiB3cml0ZSBmZWNNZWNoYW5pc21zLlxuICByZXR1cm4gc2RwO1xufTtcblxuLy8gUGFyc2VzIHRoZSBTRFAgbWVkaWEgc2VjdGlvbiBhbmQgcmV0dXJucyBhbiBhcnJheSBvZlxuLy8gUlRDUnRwRW5jb2RpbmdQYXJhbWV0ZXJzLlxuU0RQVXRpbHMucGFyc2VSdHBFbmNvZGluZ1BhcmFtZXRlcnMgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24pIHtcbiAgdmFyIGVuY29kaW5nUGFyYW1ldGVycyA9IFtdO1xuICB2YXIgZGVzY3JpcHRpb24gPSBTRFBVdGlscy5wYXJzZVJ0cFBhcmFtZXRlcnMobWVkaWFTZWN0aW9uKTtcbiAgdmFyIGhhc1JlZCA9IGRlc2NyaXB0aW9uLmZlY01lY2hhbmlzbXMuaW5kZXhPZignUkVEJykgIT09IC0xO1xuICB2YXIgaGFzVWxwZmVjID0gZGVzY3JpcHRpb24uZmVjTWVjaGFuaXNtcy5pbmRleE9mKCdVTFBGRUMnKSAhPT0gLTE7XG5cbiAgLy8gZmlsdGVyIGE9c3NyYzouLi4gY25hbWU6LCBpZ25vcmUgUGxhbkItbXNpZFxuICB2YXIgc3NyY3MgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXNzcmM6JylcbiAgICAubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHJldHVybiBTRFBVdGlscy5wYXJzZVNzcmNNZWRpYShsaW5lKTtcbiAgICB9KVxuICAgIC5maWx0ZXIoZnVuY3Rpb24ocGFydHMpIHtcbiAgICAgIHJldHVybiBwYXJ0cy5hdHRyaWJ1dGUgPT09ICdjbmFtZSc7XG4gICAgfSk7XG4gIHZhciBwcmltYXJ5U3NyYyA9IHNzcmNzLmxlbmd0aCA+IDAgJiYgc3NyY3NbMF0uc3NyYztcbiAgdmFyIHNlY29uZGFyeVNzcmM7XG5cbiAgdmFyIGZsb3dzID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1zc3JjLWdyb3VwOkZJRCcpXG4gICAgLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICB2YXIgcGFydHMgPSBsaW5lLnN1YnN0cigxNykuc3BsaXQoJyAnKTtcbiAgICAgIHJldHVybiBwYXJ0cy5tYXAoZnVuY3Rpb24ocGFydCkge1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQocGFydCwgMTApO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIGlmIChmbG93cy5sZW5ndGggPiAwICYmIGZsb3dzWzBdLmxlbmd0aCA+IDEgJiYgZmxvd3NbMF1bMF0gPT09IHByaW1hcnlTc3JjKSB7XG4gICAgc2Vjb25kYXJ5U3NyYyA9IGZsb3dzWzBdWzFdO1xuICB9XG5cbiAgZGVzY3JpcHRpb24uY29kZWNzLmZvckVhY2goZnVuY3Rpb24oY29kZWMpIHtcbiAgICBpZiAoY29kZWMubmFtZS50b1VwcGVyQ2FzZSgpID09PSAnUlRYJyAmJiBjb2RlYy5wYXJhbWV0ZXJzLmFwdCkge1xuICAgICAgdmFyIGVuY1BhcmFtID0ge1xuICAgICAgICBzc3JjOiBwcmltYXJ5U3NyYyxcbiAgICAgICAgY29kZWNQYXlsb2FkVHlwZTogcGFyc2VJbnQoY29kZWMucGFyYW1ldGVycy5hcHQsIDEwKVxuICAgICAgfTtcbiAgICAgIGlmIChwcmltYXJ5U3NyYyAmJiBzZWNvbmRhcnlTc3JjKSB7XG4gICAgICAgIGVuY1BhcmFtLnJ0eCA9IHtzc3JjOiBzZWNvbmRhcnlTc3JjfTtcbiAgICAgIH1cbiAgICAgIGVuY29kaW5nUGFyYW1ldGVycy5wdXNoKGVuY1BhcmFtKTtcbiAgICAgIGlmIChoYXNSZWQpIHtcbiAgICAgICAgZW5jUGFyYW0gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGVuY1BhcmFtKSk7XG4gICAgICAgIGVuY1BhcmFtLmZlYyA9IHtcbiAgICAgICAgICBzc3JjOiBwcmltYXJ5U3NyYyxcbiAgICAgICAgICBtZWNoYW5pc206IGhhc1VscGZlYyA/ICdyZWQrdWxwZmVjJyA6ICdyZWQnXG4gICAgICAgIH07XG4gICAgICAgIGVuY29kaW5nUGFyYW1ldGVycy5wdXNoKGVuY1BhcmFtKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBpZiAoZW5jb2RpbmdQYXJhbWV0ZXJzLmxlbmd0aCA9PT0gMCAmJiBwcmltYXJ5U3NyYykge1xuICAgIGVuY29kaW5nUGFyYW1ldGVycy5wdXNoKHtcbiAgICAgIHNzcmM6IHByaW1hcnlTc3JjXG4gICAgfSk7XG4gIH1cblxuICAvLyB3ZSBzdXBwb3J0IGJvdGggYj1BUyBhbmQgYj1USUFTIGJ1dCBpbnRlcnByZXQgQVMgYXMgVElBUy5cbiAgdmFyIGJhbmR3aWR0aCA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2I9Jyk7XG4gIGlmIChiYW5kd2lkdGgubGVuZ3RoKSB7XG4gICAgaWYgKGJhbmR3aWR0aFswXS5pbmRleE9mKCdiPVRJQVM6JykgPT09IDApIHtcbiAgICAgIGJhbmR3aWR0aCA9IHBhcnNlSW50KGJhbmR3aWR0aFswXS5zdWJzdHIoNyksIDEwKTtcbiAgICB9IGVsc2UgaWYgKGJhbmR3aWR0aFswXS5pbmRleE9mKCdiPUFTOicpID09PSAwKSB7XG4gICAgICAvLyB1c2UgZm9ybXVsYSBmcm9tIEpTRVAgdG8gY29udmVydCBiPUFTIHRvIFRJQVMgdmFsdWUuXG4gICAgICBiYW5kd2lkdGggPSBwYXJzZUludChiYW5kd2lkdGhbMF0uc3Vic3RyKDUpLCAxMCkgKiAxMDAwICogMC45NVxuICAgICAgICAgIC0gKDUwICogNDAgKiA4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYmFuZHdpZHRoID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBlbmNvZGluZ1BhcmFtZXRlcnMuZm9yRWFjaChmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgIHBhcmFtcy5tYXhCaXRyYXRlID0gYmFuZHdpZHRoO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBlbmNvZGluZ1BhcmFtZXRlcnM7XG59O1xuXG4vLyBwYXJzZXMgaHR0cDovL2RyYWZ0Lm9ydGMub3JnLyNydGNydGNwcGFyYW1ldGVycypcblNEUFV0aWxzLnBhcnNlUnRjcFBhcmFtZXRlcnMgPSBmdW5jdGlvbihtZWRpYVNlY3Rpb24pIHtcbiAgdmFyIHJ0Y3BQYXJhbWV0ZXJzID0ge307XG5cbiAgLy8gR2V0cyB0aGUgZmlyc3QgU1NSQy4gTm90ZSB0aGEgd2l0aCBSVFggdGhlcmUgbWlnaHQgYmUgbXVsdGlwbGVcbiAgLy8gU1NSQ3MuXG4gIHZhciByZW1vdGVTc3JjID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1zc3JjOicpXG4gICAgLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICByZXR1cm4gU0RQVXRpbHMucGFyc2VTc3JjTWVkaWEobGluZSk7XG4gICAgfSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iai5hdHRyaWJ1dGUgPT09ICdjbmFtZSc7XG4gICAgfSlbMF07XG4gIGlmIChyZW1vdGVTc3JjKSB7XG4gICAgcnRjcFBhcmFtZXRlcnMuY25hbWUgPSByZW1vdGVTc3JjLnZhbHVlO1xuICAgIHJ0Y3BQYXJhbWV0ZXJzLnNzcmMgPSByZW1vdGVTc3JjLnNzcmM7XG4gIH1cblxuICAvLyBFZGdlIHVzZXMgdGhlIGNvbXBvdW5kIGF0dHJpYnV0ZSBpbnN0ZWFkIG9mIHJlZHVjZWRTaXplXG4gIC8vIGNvbXBvdW5kIGlzICFyZWR1Y2VkU2l6ZVxuICB2YXIgcnNpemUgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXJ0Y3AtcnNpemUnKTtcbiAgcnRjcFBhcmFtZXRlcnMucmVkdWNlZFNpemUgPSByc2l6ZS5sZW5ndGggPiAwO1xuICBydGNwUGFyYW1ldGVycy5jb21wb3VuZCA9IHJzaXplLmxlbmd0aCA9PT0gMDtcblxuICAvLyBwYXJzZXMgdGhlIHJ0Y3AtbXV4IGF0dHLRlmJ1dGUuXG4gIC8vIE5vdGUgdGhhdCBFZGdlIGRvZXMgbm90IHN1cHBvcnQgdW5tdXhlZCBSVENQLlxuICB2YXIgbXV4ID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1ydGNwLW11eCcpO1xuICBydGNwUGFyYW1ldGVycy5tdXggPSBtdXgubGVuZ3RoID4gMDtcblxuICByZXR1cm4gcnRjcFBhcmFtZXRlcnM7XG59O1xuXG4vLyBwYXJzZXMgZWl0aGVyIGE9bXNpZDogb3IgYT1zc3JjOi4uLiBtc2lkIGxpbmVzIGFuZCByZXR1cm5zXG4vLyB0aGUgaWQgb2YgdGhlIE1lZGlhU3RyZWFtIGFuZCBNZWRpYVN0cmVhbVRyYWNrLlxuU0RQVXRpbHMucGFyc2VNc2lkID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uKSB7XG4gIHZhciBwYXJ0cztcbiAgdmFyIHNwZWMgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPW1zaWQ6Jyk7XG4gIGlmIChzcGVjLmxlbmd0aCA9PT0gMSkge1xuICAgIHBhcnRzID0gc3BlY1swXS5zdWJzdHIoNykuc3BsaXQoJyAnKTtcbiAgICByZXR1cm4ge3N0cmVhbTogcGFydHNbMF0sIHRyYWNrOiBwYXJ0c1sxXX07XG4gIH1cbiAgdmFyIHBsYW5CID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1zc3JjOicpXG4gICAgLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICByZXR1cm4gU0RQVXRpbHMucGFyc2VTc3JjTWVkaWEobGluZSk7XG4gICAgfSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKG1zaWRQYXJ0cykge1xuICAgICAgcmV0dXJuIG1zaWRQYXJ0cy5hdHRyaWJ1dGUgPT09ICdtc2lkJztcbiAgICB9KTtcbiAgaWYgKHBsYW5CLmxlbmd0aCA+IDApIHtcbiAgICBwYXJ0cyA9IHBsYW5CWzBdLnZhbHVlLnNwbGl0KCcgJyk7XG4gICAgcmV0dXJuIHtzdHJlYW06IHBhcnRzWzBdLCB0cmFjazogcGFydHNbMV19O1xuICB9XG59O1xuXG4vLyBTQ1RQXG4vLyBwYXJzZXMgZHJhZnQtaWV0Zi1tbXVzaWMtc2N0cC1zZHAtMjYgZmlyc3QgYW5kIGZhbGxzIGJhY2tcbi8vIHRvIGRyYWZ0LWlldGYtbW11c2ljLXNjdHAtc2RwLTA1XG5TRFBVdGlscy5wYXJzZVNjdHBEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbikge1xuICB2YXIgbWxpbmUgPSBTRFBVdGlscy5wYXJzZU1MaW5lKG1lZGlhU2VjdGlvbik7XG4gIHZhciBtYXhTaXplTGluZSA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9bWF4LW1lc3NhZ2Utc2l6ZTonKTtcbiAgdmFyIG1heE1lc3NhZ2VTaXplO1xuICBpZiAobWF4U2l6ZUxpbmUubGVuZ3RoID4gMCkge1xuICAgIG1heE1lc3NhZ2VTaXplID0gcGFyc2VJbnQobWF4U2l6ZUxpbmVbMF0uc3Vic3RyKDE5KSwgMTApO1xuICB9XG4gIGlmIChpc05hTihtYXhNZXNzYWdlU2l6ZSkpIHtcbiAgICBtYXhNZXNzYWdlU2l6ZSA9IDY1NTM2O1xuICB9XG4gIHZhciBzY3RwUG9ydCA9IFNEUFV0aWxzLm1hdGNoUHJlZml4KG1lZGlhU2VjdGlvbiwgJ2E9c2N0cC1wb3J0OicpO1xuICBpZiAoc2N0cFBvcnQubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBwb3J0OiBwYXJzZUludChzY3RwUG9ydFswXS5zdWJzdHIoMTIpLCAxMCksXG4gICAgICBwcm90b2NvbDogbWxpbmUuZm10LFxuICAgICAgbWF4TWVzc2FnZVNpemU6IG1heE1lc3NhZ2VTaXplXG4gICAgfTtcbiAgfVxuICB2YXIgc2N0cE1hcExpbmVzID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnYT1zY3RwbWFwOicpO1xuICBpZiAoc2N0cE1hcExpbmVzLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgcGFydHMgPSBTRFBVdGlscy5tYXRjaFByZWZpeChtZWRpYVNlY3Rpb24sICdhPXNjdHBtYXA6JylbMF1cbiAgICAgIC5zdWJzdHIoMTApXG4gICAgICAuc3BsaXQoJyAnKTtcbiAgICByZXR1cm4ge1xuICAgICAgcG9ydDogcGFyc2VJbnQocGFydHNbMF0sIDEwKSxcbiAgICAgIHByb3RvY29sOiBwYXJ0c1sxXSxcbiAgICAgIG1heE1lc3NhZ2VTaXplOiBtYXhNZXNzYWdlU2l6ZVxuICAgIH07XG4gIH1cbn07XG5cbi8vIFNDVFBcbi8vIG91dHB1dHMgdGhlIGRyYWZ0LWlldGYtbW11c2ljLXNjdHAtc2RwLTI2IHZlcnNpb24gdGhhdCBhbGwgYnJvd3NlcnNcbi8vIHN1cHBvcnQgYnkgbm93IHJlY2VpdmluZyBpbiB0aGlzIGZvcm1hdCwgdW5sZXNzIHdlIG9yaWdpbmFsbHkgcGFyc2VkXG4vLyBhcyB0aGUgZHJhZnQtaWV0Zi1tbXVzaWMtc2N0cC1zZHAtMDUgZm9ybWF0IChpbmRpY2F0ZWQgYnkgdGhlIG0tbGluZVxuLy8gcHJvdG9jb2wgb2YgRFRMUy9TQ1RQIC0tIHdpdGhvdXQgVURQLyBvciBUQ1AvKVxuU0RQVXRpbHMud3JpdGVTY3RwRGVzY3JpcHRpb24gPSBmdW5jdGlvbihtZWRpYSwgc2N0cCkge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGlmIChtZWRpYS5wcm90b2NvbCAhPT0gJ0RUTFMvU0NUUCcpIHtcbiAgICBvdXRwdXQgPSBbXG4gICAgICAnbT0nICsgbWVkaWEua2luZCArICcgOSAnICsgbWVkaWEucHJvdG9jb2wgKyAnICcgKyBzY3RwLnByb3RvY29sICsgJ1xcclxcbicsXG4gICAgICAnYz1JTiBJUDQgMC4wLjAuMFxcclxcbicsXG4gICAgICAnYT1zY3RwLXBvcnQ6JyArIHNjdHAucG9ydCArICdcXHJcXG4nXG4gICAgXTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBbXG4gICAgICAnbT0nICsgbWVkaWEua2luZCArICcgOSAnICsgbWVkaWEucHJvdG9jb2wgKyAnICcgKyBzY3RwLnBvcnQgKyAnXFxyXFxuJyxcbiAgICAgICdjPUlOIElQNCAwLjAuMC4wXFxyXFxuJyxcbiAgICAgICdhPXNjdHBtYXA6JyArIHNjdHAucG9ydCArICcgJyArIHNjdHAucHJvdG9jb2wgKyAnIDY1NTM1XFxyXFxuJ1xuICAgIF07XG4gIH1cbiAgaWYgKHNjdHAubWF4TWVzc2FnZVNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgIG91dHB1dC5wdXNoKCdhPW1heC1tZXNzYWdlLXNpemU6JyArIHNjdHAubWF4TWVzc2FnZVNpemUgKyAnXFxyXFxuJyk7XG4gIH1cbiAgcmV0dXJuIG91dHB1dC5qb2luKCcnKTtcbn07XG5cbi8vIEdlbmVyYXRlIGEgc2Vzc2lvbiBJRCBmb3IgU0RQLlxuLy8gaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL2RyYWZ0LWlldGYtcnRjd2ViLWpzZXAtMjAjc2VjdGlvbi01LjIuMVxuLy8gcmVjb21tZW5kcyB1c2luZyBhIGNyeXB0b2dyYXBoaWNhbGx5IHJhbmRvbSArdmUgNjQtYml0IHZhbHVlXG4vLyBidXQgcmlnaHQgbm93IHRoaXMgc2hvdWxkIGJlIGFjY2VwdGFibGUgYW5kIHdpdGhpbiB0aGUgcmlnaHQgcmFuZ2VcblNEUFV0aWxzLmdlbmVyYXRlU2Vzc2lvbklkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKCkuc3Vic3RyKDIsIDIxKTtcbn07XG5cbi8vIFdyaXRlIGJvaWxkZXIgcGxhdGUgZm9yIHN0YXJ0IG9mIFNEUFxuLy8gc2Vzc0lkIGFyZ3VtZW50IGlzIG9wdGlvbmFsIC0gaWYgbm90IHN1cHBsaWVkIGl0IHdpbGxcbi8vIGJlIGdlbmVyYXRlZCByYW5kb21seVxuLy8gc2Vzc1ZlcnNpb24gaXMgb3B0aW9uYWwgYW5kIGRlZmF1bHRzIHRvIDJcbi8vIHNlc3NVc2VyIGlzIG9wdGlvbmFsIGFuZCBkZWZhdWx0cyB0byAndGhpc2lzYWRhcHRlcm9ydGMnXG5TRFBVdGlscy53cml0ZVNlc3Npb25Cb2lsZXJwbGF0ZSA9IGZ1bmN0aW9uKHNlc3NJZCwgc2Vzc1Zlciwgc2Vzc1VzZXIpIHtcbiAgdmFyIHNlc3Npb25JZDtcbiAgdmFyIHZlcnNpb24gPSBzZXNzVmVyICE9PSB1bmRlZmluZWQgPyBzZXNzVmVyIDogMjtcbiAgaWYgKHNlc3NJZCkge1xuICAgIHNlc3Npb25JZCA9IHNlc3NJZDtcbiAgfSBlbHNlIHtcbiAgICBzZXNzaW9uSWQgPSBTRFBVdGlscy5nZW5lcmF0ZVNlc3Npb25JZCgpO1xuICB9XG4gIHZhciB1c2VyID0gc2Vzc1VzZXIgfHwgJ3RoaXNpc2FkYXB0ZXJvcnRjJztcbiAgLy8gRklYTUU6IHNlc3MtaWQgc2hvdWxkIGJlIGFuIE5UUCB0aW1lc3RhbXAuXG4gIHJldHVybiAndj0wXFxyXFxuJyArXG4gICAgICAnbz0nICsgdXNlciArICcgJyArIHNlc3Npb25JZCArICcgJyArIHZlcnNpb24gK1xuICAgICAgICAnIElOIElQNCAxMjcuMC4wLjFcXHJcXG4nICtcbiAgICAgICdzPS1cXHJcXG4nICtcbiAgICAgICd0PTAgMFxcclxcbic7XG59O1xuXG5TRFBVdGlscy53cml0ZU1lZGlhU2VjdGlvbiA9IGZ1bmN0aW9uKHRyYW5zY2VpdmVyLCBjYXBzLCB0eXBlLCBzdHJlYW0pIHtcbiAgdmFyIHNkcCA9IFNEUFV0aWxzLndyaXRlUnRwRGVzY3JpcHRpb24odHJhbnNjZWl2ZXIua2luZCwgY2Fwcyk7XG5cbiAgLy8gTWFwIElDRSBwYXJhbWV0ZXJzICh1ZnJhZywgcHdkKSB0byBTRFAuXG4gIHNkcCArPSBTRFBVdGlscy53cml0ZUljZVBhcmFtZXRlcnMoXG4gICAgdHJhbnNjZWl2ZXIuaWNlR2F0aGVyZXIuZ2V0TG9jYWxQYXJhbWV0ZXJzKCkpO1xuXG4gIC8vIE1hcCBEVExTIHBhcmFtZXRlcnMgdG8gU0RQLlxuICBzZHAgKz0gU0RQVXRpbHMud3JpdGVEdGxzUGFyYW1ldGVycyhcbiAgICB0cmFuc2NlaXZlci5kdGxzVHJhbnNwb3J0LmdldExvY2FsUGFyYW1ldGVycygpLFxuICAgIHR5cGUgPT09ICdvZmZlcicgPyAnYWN0cGFzcycgOiAnYWN0aXZlJyk7XG5cbiAgc2RwICs9ICdhPW1pZDonICsgdHJhbnNjZWl2ZXIubWlkICsgJ1xcclxcbic7XG5cbiAgaWYgKHRyYW5zY2VpdmVyLmRpcmVjdGlvbikge1xuICAgIHNkcCArPSAnYT0nICsgdHJhbnNjZWl2ZXIuZGlyZWN0aW9uICsgJ1xcclxcbic7XG4gIH0gZWxzZSBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyICYmIHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyKSB7XG4gICAgc2RwICs9ICdhPXNlbmRyZWN2XFxyXFxuJztcbiAgfSBlbHNlIGlmICh0cmFuc2NlaXZlci5ydHBTZW5kZXIpIHtcbiAgICBzZHAgKz0gJ2E9c2VuZG9ubHlcXHJcXG4nO1xuICB9IGVsc2UgaWYgKHRyYW5zY2VpdmVyLnJ0cFJlY2VpdmVyKSB7XG4gICAgc2RwICs9ICdhPXJlY3Zvbmx5XFxyXFxuJztcbiAgfSBlbHNlIHtcbiAgICBzZHAgKz0gJ2E9aW5hY3RpdmVcXHJcXG4nO1xuICB9XG5cbiAgaWYgKHRyYW5zY2VpdmVyLnJ0cFNlbmRlcikge1xuICAgIC8vIHNwZWMuXG4gICAgdmFyIG1zaWQgPSAnbXNpZDonICsgc3RyZWFtLmlkICsgJyAnICtcbiAgICAgICAgdHJhbnNjZWl2ZXIucnRwU2VuZGVyLnRyYWNrLmlkICsgJ1xcclxcbic7XG4gICAgc2RwICs9ICdhPScgKyBtc2lkO1xuXG4gICAgLy8gZm9yIENocm9tZS5cbiAgICBzZHAgKz0gJ2E9c3NyYzonICsgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5zc3JjICtcbiAgICAgICAgJyAnICsgbXNpZDtcbiAgICBpZiAodHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHgpIHtcbiAgICAgIHNkcCArPSAnYT1zc3JjOicgKyB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnJ0eC5zc3JjICtcbiAgICAgICAgICAnICcgKyBtc2lkO1xuICAgICAgc2RwICs9ICdhPXNzcmMtZ3JvdXA6RklEICcgK1xuICAgICAgICAgIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0uc3NyYyArICcgJyArXG4gICAgICAgICAgdHJhbnNjZWl2ZXIuc2VuZEVuY29kaW5nUGFyYW1ldGVyc1swXS5ydHguc3NyYyArXG4gICAgICAgICAgJ1xcclxcbic7XG4gICAgfVxuICB9XG4gIC8vIEZJWE1FOiB0aGlzIHNob3VsZCBiZSB3cml0dGVuIGJ5IHdyaXRlUnRwRGVzY3JpcHRpb24uXG4gIHNkcCArPSAnYT1zc3JjOicgKyB0cmFuc2NlaXZlci5zZW5kRW5jb2RpbmdQYXJhbWV0ZXJzWzBdLnNzcmMgK1xuICAgICAgJyBjbmFtZTonICsgU0RQVXRpbHMubG9jYWxDTmFtZSArICdcXHJcXG4nO1xuICBpZiAodHJhbnNjZWl2ZXIucnRwU2VuZGVyICYmIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4KSB7XG4gICAgc2RwICs9ICdhPXNzcmM6JyArIHRyYW5zY2VpdmVyLnNlbmRFbmNvZGluZ1BhcmFtZXRlcnNbMF0ucnR4LnNzcmMgK1xuICAgICAgICAnIGNuYW1lOicgKyBTRFBVdGlscy5sb2NhbENOYW1lICsgJ1xcclxcbic7XG4gIH1cbiAgcmV0dXJuIHNkcDtcbn07XG5cbi8vIEdldHMgdGhlIGRpcmVjdGlvbiBmcm9tIHRoZSBtZWRpYVNlY3Rpb24gb3IgdGhlIHNlc3Npb25wYXJ0LlxuU0RQVXRpbHMuZ2V0RGlyZWN0aW9uID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uLCBzZXNzaW9ucGFydCkge1xuICAvLyBMb29rIGZvciBzZW5kcmVjdiwgc2VuZG9ubHksIHJlY3Zvbmx5LCBpbmFjdGl2ZSwgZGVmYXVsdCB0byBzZW5kcmVjdi5cbiAgdmFyIGxpbmVzID0gU0RQVXRpbHMuc3BsaXRMaW5lcyhtZWRpYVNlY3Rpb24pO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgc3dpdGNoIChsaW5lc1tpXSkge1xuICAgICAgY2FzZSAnYT1zZW5kcmVjdic6XG4gICAgICBjYXNlICdhPXNlbmRvbmx5JzpcbiAgICAgIGNhc2UgJ2E9cmVjdm9ubHknOlxuICAgICAgY2FzZSAnYT1pbmFjdGl2ZSc6XG4gICAgICAgIHJldHVybiBsaW5lc1tpXS5zdWJzdHIoMik7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICAvLyBGSVhNRTogV2hhdCBzaG91bGQgaGFwcGVuIGhlcmU/XG4gICAgfVxuICB9XG4gIGlmIChzZXNzaW9ucGFydCkge1xuICAgIHJldHVybiBTRFBVdGlscy5nZXREaXJlY3Rpb24oc2Vzc2lvbnBhcnQpO1xuICB9XG4gIHJldHVybiAnc2VuZHJlY3YnO1xufTtcblxuU0RQVXRpbHMuZ2V0S2luZCA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbikge1xuICB2YXIgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKG1lZGlhU2VjdGlvbik7XG4gIHZhciBtbGluZSA9IGxpbmVzWzBdLnNwbGl0KCcgJyk7XG4gIHJldHVybiBtbGluZVswXS5zdWJzdHIoMik7XG59O1xuXG5TRFBVdGlscy5pc1JlamVjdGVkID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uKSB7XG4gIHJldHVybiBtZWRpYVNlY3Rpb24uc3BsaXQoJyAnLCAyKVsxXSA9PT0gJzAnO1xufTtcblxuU0RQVXRpbHMucGFyc2VNTGluZSA9IGZ1bmN0aW9uKG1lZGlhU2VjdGlvbikge1xuICB2YXIgbGluZXMgPSBTRFBVdGlscy5zcGxpdExpbmVzKG1lZGlhU2VjdGlvbik7XG4gIHZhciBwYXJ0cyA9IGxpbmVzWzBdLnN1YnN0cigyKS5zcGxpdCgnICcpO1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IHBhcnRzWzBdLFxuICAgIHBvcnQ6IHBhcnNlSW50KHBhcnRzWzFdLCAxMCksXG4gICAgcHJvdG9jb2w6IHBhcnRzWzJdLFxuICAgIGZtdDogcGFydHMuc2xpY2UoMykuam9pbignICcpXG4gIH07XG59O1xuXG5TRFBVdGlscy5wYXJzZU9MaW5lID0gZnVuY3Rpb24obWVkaWFTZWN0aW9uKSB7XG4gIHZhciBsaW5lID0gU0RQVXRpbHMubWF0Y2hQcmVmaXgobWVkaWFTZWN0aW9uLCAnbz0nKVswXTtcbiAgdmFyIHBhcnRzID0gbGluZS5zdWJzdHIoMikuc3BsaXQoJyAnKTtcbiAgcmV0dXJuIHtcbiAgICB1c2VybmFtZTogcGFydHNbMF0sXG4gICAgc2Vzc2lvbklkOiBwYXJ0c1sxXSxcbiAgICBzZXNzaW9uVmVyc2lvbjogcGFyc2VJbnQocGFydHNbMl0sIDEwKSxcbiAgICBuZXRUeXBlOiBwYXJ0c1szXSxcbiAgICBhZGRyZXNzVHlwZTogcGFydHNbNF0sXG4gICAgYWRkcmVzczogcGFydHNbNV1cbiAgfTtcbn07XG5cbi8vIGEgdmVyeSBuYWl2ZSBpbnRlcnByZXRhdGlvbiBvZiBhIHZhbGlkIFNEUC5cblNEUFV0aWxzLmlzVmFsaWRTRFAgPSBmdW5jdGlvbihibG9iKSB7XG4gIGlmICh0eXBlb2YgYmxvYiAhPT0gJ3N0cmluZycgfHwgYmxvYi5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIGxpbmVzID0gU0RQVXRpbHMuc3BsaXRMaW5lcyhibG9iKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChsaW5lc1tpXS5sZW5ndGggPCAyIHx8IGxpbmVzW2ldLmNoYXJBdCgxKSAhPT0gJz0nKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIFRPRE86IGNoZWNrIHRoZSBtb2RpZmllciBhIGJpdCBtb3JlLlxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gRXhwb3NlIHB1YmxpYyBtZXRob2RzLlxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gU0RQVXRpbHM7XG59XG4iLCIvKipcbiAqIENvbnZlcnQgYXJyYXkgb2YgMTYgYnl0ZSB2YWx1ZXMgdG8gVVVJRCBzdHJpbmcgZm9ybWF0IG9mIHRoZSBmb3JtOlxuICogWFhYWFhYWFgtWFhYWC1YWFhYLVhYWFgtWFhYWFhYWFhYWFhYXG4gKi9cbnZhciBieXRlVG9IZXggPSBbXTtcbmZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyArK2kpIHtcbiAgYnl0ZVRvSGV4W2ldID0gKGkgKyAweDEwMCkudG9TdHJpbmcoMTYpLnN1YnN0cigxKTtcbn1cblxuZnVuY3Rpb24gYnl0ZXNUb1V1aWQoYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBvZmZzZXQgfHwgMDtcbiAgdmFyIGJ0aCA9IGJ5dGVUb0hleDtcbiAgLy8gam9pbiB1c2VkIHRvIGZpeCBtZW1vcnkgaXNzdWUgY2F1c2VkIGJ5IGNvbmNhdGVuYXRpb246IGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMxNzUjYzRcbiAgcmV0dXJuIChbXG4gICAgYnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSxcbiAgICBidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG4gICAgYnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuICAgIGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcbiAgICBidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG4gICAgYnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSxcbiAgICBidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLFxuICAgIGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV1cbiAgXSkuam9pbignJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnl0ZXNUb1V1aWQ7XG4iLCIvLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgSW4gdGhlXG4vLyBicm93c2VyIHRoaXMgaXMgYSBsaXR0bGUgY29tcGxpY2F0ZWQgZHVlIHRvIHVua25vd24gcXVhbGl0eSBvZiBNYXRoLnJhbmRvbSgpXG4vLyBhbmQgaW5jb25zaXN0ZW50IHN1cHBvcnQgZm9yIHRoZSBgY3J5cHRvYCBBUEkuICBXZSBkbyB0aGUgYmVzdCB3ZSBjYW4gdmlhXG4vLyBmZWF0dXJlLWRldGVjdGlvblxuXG4vLyBnZXRSYW5kb21WYWx1ZXMgbmVlZHMgdG8gYmUgaW52b2tlZCBpbiBhIGNvbnRleHQgd2hlcmUgXCJ0aGlzXCIgaXMgYSBDcnlwdG9cbi8vIGltcGxlbWVudGF0aW9uLiBBbHNvLCBmaW5kIHRoZSBjb21wbGV0ZSBpbXBsZW1lbnRhdGlvbiBvZiBjcnlwdG8gb24gSUUxMS5cbnZhciBnZXRSYW5kb21WYWx1ZXMgPSAodHlwZW9mKGNyeXB0bykgIT0gJ3VuZGVmaW5lZCcgJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mKG1zQ3J5cHRvKSAhPSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93Lm1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcyA9PSAnZnVuY3Rpb24nICYmIG1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcy5iaW5kKG1zQ3J5cHRvKSk7XG5cbmlmIChnZXRSYW5kb21WYWx1ZXMpIHtcbiAgLy8gV0hBVFdHIGNyeXB0byBSTkcgLSBodHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvQ3J5cHRvXG4gIHZhciBybmRzOCA9IG5ldyBVaW50OEFycmF5KDE2KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZlxuXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2hhdHdnUk5HKCkge1xuICAgIGdldFJhbmRvbVZhbHVlcyhybmRzOCk7XG4gICAgcmV0dXJuIHJuZHM4O1xuICB9O1xufSBlbHNlIHtcbiAgLy8gTWF0aC5yYW5kb20oKS1iYXNlZCAoUk5HKVxuICAvL1xuICAvLyBJZiBhbGwgZWxzZSBmYWlscywgdXNlIE1hdGgucmFuZG9tKCkuICBJdCdzIGZhc3QsIGJ1dCBpcyBvZiB1bnNwZWNpZmllZFxuICAvLyBxdWFsaXR5LlxuICB2YXIgcm5kcyA9IG5ldyBBcnJheSgxNik7XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtYXRoUk5HKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgMTY7IGkrKykge1xuICAgICAgaWYgKChpICYgMHgwMykgPT09IDApIHIgPSBNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwMDA7XG4gICAgICBybmRzW2ldID0gciA+Pj4gKChpICYgMHgwMykgPDwgMykgJiAweGZmO1xuICAgIH1cblxuICAgIHJldHVybiBybmRzO1xuICB9O1xufVxuIiwidmFyIHJuZyA9IHJlcXVpcmUoJy4vbGliL3JuZycpO1xudmFyIGJ5dGVzVG9VdWlkID0gcmVxdWlyZSgnLi9saWIvYnl0ZXNUb1V1aWQnKTtcblxuZnVuY3Rpb24gdjQob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG5cbiAgaWYgKHR5cGVvZihvcHRpb25zKSA9PSAnc3RyaW5nJykge1xuICAgIGJ1ZiA9IG9wdGlvbnMgPT09ICdiaW5hcnknID8gbmV3IEFycmF5KDE2KSA6IG51bGw7XG4gICAgb3B0aW9ucyA9IG51bGw7XG4gIH1cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdmFyIHJuZHMgPSBvcHRpb25zLnJhbmRvbSB8fCAob3B0aW9ucy5ybmcgfHwgcm5nKSgpO1xuXG4gIC8vIFBlciA0LjQsIHNldCBiaXRzIGZvciB2ZXJzaW9uIGFuZCBgY2xvY2tfc2VxX2hpX2FuZF9yZXNlcnZlZGBcbiAgcm5kc1s2XSA9IChybmRzWzZdICYgMHgwZikgfCAweDQwO1xuICBybmRzWzhdID0gKHJuZHNbOF0gJiAweDNmKSB8IDB4ODA7XG5cbiAgLy8gQ29weSBieXRlcyB0byBidWZmZXIsIGlmIHByb3ZpZGVkXG4gIGlmIChidWYpIHtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgMTY7ICsraWkpIHtcbiAgICAgIGJ1ZltpICsgaWldID0gcm5kc1tpaV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZiB8fCBieXRlc1RvVXVpZChybmRzKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB2NDtcbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuLyogZXNsaW50LWVudiBub2RlICovXG5cbid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9hZGFwdGVyX2ZhY3RvcnkgPSByZXF1aXJlKCcuL2FkYXB0ZXJfZmFjdG9yeS5qcycpO1xuXG52YXIgYWRhcHRlciA9ICgwLCBfYWRhcHRlcl9mYWN0b3J5LmFkYXB0ZXJGYWN0b3J5KSh7IHdpbmRvdzogdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiB3aW5kb3cgfSk7XG5leHBvcnRzLmRlZmF1bHQgPSBhZGFwdGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5hZGFwdGVyRmFjdG9yeSA9IGFkYXB0ZXJGYWN0b3J5O1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgdXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfdXRpbHMpO1xuXG52YXIgX2Nocm9tZV9zaGltID0gcmVxdWlyZSgnLi9jaHJvbWUvY2hyb21lX3NoaW0nKTtcblxudmFyIGNocm9tZVNoaW0gPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfY2hyb21lX3NoaW0pO1xuXG52YXIgX2VkZ2Vfc2hpbSA9IHJlcXVpcmUoJy4vZWRnZS9lZGdlX3NoaW0nKTtcblxudmFyIGVkZ2VTaGltID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX2VkZ2Vfc2hpbSk7XG5cbnZhciBfZmlyZWZveF9zaGltID0gcmVxdWlyZSgnLi9maXJlZm94L2ZpcmVmb3hfc2hpbScpO1xuXG52YXIgZmlyZWZveFNoaW0gPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfZmlyZWZveF9zaGltKTtcblxudmFyIF9zYWZhcmlfc2hpbSA9IHJlcXVpcmUoJy4vc2FmYXJpL3NhZmFyaV9zaGltJyk7XG5cbnZhciBzYWZhcmlTaGltID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQoX3NhZmFyaV9zaGltKTtcblxudmFyIF9jb21tb25fc2hpbSA9IHJlcXVpcmUoJy4vY29tbW9uX3NoaW0nKTtcblxudmFyIGNvbW1vblNoaW0gPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfY29tbW9uX3NoaW0pO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG4vLyBTaGltbWluZyBzdGFydHMgaGVyZS5cbi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuZnVuY3Rpb24gYWRhcHRlckZhY3RvcnkoKSB7XG4gIHZhciBfcmVmID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiB7fSxcbiAgICAgIHdpbmRvdyA9IF9yZWYud2luZG93O1xuXG4gIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgJiYgYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiB7XG4gICAgc2hpbUNocm9tZTogdHJ1ZSxcbiAgICBzaGltRmlyZWZveDogdHJ1ZSxcbiAgICBzaGltRWRnZTogdHJ1ZSxcbiAgICBzaGltU2FmYXJpOiB0cnVlXG4gIH07XG5cbiAgLy8gVXRpbHMuXG4gIHZhciBsb2dnaW5nID0gdXRpbHMubG9nO1xuICB2YXIgYnJvd3NlckRldGFpbHMgPSB1dGlscy5kZXRlY3RCcm93c2VyKHdpbmRvdyk7XG5cbiAgdmFyIGFkYXB0ZXIgPSB7XG4gICAgYnJvd3NlckRldGFpbHM6IGJyb3dzZXJEZXRhaWxzLFxuICAgIGNvbW1vblNoaW06IGNvbW1vblNoaW0sXG4gICAgZXh0cmFjdFZlcnNpb246IHV0aWxzLmV4dHJhY3RWZXJzaW9uLFxuICAgIGRpc2FibGVMb2c6IHV0aWxzLmRpc2FibGVMb2csXG4gICAgZGlzYWJsZVdhcm5pbmdzOiB1dGlscy5kaXNhYmxlV2FybmluZ3NcbiAgfTtcblxuICAvLyBTaGltIGJyb3dzZXIgaWYgZm91bmQuXG4gIHN3aXRjaCAoYnJvd3NlckRldGFpbHMuYnJvd3Nlcikge1xuICAgIGNhc2UgJ2Nocm9tZSc6XG4gICAgICBpZiAoIWNocm9tZVNoaW0gfHwgIWNocm9tZVNoaW0uc2hpbVBlZXJDb25uZWN0aW9uIHx8ICFvcHRpb25zLnNoaW1DaHJvbWUpIHtcbiAgICAgICAgbG9nZ2luZygnQ2hyb21lIHNoaW0gaXMgbm90IGluY2x1ZGVkIGluIHRoaXMgYWRhcHRlciByZWxlYXNlLicpO1xuICAgICAgICByZXR1cm4gYWRhcHRlcjtcbiAgICAgIH1cbiAgICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uID09PSBudWxsKSB7XG4gICAgICAgIGxvZ2dpbmcoJ0Nocm9tZSBzaGltIGNhbiBub3QgZGV0ZXJtaW5lIHZlcnNpb24sIG5vdCBzaGltbWluZy4nKTtcbiAgICAgICAgcmV0dXJuIGFkYXB0ZXI7XG4gICAgICB9XG4gICAgICBsb2dnaW5nKCdhZGFwdGVyLmpzIHNoaW1taW5nIGNocm9tZS4nKTtcbiAgICAgIC8vIEV4cG9ydCB0byB0aGUgYWRhcHRlciBnbG9iYWwgb2JqZWN0IHZpc2libGUgaW4gdGhlIGJyb3dzZXIuXG4gICAgICBhZGFwdGVyLmJyb3dzZXJTaGltID0gY2hyb21lU2hpbTtcblxuICAgICAgY2hyb21lU2hpbS5zaGltR2V0VXNlck1lZGlhKHdpbmRvdyk7XG4gICAgICBjaHJvbWVTaGltLnNoaW1NZWRpYVN0cmVhbSh3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5zaGltUGVlckNvbm5lY3Rpb24od2luZG93KTtcbiAgICAgIGNocm9tZVNoaW0uc2hpbU9uVHJhY2sod2luZG93KTtcbiAgICAgIGNocm9tZVNoaW0uc2hpbUFkZFRyYWNrUmVtb3ZlVHJhY2sod2luZG93KTtcbiAgICAgIGNocm9tZVNoaW0uc2hpbUdldFNlbmRlcnNXaXRoRHRtZih3aW5kb3cpO1xuICAgICAgY2hyb21lU2hpbS5zaGltR2V0U3RhdHMod2luZG93KTtcbiAgICAgIGNocm9tZVNoaW0uc2hpbVNlbmRlclJlY2VpdmVyR2V0U3RhdHMod2luZG93KTtcbiAgICAgIGNocm9tZVNoaW0uZml4TmVnb3RpYXRpb25OZWVkZWQod2luZG93KTtcblxuICAgICAgY29tbW9uU2hpbS5zaGltUlRDSWNlQ2FuZGlkYXRlKHdpbmRvdyk7XG4gICAgICBjb21tb25TaGltLnNoaW1Db25uZWN0aW9uU3RhdGUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbU1heE1lc3NhZ2VTaXplKHdpbmRvdyk7XG4gICAgICBjb21tb25TaGltLnNoaW1TZW5kVGhyb3dUeXBlRXJyb3Iod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0ucmVtb3ZlQWxsb3dFeHRtYXBNaXhlZCh3aW5kb3cpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZmlyZWZveCc6XG4gICAgICBpZiAoIWZpcmVmb3hTaGltIHx8ICFmaXJlZm94U2hpbS5zaGltUGVlckNvbm5lY3Rpb24gfHwgIW9wdGlvbnMuc2hpbUZpcmVmb3gpIHtcbiAgICAgICAgbG9nZ2luZygnRmlyZWZveCBzaGltIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGlzIGFkYXB0ZXIgcmVsZWFzZS4nKTtcbiAgICAgICAgcmV0dXJuIGFkYXB0ZXI7XG4gICAgICB9XG4gICAgICBsb2dnaW5nKCdhZGFwdGVyLmpzIHNoaW1taW5nIGZpcmVmb3guJyk7XG4gICAgICAvLyBFeHBvcnQgdG8gdGhlIGFkYXB0ZXIgZ2xvYmFsIG9iamVjdCB2aXNpYmxlIGluIHRoZSBicm93c2VyLlxuICAgICAgYWRhcHRlci5icm93c2VyU2hpbSA9IGZpcmVmb3hTaGltO1xuXG4gICAgICBmaXJlZm94U2hpbS5zaGltR2V0VXNlck1lZGlhKHdpbmRvdyk7XG4gICAgICBmaXJlZm94U2hpbS5zaGltUGVlckNvbm5lY3Rpb24od2luZG93KTtcbiAgICAgIGZpcmVmb3hTaGltLnNoaW1PblRyYWNrKHdpbmRvdyk7XG4gICAgICBmaXJlZm94U2hpbS5zaGltUmVtb3ZlU3RyZWFtKHdpbmRvdyk7XG4gICAgICBmaXJlZm94U2hpbS5zaGltU2VuZGVyR2V0U3RhdHMod2luZG93KTtcbiAgICAgIGZpcmVmb3hTaGltLnNoaW1SZWNlaXZlckdldFN0YXRzKHdpbmRvdyk7XG4gICAgICBmaXJlZm94U2hpbS5zaGltUlRDRGF0YUNoYW5uZWwod2luZG93KTtcbiAgICAgIGZpcmVmb3hTaGltLnNoaW1BZGRUcmFuc2NlaXZlcih3aW5kb3cpO1xuICAgICAgZmlyZWZveFNoaW0uc2hpbUdldFBhcmFtZXRlcnMod2luZG93KTtcbiAgICAgIGZpcmVmb3hTaGltLnNoaW1DcmVhdGVPZmZlcih3aW5kb3cpO1xuICAgICAgZmlyZWZveFNoaW0uc2hpbUNyZWF0ZUFuc3dlcih3aW5kb3cpO1xuXG4gICAgICBjb21tb25TaGltLnNoaW1SVENJY2VDYW5kaWRhdGUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbUNvbm5lY3Rpb25TdGF0ZSh3aW5kb3cpO1xuICAgICAgY29tbW9uU2hpbS5zaGltTWF4TWVzc2FnZVNpemUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbVNlbmRUaHJvd1R5cGVFcnJvcih3aW5kb3cpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZWRnZSc6XG4gICAgICBpZiAoIWVkZ2VTaGltIHx8ICFlZGdlU2hpbS5zaGltUGVlckNvbm5lY3Rpb24gfHwgIW9wdGlvbnMuc2hpbUVkZ2UpIHtcbiAgICAgICAgbG9nZ2luZygnTVMgZWRnZSBzaGltIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGlzIGFkYXB0ZXIgcmVsZWFzZS4nKTtcbiAgICAgICAgcmV0dXJuIGFkYXB0ZXI7XG4gICAgICB9XG4gICAgICBsb2dnaW5nKCdhZGFwdGVyLmpzIHNoaW1taW5nIGVkZ2UuJyk7XG4gICAgICAvLyBFeHBvcnQgdG8gdGhlIGFkYXB0ZXIgZ2xvYmFsIG9iamVjdCB2aXNpYmxlIGluIHRoZSBicm93c2VyLlxuICAgICAgYWRhcHRlci5icm93c2VyU2hpbSA9IGVkZ2VTaGltO1xuXG4gICAgICBlZGdlU2hpbS5zaGltR2V0VXNlck1lZGlhKHdpbmRvdyk7XG4gICAgICBlZGdlU2hpbS5zaGltR2V0RGlzcGxheU1lZGlhKHdpbmRvdyk7XG4gICAgICBlZGdlU2hpbS5zaGltUGVlckNvbm5lY3Rpb24od2luZG93KTtcbiAgICAgIGVkZ2VTaGltLnNoaW1SZXBsYWNlVHJhY2sod2luZG93KTtcblxuICAgICAgLy8gdGhlIGVkZ2Ugc2hpbSBpbXBsZW1lbnRzIHRoZSBmdWxsIFJUQ0ljZUNhbmRpZGF0ZSBvYmplY3QuXG5cbiAgICAgIGNvbW1vblNoaW0uc2hpbU1heE1lc3NhZ2VTaXplKHdpbmRvdyk7XG4gICAgICBjb21tb25TaGltLnNoaW1TZW5kVGhyb3dUeXBlRXJyb3Iod2luZG93KTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3NhZmFyaSc6XG4gICAgICBpZiAoIXNhZmFyaVNoaW0gfHwgIW9wdGlvbnMuc2hpbVNhZmFyaSkge1xuICAgICAgICBsb2dnaW5nKCdTYWZhcmkgc2hpbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhpcyBhZGFwdGVyIHJlbGVhc2UuJyk7XG4gICAgICAgIHJldHVybiBhZGFwdGVyO1xuICAgICAgfVxuICAgICAgbG9nZ2luZygnYWRhcHRlci5qcyBzaGltbWluZyBzYWZhcmkuJyk7XG4gICAgICAvLyBFeHBvcnQgdG8gdGhlIGFkYXB0ZXIgZ2xvYmFsIG9iamVjdCB2aXNpYmxlIGluIHRoZSBicm93c2VyLlxuICAgICAgYWRhcHRlci5icm93c2VyU2hpbSA9IHNhZmFyaVNoaW07XG5cbiAgICAgIHNhZmFyaVNoaW0uc2hpbVJUQ0ljZVNlcnZlclVybHMod2luZG93KTtcbiAgICAgIHNhZmFyaVNoaW0uc2hpbUNyZWF0ZU9mZmVyTGVnYWN5KHdpbmRvdyk7XG4gICAgICBzYWZhcmlTaGltLnNoaW1DYWxsYmFja3NBUEkod2luZG93KTtcbiAgICAgIHNhZmFyaVNoaW0uc2hpbUxvY2FsU3RyZWFtc0FQSSh3aW5kb3cpO1xuICAgICAgc2FmYXJpU2hpbS5zaGltUmVtb3RlU3RyZWFtc0FQSSh3aW5kb3cpO1xuICAgICAgc2FmYXJpU2hpbS5zaGltVHJhY2tFdmVudFRyYW5zY2VpdmVyKHdpbmRvdyk7XG4gICAgICBzYWZhcmlTaGltLnNoaW1HZXRVc2VyTWVkaWEod2luZG93KTtcbiAgICAgIHNhZmFyaVNoaW0uc2hpbUF1ZGlvQ29udGV4dCh3aW5kb3cpO1xuXG4gICAgICBjb21tb25TaGltLnNoaW1SVENJY2VDYW5kaWRhdGUod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0uc2hpbU1heE1lc3NhZ2VTaXplKHdpbmRvdyk7XG4gICAgICBjb21tb25TaGltLnNoaW1TZW5kVGhyb3dUeXBlRXJyb3Iod2luZG93KTtcbiAgICAgIGNvbW1vblNoaW0ucmVtb3ZlQWxsb3dFeHRtYXBNaXhlZCh3aW5kb3cpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGxvZ2dpbmcoJ1Vuc3VwcG9ydGVkIGJyb3dzZXIhJyk7XG4gICAgICBicmVhaztcbiAgfVxuXG4gIHJldHVybiBhZGFwdGVyO1xufVxuXG4vLyBCcm93c2VyIHNoaW1zLlxuIiwiLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTYgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2hpbUdldERpc3BsYXlNZWRpYSA9IGV4cG9ydHMuc2hpbUdldFVzZXJNZWRpYSA9IHVuZGVmaW5lZDtcblxudmFyIF90eXBlb2YgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIiA/IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH0gOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9O1xuXG52YXIgX2dldHVzZXJtZWRpYSA9IHJlcXVpcmUoJy4vZ2V0dXNlcm1lZGlhJyk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnc2hpbUdldFVzZXJNZWRpYScsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIF9nZXR1c2VybWVkaWEuc2hpbUdldFVzZXJNZWRpYTtcbiAgfVxufSk7XG5cbnZhciBfZ2V0ZGlzcGxheW1lZGlhID0gcmVxdWlyZSgnLi9nZXRkaXNwbGF5bWVkaWEnKTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdzaGltR2V0RGlzcGxheU1lZGlhJywge1xuICBlbnVtZXJhYmxlOiB0cnVlLFxuICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICByZXR1cm4gX2dldGRpc3BsYXltZWRpYS5zaGltR2V0RGlzcGxheU1lZGlhO1xuICB9XG59KTtcbmV4cG9ydHMuc2hpbU1lZGlhU3RyZWFtID0gc2hpbU1lZGlhU3RyZWFtO1xuZXhwb3J0cy5zaGltT25UcmFjayA9IHNoaW1PblRyYWNrO1xuZXhwb3J0cy5zaGltR2V0U2VuZGVyc1dpdGhEdG1mID0gc2hpbUdldFNlbmRlcnNXaXRoRHRtZjtcbmV4cG9ydHMuc2hpbUdldFN0YXRzID0gc2hpbUdldFN0YXRzO1xuZXhwb3J0cy5zaGltU2VuZGVyUmVjZWl2ZXJHZXRTdGF0cyA9IHNoaW1TZW5kZXJSZWNlaXZlckdldFN0YXRzO1xuZXhwb3J0cy5zaGltQWRkVHJhY2tSZW1vdmVUcmFja1dpdGhOYXRpdmUgPSBzaGltQWRkVHJhY2tSZW1vdmVUcmFja1dpdGhOYXRpdmU7XG5leHBvcnRzLnNoaW1BZGRUcmFja1JlbW92ZVRyYWNrID0gc2hpbUFkZFRyYWNrUmVtb3ZlVHJhY2s7XG5leHBvcnRzLnNoaW1QZWVyQ29ubmVjdGlvbiA9IHNoaW1QZWVyQ29ubmVjdGlvbjtcbmV4cG9ydHMuZml4TmVnb3RpYXRpb25OZWVkZWQgPSBmaXhOZWdvdGlhdGlvbk5lZWRlZDtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbnZhciB1dGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF91dGlscyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbmZ1bmN0aW9uIHNoaW1NZWRpYVN0cmVhbSh3aW5kb3cpIHtcbiAgd2luZG93Lk1lZGlhU3RyZWFtID0gd2luZG93Lk1lZGlhU3RyZWFtIHx8IHdpbmRvdy53ZWJraXRNZWRpYVN0cmVhbTtcbn1cblxuZnVuY3Rpb24gc2hpbU9uVHJhY2sod2luZG93KSB7XG4gIGlmICgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgPT09ICdvYmplY3QnICYmIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJiAhKCdvbnRyYWNrJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlKSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLCAnb250cmFjaycsIHtcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb250cmFjaztcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uIHNldChmKSB7XG4gICAgICAgIGlmICh0aGlzLl9vbnRyYWNrKSB7XG4gICAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0cmFjaycsIHRoaXMuX29udHJhY2spO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndHJhY2snLCB0aGlzLl9vbnRyYWNrID0gZik7XG4gICAgICB9LFxuXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgdmFyIG9yaWdTZXRSZW1vdGVEZXNjcmlwdGlvbiA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb247XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIHNldFJlbW90ZURlc2NyaXB0aW9uKCkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgaWYgKCF0aGlzLl9vbnRyYWNrcG9seSkge1xuICAgICAgICB0aGlzLl9vbnRyYWNrcG9seSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgLy8gb25hZGRzdHJlYW0gZG9lcyBub3QgZmlyZSB3aGVuIGEgdHJhY2sgaXMgYWRkZWQgdG8gYW4gZXhpc3RpbmdcbiAgICAgICAgICAvLyBzdHJlYW0uIEJ1dCBzdHJlYW0ub25hZGR0cmFjayBpcyBpbXBsZW1lbnRlZCBzbyB3ZSB1c2UgdGhhdC5cbiAgICAgICAgICBlLnN0cmVhbS5hZGRFdmVudExpc3RlbmVyKCdhZGR0cmFjaycsIGZ1bmN0aW9uICh0ZSkge1xuICAgICAgICAgICAgdmFyIHJlY2VpdmVyID0gdm9pZCAwO1xuICAgICAgICAgICAgaWYgKHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0UmVjZWl2ZXJzKSB7XG4gICAgICAgICAgICAgIHJlY2VpdmVyID0gX3RoaXMuZ2V0UmVjZWl2ZXJzKCkuZmluZChmdW5jdGlvbiAocikge1xuICAgICAgICAgICAgICAgIHJldHVybiByLnRyYWNrICYmIHIudHJhY2suaWQgPT09IHRlLnRyYWNrLmlkO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlY2VpdmVyID0geyB0cmFjazogdGUudHJhY2sgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEV2ZW50KCd0cmFjaycpO1xuICAgICAgICAgICAgZXZlbnQudHJhY2sgPSB0ZS50cmFjaztcbiAgICAgICAgICAgIGV2ZW50LnJlY2VpdmVyID0gcmVjZWl2ZXI7XG4gICAgICAgICAgICBldmVudC50cmFuc2NlaXZlciA9IHsgcmVjZWl2ZXI6IHJlY2VpdmVyIH07XG4gICAgICAgICAgICBldmVudC5zdHJlYW1zID0gW2Uuc3RyZWFtXTtcbiAgICAgICAgICAgIF90aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGUuc3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICAgICAgICB2YXIgcmVjZWl2ZXIgPSB2b2lkIDA7XG4gICAgICAgICAgICBpZiAod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRSZWNlaXZlcnMpIHtcbiAgICAgICAgICAgICAgcmVjZWl2ZXIgPSBfdGhpcy5nZXRSZWNlaXZlcnMoKS5maW5kKGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHIudHJhY2sgJiYgci50cmFjay5pZCA9PT0gdHJhY2suaWQ7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVjZWl2ZXIgPSB7IHRyYWNrOiB0cmFjayB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEV2ZW50KCd0cmFjaycpO1xuICAgICAgICAgICAgZXZlbnQudHJhY2sgPSB0cmFjaztcbiAgICAgICAgICAgIGV2ZW50LnJlY2VpdmVyID0gcmVjZWl2ZXI7XG4gICAgICAgICAgICBldmVudC50cmFuc2NlaXZlciA9IHsgcmVjZWl2ZXI6IHJlY2VpdmVyIH07XG4gICAgICAgICAgICBldmVudC5zdHJlYW1zID0gW2Uuc3RyZWFtXTtcbiAgICAgICAgICAgIF90aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZHN0cmVhbScsIHRoaXMuX29udHJhY2twb2x5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcmlnU2V0UmVtb3RlRGVzY3JpcHRpb24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIC8vIGV2ZW4gaWYgUlRDUnRwVHJhbnNjZWl2ZXIgaXMgaW4gd2luZG93LCBpdCBpcyBvbmx5IHVzZWQgYW5kXG4gICAgLy8gZW1pdHRlZCBpbiB1bmlmaWVkLXBsYW4uIFVuZm9ydHVuYXRlbHkgdGhpcyBtZWFucyB3ZSBuZWVkXG4gICAgLy8gdG8gdW5jb25kaXRpb25hbGx5IHdyYXAgdGhlIGV2ZW50LlxuICAgIHV0aWxzLndyYXBQZWVyQ29ubmVjdGlvbkV2ZW50KHdpbmRvdywgJ3RyYWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgIGlmICghZS50cmFuc2NlaXZlcikge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgJ3RyYW5zY2VpdmVyJywgeyB2YWx1ZTogeyByZWNlaXZlcjogZS5yZWNlaXZlciB9IH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGU7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2hpbUdldFNlbmRlcnNXaXRoRHRtZih3aW5kb3cpIHtcbiAgLy8gT3ZlcnJpZGVzIGFkZFRyYWNrL3JlbW92ZVRyYWNrLCBkZXBlbmRzIG9uIHNoaW1BZGRUcmFja1JlbW92ZVRyYWNrLlxuICBpZiAoKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHdpbmRvdykpID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gJiYgISgnZ2V0U2VuZGVycycgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkgJiYgJ2NyZWF0ZURUTUZTZW5kZXInIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpIHtcbiAgICB2YXIgc2hpbVNlbmRlcldpdGhEdG1mID0gZnVuY3Rpb24gc2hpbVNlbmRlcldpdGhEdG1mKHBjLCB0cmFjaykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJhY2s6IHRyYWNrLFxuICAgICAgICBnZXQgZHRtZigpIHtcbiAgICAgICAgICBpZiAodGhpcy5fZHRtZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAodHJhY2sua2luZCA9PT0gJ2F1ZGlvJykge1xuICAgICAgICAgICAgICB0aGlzLl9kdG1mID0gcGMuY3JlYXRlRFRNRlNlbmRlcih0cmFjayk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLl9kdG1mID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2R0bWY7XG4gICAgICAgIH0sXG4gICAgICAgIF9wYzogcGNcbiAgICAgIH07XG4gICAgfTtcblxuICAgIC8vIGF1Z21lbnQgYWRkVHJhY2sgd2hlbiBnZXRTZW5kZXJzIGlzIG5vdCBhdmFpbGFibGUuXG4gICAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFNlbmRlcnMpIHtcbiAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U2VuZGVycyA9IGZ1bmN0aW9uIGdldFNlbmRlcnMoKSB7XG4gICAgICAgIHRoaXMuX3NlbmRlcnMgPSB0aGlzLl9zZW5kZXJzIHx8IFtdO1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VuZGVycy5zbGljZSgpOyAvLyByZXR1cm4gYSBjb3B5IG9mIHRoZSBpbnRlcm5hbCBzdGF0ZS5cbiAgICAgIH07XG4gICAgICB2YXIgb3JpZ0FkZFRyYWNrID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRUcmFjaztcbiAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2sgPSBmdW5jdGlvbiBhZGRUcmFjayh0cmFjaywgc3RyZWFtKSB7XG4gICAgICAgIHZhciBzZW5kZXIgPSBvcmlnQWRkVHJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKCFzZW5kZXIpIHtcbiAgICAgICAgICBzZW5kZXIgPSBzaGltU2VuZGVyV2l0aER0bWYodGhpcywgdHJhY2spO1xuICAgICAgICAgIHRoaXMuX3NlbmRlcnMucHVzaChzZW5kZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZW5kZXI7XG4gICAgICB9O1xuXG4gICAgICB2YXIgb3JpZ1JlbW92ZVRyYWNrID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVUcmFjaztcbiAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlVHJhY2sgPSBmdW5jdGlvbiByZW1vdmVUcmFjayhzZW5kZXIpIHtcbiAgICAgICAgb3JpZ1JlbW92ZVRyYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBpZHggPSB0aGlzLl9zZW5kZXJzLmluZGV4T2Yoc2VuZGVyKTtcbiAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHtcbiAgICAgICAgICB0aGlzLl9zZW5kZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgICB2YXIgb3JpZ0FkZFN0cmVhbSA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU3RyZWFtO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU3RyZWFtID0gZnVuY3Rpb24gYWRkU3RyZWFtKHN0cmVhbSkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHRoaXMuX3NlbmRlcnMgPSB0aGlzLl9zZW5kZXJzIHx8IFtdO1xuICAgICAgb3JpZ0FkZFN0cmVhbS5hcHBseSh0aGlzLCBbc3RyZWFtXSk7XG4gICAgICBzdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgX3RoaXMyLl9zZW5kZXJzLnB1c2goc2hpbVNlbmRlcldpdGhEdG1mKF90aGlzMiwgdHJhY2spKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgb3JpZ1JlbW92ZVN0cmVhbSA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlU3RyZWFtO1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlU3RyZWFtID0gZnVuY3Rpb24gcmVtb3ZlU3RyZWFtKHN0cmVhbSkge1xuICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgIHRoaXMuX3NlbmRlcnMgPSB0aGlzLl9zZW5kZXJzIHx8IFtdO1xuICAgICAgb3JpZ1JlbW92ZVN0cmVhbS5hcHBseSh0aGlzLCBbc3RyZWFtXSk7XG5cbiAgICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICB2YXIgc2VuZGVyID0gX3RoaXMzLl9zZW5kZXJzLmZpbmQoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICByZXR1cm4gcy50cmFjayA9PT0gdHJhY2s7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc2VuZGVyKSB7XG4gICAgICAgICAgLy8gcmVtb3ZlIHNlbmRlclxuICAgICAgICAgIF90aGlzMy5fc2VuZGVycy5zcGxpY2UoX3RoaXMzLl9zZW5kZXJzLmluZGV4T2Yoc2VuZGVyKSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHdpbmRvdykpID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gJiYgJ2dldFNlbmRlcnMnIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUgJiYgJ2NyZWF0ZURUTUZTZW5kZXInIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUgJiYgd2luZG93LlJUQ1J0cFNlbmRlciAmJiAhKCdkdG1mJyBpbiB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZSkpIHtcbiAgICB2YXIgb3JpZ0dldFNlbmRlcnMgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFNlbmRlcnM7XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTZW5kZXJzID0gZnVuY3Rpb24gZ2V0U2VuZGVycygpIHtcbiAgICAgIHZhciBfdGhpczQgPSB0aGlzO1xuXG4gICAgICB2YXIgc2VuZGVycyA9IG9yaWdHZXRTZW5kZXJzLmFwcGx5KHRoaXMsIFtdKTtcbiAgICAgIHNlbmRlcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VuZGVyKSB7XG4gICAgICAgIHJldHVybiBzZW5kZXIuX3BjID0gX3RoaXM0O1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gc2VuZGVycztcbiAgICB9O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlLCAnZHRtZicsIHtcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICBpZiAodGhpcy5fZHRtZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHRoaXMudHJhY2sua2luZCA9PT0gJ2F1ZGlvJykge1xuICAgICAgICAgICAgdGhpcy5fZHRtZiA9IHRoaXMuX3BjLmNyZWF0ZURUTUZTZW5kZXIodGhpcy50cmFjayk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2R0bWYgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZHRtZjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaGltR2V0U3RhdHMod2luZG93KSB7XG4gIGlmICghd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIG9yaWdHZXRTdGF0cyA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U3RhdHM7XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbiBnZXRTdGF0cygpIHtcbiAgICB2YXIgX3RoaXM1ID0gdGhpcztcblxuICAgIHZhciBfYXJndW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgICAgc2VsZWN0b3IgPSBfYXJndW1lbnRzWzBdLFxuICAgICAgICBvblN1Y2MgPSBfYXJndW1lbnRzWzFdLFxuICAgICAgICBvbkVyciA9IF9hcmd1bWVudHNbMl07XG5cbiAgICAvLyBJZiBzZWxlY3RvciBpcyBhIGZ1bmN0aW9uIHRoZW4gd2UgYXJlIGluIHRoZSBvbGQgc3R5bGUgc3RhdHMgc28ganVzdFxuICAgIC8vIHBhc3MgYmFjayB0aGUgb3JpZ2luYWwgZ2V0U3RhdHMgZm9ybWF0IHRvIGF2b2lkIGJyZWFraW5nIG9sZCB1c2Vycy5cblxuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIHR5cGVvZiBzZWxlY3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIG9yaWdHZXRTdGF0cy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIC8vIFdoZW4gc3BlYy1zdHlsZSBnZXRTdGF0cyBpcyBzdXBwb3J0ZWQsIHJldHVybiB0aG9zZSB3aGVuIGNhbGxlZCB3aXRoXG4gICAgLy8gZWl0aGVyIG5vIGFyZ3VtZW50cyBvciB0aGUgc2VsZWN0b3IgYXJndW1lbnQgaXMgbnVsbC5cbiAgICBpZiAob3JpZ0dldFN0YXRzLmxlbmd0aCA9PT0gMCAmJiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCB8fCB0eXBlb2Ygc2VsZWN0b3IgIT09ICdmdW5jdGlvbicpKSB7XG4gICAgICByZXR1cm4gb3JpZ0dldFN0YXRzLmFwcGx5KHRoaXMsIFtdKTtcbiAgICB9XG5cbiAgICB2YXIgZml4Q2hyb21lU3RhdHNfID0gZnVuY3Rpb24gZml4Q2hyb21lU3RhdHNfKHJlc3BvbnNlKSB7XG4gICAgICB2YXIgc3RhbmRhcmRSZXBvcnQgPSB7fTtcbiAgICAgIHZhciByZXBvcnRzID0gcmVzcG9uc2UucmVzdWx0KCk7XG4gICAgICByZXBvcnRzLmZvckVhY2goZnVuY3Rpb24gKHJlcG9ydCkge1xuICAgICAgICB2YXIgc3RhbmRhcmRTdGF0cyA9IHtcbiAgICAgICAgICBpZDogcmVwb3J0LmlkLFxuICAgICAgICAgIHRpbWVzdGFtcDogcmVwb3J0LnRpbWVzdGFtcCxcbiAgICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgICBsb2NhbGNhbmRpZGF0ZTogJ2xvY2FsLWNhbmRpZGF0ZScsXG4gICAgICAgICAgICByZW1vdGVjYW5kaWRhdGU6ICdyZW1vdGUtY2FuZGlkYXRlJ1xuICAgICAgICAgIH1bcmVwb3J0LnR5cGVdIHx8IHJlcG9ydC50eXBlXG4gICAgICAgIH07XG4gICAgICAgIHJlcG9ydC5uYW1lcygpLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICBzdGFuZGFyZFN0YXRzW25hbWVdID0gcmVwb3J0LnN0YXQobmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBzdGFuZGFyZFJlcG9ydFtzdGFuZGFyZFN0YXRzLmlkXSA9IHN0YW5kYXJkU3RhdHM7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHN0YW5kYXJkUmVwb3J0O1xuICAgIH07XG5cbiAgICAvLyBzaGltIGdldFN0YXRzIHdpdGggbWFwbGlrZSBzdXBwb3J0XG4gICAgdmFyIG1ha2VNYXBTdGF0cyA9IGZ1bmN0aW9uIG1ha2VNYXBTdGF0cyhzdGF0cykge1xuICAgICAgcmV0dXJuIG5ldyBNYXAoT2JqZWN0LmtleXMoc3RhdHMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBba2V5LCBzdGF0c1trZXldXTtcbiAgICAgIH0pKTtcbiAgICB9O1xuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMikge1xuICAgICAgdmFyIHN1Y2Nlc3NDYWxsYmFja1dyYXBwZXJfID0gZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrV3JhcHBlcl8ocmVzcG9uc2UpIHtcbiAgICAgICAgb25TdWNjKG1ha2VNYXBTdGF0cyhmaXhDaHJvbWVTdGF0c18ocmVzcG9uc2UpKSk7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gb3JpZ0dldFN0YXRzLmFwcGx5KHRoaXMsIFtzdWNjZXNzQ2FsbGJhY2tXcmFwcGVyXywgc2VsZWN0b3JdKTtcbiAgICB9XG5cbiAgICAvLyBwcm9taXNlLXN1cHBvcnRcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgb3JpZ0dldFN0YXRzLmFwcGx5KF90aGlzNSwgW2Z1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICByZXNvbHZlKG1ha2VNYXBTdGF0cyhmaXhDaHJvbWVTdGF0c18ocmVzcG9uc2UpKSk7XG4gICAgICB9LCByZWplY3RdKTtcbiAgICB9KS50aGVuKG9uU3VjYywgb25FcnIpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzaGltU2VuZGVyUmVjZWl2ZXJHZXRTdGF0cyh3aW5kb3cpIHtcbiAgaWYgKCEoKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHdpbmRvdykpID09PSAnb2JqZWN0JyAmJiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gJiYgd2luZG93LlJUQ1J0cFNlbmRlciAmJiB3aW5kb3cuUlRDUnRwUmVjZWl2ZXIpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gc2hpbSBzZW5kZXIgc3RhdHMuXG4gIGlmICghKCdnZXRTdGF0cycgaW4gd2luZG93LlJUQ1J0cFNlbmRlci5wcm90b3R5cGUpKSB7XG4gICAgdmFyIG9yaWdHZXRTZW5kZXJzID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTZW5kZXJzO1xuICAgIGlmIChvcmlnR2V0U2VuZGVycykge1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTZW5kZXJzID0gZnVuY3Rpb24gZ2V0U2VuZGVycygpIHtcbiAgICAgICAgdmFyIF90aGlzNiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHNlbmRlcnMgPSBvcmlnR2V0U2VuZGVycy5hcHBseSh0aGlzLCBbXSk7XG4gICAgICAgIHNlbmRlcnMuZm9yRWFjaChmdW5jdGlvbiAoc2VuZGVyKSB7XG4gICAgICAgICAgcmV0dXJuIHNlbmRlci5fcGMgPSBfdGhpczY7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc2VuZGVycztcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyIG9yaWdBZGRUcmFjayA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2s7XG4gICAgaWYgKG9yaWdBZGRUcmFjaykge1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRUcmFjayA9IGZ1bmN0aW9uIGFkZFRyYWNrKCkge1xuICAgICAgICB2YXIgc2VuZGVyID0gb3JpZ0FkZFRyYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHNlbmRlci5fcGMgPSB0aGlzO1xuICAgICAgICByZXR1cm4gc2VuZGVyO1xuICAgICAgfTtcbiAgICB9XG4gICAgd2luZG93LlJUQ1J0cFNlbmRlci5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbiBnZXRTdGF0cygpIHtcbiAgICAgIHZhciBzZW5kZXIgPSB0aGlzO1xuICAgICAgcmV0dXJuIHRoaXMuX3BjLmdldFN0YXRzKCkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgLyogTm90ZTogdGhpcyB3aWxsIGluY2x1ZGUgc3RhdHMgb2YgYWxsIHNlbmRlcnMgdGhhdFxuICAgICAgICAgICAqICAgc2VuZCBhIHRyYWNrIHdpdGggdGhlIHNhbWUgaWQgYXMgc2VuZGVyLnRyYWNrIGFzXG4gICAgICAgICAgICogICBpdCBpcyBub3QgcG9zc2libGUgdG8gaWRlbnRpZnkgdGhlIFJUQ1J0cFNlbmRlci5cbiAgICAgICAgICAgKi9cbiAgICAgICAgICB1dGlscy5maWx0ZXJTdGF0cyhyZXN1bHQsIHNlbmRlci50cmFjaywgdHJ1ZSlcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cblxuICAvLyBzaGltIHJlY2VpdmVyIHN0YXRzLlxuICBpZiAoISgnZ2V0U3RhdHMnIGluIHdpbmRvdy5SVENSdHBSZWNlaXZlci5wcm90b3R5cGUpKSB7XG4gICAgdmFyIG9yaWdHZXRSZWNlaXZlcnMgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFJlY2VpdmVycztcbiAgICBpZiAob3JpZ0dldFJlY2VpdmVycykge1xuICAgICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRSZWNlaXZlcnMgPSBmdW5jdGlvbiBnZXRSZWNlaXZlcnMoKSB7XG4gICAgICAgIHZhciBfdGhpczcgPSB0aGlzO1xuXG4gICAgICAgIHZhciByZWNlaXZlcnMgPSBvcmlnR2V0UmVjZWl2ZXJzLmFwcGx5KHRoaXMsIFtdKTtcbiAgICAgICAgcmVjZWl2ZXJzLmZvckVhY2goZnVuY3Rpb24gKHJlY2VpdmVyKSB7XG4gICAgICAgICAgcmV0dXJuIHJlY2VpdmVyLl9wYyA9IF90aGlzNztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZWNlaXZlcnM7XG4gICAgICB9O1xuICAgIH1cbiAgICB1dGlscy53cmFwUGVlckNvbm5lY3Rpb25FdmVudCh3aW5kb3csICd0cmFjaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICBlLnJlY2VpdmVyLl9wYyA9IGUuc3JjRWxlbWVudDtcbiAgICAgIHJldHVybiBlO1xuICAgIH0pO1xuICAgIHdpbmRvdy5SVENSdHBSZWNlaXZlci5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbiBnZXRTdGF0cygpIHtcbiAgICAgIHZhciByZWNlaXZlciA9IHRoaXM7XG4gICAgICByZXR1cm4gdGhpcy5fcGMuZ2V0U3RhdHMoKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIHV0aWxzLmZpbHRlclN0YXRzKHJlc3VsdCwgcmVjZWl2ZXIudHJhY2ssIGZhbHNlKTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cblxuICBpZiAoISgnZ2V0U3RhdHMnIGluIHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlICYmICdnZXRTdGF0cycgaW4gd2luZG93LlJUQ1J0cFJlY2VpdmVyLnByb3RvdHlwZSkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBzaGltIFJUQ1BlZXJDb25uZWN0aW9uLmdldFN0YXRzKHRyYWNrKS5cbiAgdmFyIG9yaWdHZXRTdGF0cyA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U3RhdHM7XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbiBnZXRTdGF0cygpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdIGluc3RhbmNlb2Ygd2luZG93Lk1lZGlhU3RyZWFtVHJhY2spIHtcbiAgICAgIHZhciB0cmFjayA9IGFyZ3VtZW50c1swXTtcbiAgICAgIHZhciBzZW5kZXIgPSB2b2lkIDA7XG4gICAgICB2YXIgcmVjZWl2ZXIgPSB2b2lkIDA7XG4gICAgICB2YXIgZXJyID0gdm9pZCAwO1xuICAgICAgdGhpcy5nZXRTZW5kZXJzKCkuZm9yRWFjaChmdW5jdGlvbiAocykge1xuICAgICAgICBpZiAocy50cmFjayA9PT0gdHJhY2spIHtcbiAgICAgICAgICBpZiAoc2VuZGVyKSB7XG4gICAgICAgICAgICBlcnIgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZW5kZXIgPSBzO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB0aGlzLmdldFJlY2VpdmVycygpLmZvckVhY2goZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgaWYgKHIudHJhY2sgPT09IHRyYWNrKSB7XG4gICAgICAgICAgaWYgKHJlY2VpdmVyKSB7XG4gICAgICAgICAgICBlcnIgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWNlaXZlciA9IHI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByLnRyYWNrID09PSB0cmFjaztcbiAgICAgIH0pO1xuICAgICAgaWYgKGVyciB8fCBzZW5kZXIgJiYgcmVjZWl2ZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBET01FeGNlcHRpb24oJ1RoZXJlIGFyZSBtb3JlIHRoYW4gb25lIHNlbmRlciBvciByZWNlaXZlciBmb3IgdGhlIHRyYWNrLicsICdJbnZhbGlkQWNjZXNzRXJyb3InKSk7XG4gICAgICB9IGVsc2UgaWYgKHNlbmRlcikge1xuICAgICAgICByZXR1cm4gc2VuZGVyLmdldFN0YXRzKCk7XG4gICAgICB9IGVsc2UgaWYgKHJlY2VpdmVyKSB7XG4gICAgICAgIHJldHVybiByZWNlaXZlci5nZXRTdGF0cygpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBET01FeGNlcHRpb24oJ1RoZXJlIGlzIG5vIHNlbmRlciBvciByZWNlaXZlciBmb3IgdGhlIHRyYWNrLicsICdJbnZhbGlkQWNjZXNzRXJyb3InKSk7XG4gICAgfVxuICAgIHJldHVybiBvcmlnR2V0U3RhdHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2hpbUFkZFRyYWNrUmVtb3ZlVHJhY2tXaXRoTmF0aXZlKHdpbmRvdykge1xuICAvLyBzaGltIGFkZFRyYWNrL3JlbW92ZVRyYWNrIHdpdGggbmF0aXZlIHZhcmlhbnRzIGluIG9yZGVyIHRvIG1ha2VcbiAgLy8gdGhlIGludGVyYWN0aW9ucyB3aXRoIGxlZ2FjeSBnZXRMb2NhbFN0cmVhbXMgYmVoYXZlIGFzIGluIG90aGVyIGJyb3dzZXJzLlxuICAvLyBLZWVwcyBhIG1hcHBpbmcgc3RyZWFtLmlkID0+IFtzdHJlYW0sIHJ0cHNlbmRlcnMuLi5dXG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0TG9jYWxTdHJlYW1zID0gZnVuY3Rpb24gZ2V0TG9jYWxTdHJlYW1zKCkge1xuICAgIHZhciBfdGhpczggPSB0aGlzO1xuXG4gICAgdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcyA9IHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMgfHwge307XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMpLm1hcChmdW5jdGlvbiAoc3RyZWFtSWQpIHtcbiAgICAgIHJldHVybiBfdGhpczguX3NoaW1tZWRMb2NhbFN0cmVhbXNbc3RyZWFtSWRdWzBdO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBvcmlnQWRkVHJhY2sgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrID0gZnVuY3Rpb24gYWRkVHJhY2sodHJhY2ssIHN0cmVhbSkge1xuICAgIGlmICghc3RyZWFtKSB7XG4gICAgICByZXR1cm4gb3JpZ0FkZFRyYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMgPSB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zIHx8IHt9O1xuXG4gICAgdmFyIHNlbmRlciA9IG9yaWdBZGRUcmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICghdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW0uaWRdKSB7XG4gICAgICB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zW3N0cmVhbS5pZF0gPSBbc3RyZWFtLCBzZW5kZXJdO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW0uaWRdLmluZGV4T2Yoc2VuZGVyKSA9PT0gLTEpIHtcbiAgICAgIHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXNbc3RyZWFtLmlkXS5wdXNoKHNlbmRlcik7XG4gICAgfVxuICAgIHJldHVybiBzZW5kZXI7XG4gIH07XG5cbiAgdmFyIG9yaWdBZGRTdHJlYW0gPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbTtcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRTdHJlYW0gPSBmdW5jdGlvbiBhZGRTdHJlYW0oc3RyZWFtKSB7XG4gICAgdmFyIF90aGlzOSA9IHRoaXM7XG5cbiAgICB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zID0gdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtcyB8fCB7fTtcblxuICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgdmFyIGFscmVhZHlFeGlzdHMgPSBfdGhpczkuZ2V0U2VuZGVycygpLmZpbmQoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHMudHJhY2sgPT09IHRyYWNrO1xuICAgICAgfSk7XG4gICAgICBpZiAoYWxyZWFkeUV4aXN0cykge1xuICAgICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdUcmFjayBhbHJlYWR5IGV4aXN0cy4nLCAnSW52YWxpZEFjY2Vzc0Vycm9yJyk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdmFyIGV4aXN0aW5nU2VuZGVycyA9IHRoaXMuZ2V0U2VuZGVycygpO1xuICAgIG9yaWdBZGRTdHJlYW0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB2YXIgbmV3U2VuZGVycyA9IHRoaXMuZ2V0U2VuZGVycygpLmZpbHRlcihmdW5jdGlvbiAobmV3U2VuZGVyKSB7XG4gICAgICByZXR1cm4gZXhpc3RpbmdTZW5kZXJzLmluZGV4T2YobmV3U2VuZGVyKSA9PT0gLTE7XG4gICAgfSk7XG4gICAgdGhpcy5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW0uaWRdID0gW3N0cmVhbV0uY29uY2F0KG5ld1NlbmRlcnMpO1xuICB9O1xuXG4gIHZhciBvcmlnUmVtb3ZlU3RyZWFtID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW07XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUucmVtb3ZlU3RyZWFtID0gZnVuY3Rpb24gcmVtb3ZlU3RyZWFtKHN0cmVhbSkge1xuICAgIHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMgPSB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zIHx8IHt9O1xuICAgIGRlbGV0ZSB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zW3N0cmVhbS5pZF07XG4gICAgcmV0dXJuIG9yaWdSZW1vdmVTdHJlYW0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcblxuICB2YXIgb3JpZ1JlbW92ZVRyYWNrID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVUcmFjaztcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVUcmFjayA9IGZ1bmN0aW9uIHJlbW92ZVRyYWNrKHNlbmRlcikge1xuICAgIHZhciBfdGhpczEwID0gdGhpcztcblxuICAgIHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMgPSB0aGlzLl9zaGltbWVkTG9jYWxTdHJlYW1zIHx8IHt9O1xuICAgIGlmIChzZW5kZXIpIHtcbiAgICAgIE9iamVjdC5rZXlzKHRoaXMuX3NoaW1tZWRMb2NhbFN0cmVhbXMpLmZvckVhY2goZnVuY3Rpb24gKHN0cmVhbUlkKSB7XG4gICAgICAgIHZhciBpZHggPSBfdGhpczEwLl9zaGltbWVkTG9jYWxTdHJlYW1zW3N0cmVhbUlkXS5pbmRleE9mKHNlbmRlcik7XG4gICAgICAgIGlmIChpZHggIT09IC0xKSB7XG4gICAgICAgICAgX3RoaXMxMC5fc2hpbW1lZExvY2FsU3RyZWFtc1tzdHJlYW1JZF0uc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF90aGlzMTAuX3NoaW1tZWRMb2NhbFN0cmVhbXNbc3RyZWFtSWRdLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIGRlbGV0ZSBfdGhpczEwLl9zaGltbWVkTG9jYWxTdHJlYW1zW3N0cmVhbUlkXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBvcmlnUmVtb3ZlVHJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2hpbUFkZFRyYWNrUmVtb3ZlVHJhY2sod2luZG93KSB7XG4gIGlmICghd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBicm93c2VyRGV0YWlscyA9IHV0aWxzLmRldGVjdEJyb3dzZXIod2luZG93KTtcbiAgLy8gc2hpbSBhZGRUcmFjayBhbmQgcmVtb3ZlVHJhY2suXG4gIGlmICh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrICYmIGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPj0gNjUpIHtcbiAgICByZXR1cm4gc2hpbUFkZFRyYWNrUmVtb3ZlVHJhY2tXaXRoTmF0aXZlKHdpbmRvdyk7XG4gIH1cblxuICAvLyBhbHNvIHNoaW0gcGMuZ2V0TG9jYWxTdHJlYW1zIHdoZW4gYWRkVHJhY2sgaXMgc2hpbW1lZFxuICAvLyB0byByZXR1cm4gdGhlIG9yaWdpbmFsIHN0cmVhbXMuXG4gIHZhciBvcmlnR2V0TG9jYWxTdHJlYW1zID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRMb2NhbFN0cmVhbXM7XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0TG9jYWxTdHJlYW1zID0gZnVuY3Rpb24gZ2V0TG9jYWxTdHJlYW1zKCkge1xuICAgIHZhciBfdGhpczExID0gdGhpcztcblxuICAgIHZhciBuYXRpdmVTdHJlYW1zID0gb3JpZ0dldExvY2FsU3RyZWFtcy5hcHBseSh0aGlzKTtcbiAgICB0aGlzLl9yZXZlcnNlU3RyZWFtcyA9IHRoaXMuX3JldmVyc2VTdHJlYW1zIHx8IHt9O1xuICAgIHJldHVybiBuYXRpdmVTdHJlYW1zLm1hcChmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICByZXR1cm4gX3RoaXMxMS5fcmV2ZXJzZVN0cmVhbXNbc3RyZWFtLmlkXTtcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgb3JpZ0FkZFN0cmVhbSA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkU3RyZWFtO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFN0cmVhbSA9IGZ1bmN0aW9uIGFkZFN0cmVhbShzdHJlYW0pIHtcbiAgICB2YXIgX3RoaXMxMiA9IHRoaXM7XG5cbiAgICB0aGlzLl9zdHJlYW1zID0gdGhpcy5fc3RyZWFtcyB8fCB7fTtcbiAgICB0aGlzLl9yZXZlcnNlU3RyZWFtcyA9IHRoaXMuX3JldmVyc2VTdHJlYW1zIHx8IHt9O1xuXG4gICAgc3RyZWFtLmdldFRyYWNrcygpLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrKSB7XG4gICAgICB2YXIgYWxyZWFkeUV4aXN0cyA9IF90aGlzMTIuZ2V0U2VuZGVycygpLmZpbmQoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHMudHJhY2sgPT09IHRyYWNrO1xuICAgICAgfSk7XG4gICAgICBpZiAoYWxyZWFkeUV4aXN0cykge1xuICAgICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdUcmFjayBhbHJlYWR5IGV4aXN0cy4nLCAnSW52YWxpZEFjY2Vzc0Vycm9yJyk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gQWRkIGlkZW50aXR5IG1hcHBpbmcgZm9yIGNvbnNpc3RlbmN5IHdpdGggYWRkVHJhY2suXG4gICAgLy8gVW5sZXNzIHRoaXMgaXMgYmVpbmcgdXNlZCB3aXRoIGEgc3RyZWFtIGZyb20gYWRkVHJhY2suXG4gICAgaWYgKCF0aGlzLl9yZXZlcnNlU3RyZWFtc1tzdHJlYW0uaWRdKSB7XG4gICAgICB2YXIgbmV3U3RyZWFtID0gbmV3IHdpbmRvdy5NZWRpYVN0cmVhbShzdHJlYW0uZ2V0VHJhY2tzKCkpO1xuICAgICAgdGhpcy5fc3RyZWFtc1tzdHJlYW0uaWRdID0gbmV3U3RyZWFtO1xuICAgICAgdGhpcy5fcmV2ZXJzZVN0cmVhbXNbbmV3U3RyZWFtLmlkXSA9IHN0cmVhbTtcbiAgICAgIHN0cmVhbSA9IG5ld1N0cmVhbTtcbiAgICB9XG4gICAgb3JpZ0FkZFN0cmVhbS5hcHBseSh0aGlzLCBbc3RyZWFtXSk7XG4gIH07XG5cbiAgdmFyIG9yaWdSZW1vdmVTdHJlYW0gPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVN0cmVhbTtcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbiByZW1vdmVTdHJlYW0oc3RyZWFtKSB7XG4gICAgdGhpcy5fc3RyZWFtcyA9IHRoaXMuX3N0cmVhbXMgfHwge307XG4gICAgdGhpcy5fcmV2ZXJzZVN0cmVhbXMgPSB0aGlzLl9yZXZlcnNlU3RyZWFtcyB8fCB7fTtcblxuICAgIG9yaWdSZW1vdmVTdHJlYW0uYXBwbHkodGhpcywgW3RoaXMuX3N0cmVhbXNbc3RyZWFtLmlkXSB8fCBzdHJlYW1dKTtcbiAgICBkZWxldGUgdGhpcy5fcmV2ZXJzZVN0cmVhbXNbdGhpcy5fc3RyZWFtc1tzdHJlYW0uaWRdID8gdGhpcy5fc3RyZWFtc1tzdHJlYW0uaWRdLmlkIDogc3RyZWFtLmlkXTtcbiAgICBkZWxldGUgdGhpcy5fc3RyZWFtc1tzdHJlYW0uaWRdO1xuICB9O1xuXG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2sgPSBmdW5jdGlvbiBhZGRUcmFjayh0cmFjaywgc3RyZWFtKSB7XG4gICAgdmFyIF90aGlzMTMgPSB0aGlzO1xuXG4gICAgaWYgKHRoaXMuc2lnbmFsaW5nU3RhdGUgPT09ICdjbG9zZWQnKSB7XG4gICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdUaGUgUlRDUGVlckNvbm5lY3Rpb25cXCdzIHNpZ25hbGluZ1N0YXRlIGlzIFxcJ2Nsb3NlZFxcJy4nLCAnSW52YWxpZFN0YXRlRXJyb3InKTtcbiAgICB9XG4gICAgdmFyIHN0cmVhbXMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKHN0cmVhbXMubGVuZ3RoICE9PSAxIHx8ICFzdHJlYW1zWzBdLmdldFRyYWNrcygpLmZpbmQoZnVuY3Rpb24gKHQpIHtcbiAgICAgIHJldHVybiB0ID09PSB0cmFjaztcbiAgICB9KSkge1xuICAgICAgLy8gdGhpcyBpcyBub3QgZnVsbHkgY29ycmVjdCBidXQgYWxsIHdlIGNhbiBtYW5hZ2Ugd2l0aG91dFxuICAgICAgLy8gW1thc3NvY2lhdGVkIE1lZGlhU3RyZWFtc11dIGludGVybmFsIHNsb3QuXG4gICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdUaGUgYWRhcHRlci5qcyBhZGRUcmFjayBwb2x5ZmlsbCBvbmx5IHN1cHBvcnRzIGEgc2luZ2xlICcgKyAnIHN0cmVhbSB3aGljaCBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIHNwZWNpZmllZCB0cmFjay4nLCAnTm90U3VwcG9ydGVkRXJyb3InKTtcbiAgICB9XG5cbiAgICB2YXIgYWxyZWFkeUV4aXN0cyA9IHRoaXMuZ2V0U2VuZGVycygpLmZpbmQoZnVuY3Rpb24gKHMpIHtcbiAgICAgIHJldHVybiBzLnRyYWNrID09PSB0cmFjaztcbiAgICB9KTtcbiAgICBpZiAoYWxyZWFkeUV4aXN0cykge1xuICAgICAgdGhyb3cgbmV3IERPTUV4Y2VwdGlvbignVHJhY2sgYWxyZWFkeSBleGlzdHMuJywgJ0ludmFsaWRBY2Nlc3NFcnJvcicpO1xuICAgIH1cblxuICAgIHRoaXMuX3N0cmVhbXMgPSB0aGlzLl9zdHJlYW1zIHx8IHt9O1xuICAgIHRoaXMuX3JldmVyc2VTdHJlYW1zID0gdGhpcy5fcmV2ZXJzZVN0cmVhbXMgfHwge307XG4gICAgdmFyIG9sZFN0cmVhbSA9IHRoaXMuX3N0cmVhbXNbc3RyZWFtLmlkXTtcbiAgICBpZiAob2xkU3RyZWFtKSB7XG4gICAgICAvLyB0aGlzIGlzIHVzaW5nIG9kZCBDaHJvbWUgYmVoYXZpb3VyLCB1c2Ugd2l0aCBjYXV0aW9uOlxuICAgICAgLy8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3dlYnJ0Yy9pc3N1ZXMvZGV0YWlsP2lkPTc4MTVcbiAgICAgIC8vIE5vdGU6IHdlIHJlbHkgb24gdGhlIGhpZ2gtbGV2ZWwgYWRkVHJhY2svZHRtZiBzaGltIHRvXG4gICAgICAvLyBjcmVhdGUgdGhlIHNlbmRlciB3aXRoIGEgZHRtZiBzZW5kZXIuXG4gICAgICBvbGRTdHJlYW0uYWRkVHJhY2sodHJhY2spO1xuXG4gICAgICAvLyBUcmlnZ2VyIE9OTiBhc3luYy5cbiAgICAgIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICBfdGhpczEzLmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCduZWdvdGlhdGlvbm5lZWRlZCcpKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbmV3U3RyZWFtID0gbmV3IHdpbmRvdy5NZWRpYVN0cmVhbShbdHJhY2tdKTtcbiAgICAgIHRoaXMuX3N0cmVhbXNbc3RyZWFtLmlkXSA9IG5ld1N0cmVhbTtcbiAgICAgIHRoaXMuX3JldmVyc2VTdHJlYW1zW25ld1N0cmVhbS5pZF0gPSBzdHJlYW07XG4gICAgICB0aGlzLmFkZFN0cmVhbShuZXdTdHJlYW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXRTZW5kZXJzKCkuZmluZChmdW5jdGlvbiAocykge1xuICAgICAgcmV0dXJuIHMudHJhY2sgPT09IHRyYWNrO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIHJlcGxhY2UgdGhlIGludGVybmFsIHN0cmVhbSBpZCB3aXRoIHRoZSBleHRlcm5hbCBvbmUgYW5kXG4gIC8vIHZpY2UgdmVyc2EuXG4gIGZ1bmN0aW9uIHJlcGxhY2VJbnRlcm5hbFN0cmVhbUlkKHBjLCBkZXNjcmlwdGlvbikge1xuICAgIHZhciBzZHAgPSBkZXNjcmlwdGlvbi5zZHA7XG4gICAgT2JqZWN0LmtleXMocGMuX3JldmVyc2VTdHJlYW1zIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uIChpbnRlcm5hbElkKSB7XG4gICAgICB2YXIgZXh0ZXJuYWxTdHJlYW0gPSBwYy5fcmV2ZXJzZVN0cmVhbXNbaW50ZXJuYWxJZF07XG4gICAgICB2YXIgaW50ZXJuYWxTdHJlYW0gPSBwYy5fc3RyZWFtc1tleHRlcm5hbFN0cmVhbS5pZF07XG4gICAgICBzZHAgPSBzZHAucmVwbGFjZShuZXcgUmVnRXhwKGludGVybmFsU3RyZWFtLmlkLCAnZycpLCBleHRlcm5hbFN0cmVhbS5pZCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oe1xuICAgICAgdHlwZTogZGVzY3JpcHRpb24udHlwZSxcbiAgICAgIHNkcDogc2RwXG4gICAgfSk7XG4gIH1cbiAgZnVuY3Rpb24gcmVwbGFjZUV4dGVybmFsU3RyZWFtSWQocGMsIGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIHNkcCA9IGRlc2NyaXB0aW9uLnNkcDtcbiAgICBPYmplY3Qua2V5cyhwYy5fcmV2ZXJzZVN0cmVhbXMgfHwgW10pLmZvckVhY2goZnVuY3Rpb24gKGludGVybmFsSWQpIHtcbiAgICAgIHZhciBleHRlcm5hbFN0cmVhbSA9IHBjLl9yZXZlcnNlU3RyZWFtc1tpbnRlcm5hbElkXTtcbiAgICAgIHZhciBpbnRlcm5hbFN0cmVhbSA9IHBjLl9zdHJlYW1zW2V4dGVybmFsU3RyZWFtLmlkXTtcbiAgICAgIHNkcCA9IHNkcC5yZXBsYWNlKG5ldyBSZWdFeHAoZXh0ZXJuYWxTdHJlYW0uaWQsICdnJyksIGludGVybmFsU3RyZWFtLmlkKTtcbiAgICB9KTtcbiAgICByZXR1cm4gbmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbih7XG4gICAgICB0eXBlOiBkZXNjcmlwdGlvbi50eXBlLFxuICAgICAgc2RwOiBzZHBcbiAgICB9KTtcbiAgfVxuICBbJ2NyZWF0ZU9mZmVyJywgJ2NyZWF0ZUFuc3dlciddLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgIHZhciBuYXRpdmVNZXRob2QgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF07XG4gICAgdmFyIG1ldGhvZE9iaiA9IF9kZWZpbmVQcm9wZXJ0eSh7fSwgbWV0aG9kLCBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgX3RoaXMxNCA9IHRoaXM7XG5cbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgdmFyIGlzTGVnYWN5Q2FsbCA9IGFyZ3VtZW50cy5sZW5ndGggJiYgdHlwZW9mIGFyZ3VtZW50c1swXSA9PT0gJ2Z1bmN0aW9uJztcbiAgICAgIGlmIChpc0xlZ2FjeUNhbGwpIHtcbiAgICAgICAgcmV0dXJuIG5hdGl2ZU1ldGhvZC5hcHBseSh0aGlzLCBbZnVuY3Rpb24gKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgdmFyIGRlc2MgPSByZXBsYWNlSW50ZXJuYWxTdHJlYW1JZChfdGhpczE0LCBkZXNjcmlwdGlvbik7XG4gICAgICAgICAgYXJnc1swXS5hcHBseShudWxsLCBbZGVzY10pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgaWYgKGFyZ3NbMV0pIHtcbiAgICAgICAgICAgIGFyZ3NbMV0uYXBwbHkobnVsbCwgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGFyZ3VtZW50c1syXV0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5hdGl2ZU1ldGhvZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpLnRoZW4oZnVuY3Rpb24gKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIHJldHVybiByZXBsYWNlSW50ZXJuYWxTdHJlYW1JZChfdGhpczE0LCBkZXNjcmlwdGlvbik7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBtZXRob2RPYmpbbWV0aG9kXTtcbiAgfSk7XG5cbiAgdmFyIG9yaWdTZXRMb2NhbERlc2NyaXB0aW9uID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRMb2NhbERlc2NyaXB0aW9uO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnNldExvY2FsRGVzY3JpcHRpb24gPSBmdW5jdGlvbiBzZXRMb2NhbERlc2NyaXB0aW9uKCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCB8fCAhYXJndW1lbnRzWzBdLnR5cGUpIHtcbiAgICAgIHJldHVybiBvcmlnU2V0TG9jYWxEZXNjcmlwdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBhcmd1bWVudHNbMF0gPSByZXBsYWNlRXh0ZXJuYWxTdHJlYW1JZCh0aGlzLCBhcmd1bWVudHNbMF0pO1xuICAgIHJldHVybiBvcmlnU2V0TG9jYWxEZXNjcmlwdGlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xuXG4gIC8vIFRPRE86IG1hbmdsZSBnZXRTdGF0czogaHR0cHM6Ly93M2MuZ2l0aHViLmlvL3dlYnJ0Yy1zdGF0cy8jZG9tLXJ0Y21lZGlhc3RyZWFtc3RhdHMtc3RyZWFtaWRlbnRpZmllclxuXG4gIHZhciBvcmlnTG9jYWxEZXNjcmlwdGlvbiA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSwgJ2xvY2FsRGVzY3JpcHRpb24nKTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUsICdsb2NhbERlc2NyaXB0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgdmFyIGRlc2NyaXB0aW9uID0gb3JpZ0xvY2FsRGVzY3JpcHRpb24uZ2V0LmFwcGx5KHRoaXMpO1xuICAgICAgaWYgKGRlc2NyaXB0aW9uLnR5cGUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiBkZXNjcmlwdGlvbjtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXBsYWNlSW50ZXJuYWxTdHJlYW1JZCh0aGlzLCBkZXNjcmlwdGlvbik7XG4gICAgfVxuICB9KTtcblxuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZVRyYWNrID0gZnVuY3Rpb24gcmVtb3ZlVHJhY2soc2VuZGVyKSB7XG4gICAgdmFyIF90aGlzMTUgPSB0aGlzO1xuXG4gICAgaWYgKHRoaXMuc2lnbmFsaW5nU3RhdGUgPT09ICdjbG9zZWQnKSB7XG4gICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdUaGUgUlRDUGVlckNvbm5lY3Rpb25cXCdzIHNpZ25hbGluZ1N0YXRlIGlzIFxcJ2Nsb3NlZFxcJy4nLCAnSW52YWxpZFN0YXRlRXJyb3InKTtcbiAgICB9XG4gICAgLy8gV2UgY2FuIG5vdCB5ZXQgY2hlY2sgZm9yIHNlbmRlciBpbnN0YW5jZW9mIFJUQ1J0cFNlbmRlclxuICAgIC8vIHNpbmNlIHdlIHNoaW0gUlRQU2VuZGVyLiBTbyB3ZSBjaGVjayBpZiBzZW5kZXIuX3BjIGlzIHNldC5cbiAgICBpZiAoIXNlbmRlci5fcGMpIHtcbiAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ0FyZ3VtZW50IDEgb2YgUlRDUGVlckNvbm5lY3Rpb24ucmVtb3ZlVHJhY2sgJyArICdkb2VzIG5vdCBpbXBsZW1lbnQgaW50ZXJmYWNlIFJUQ1J0cFNlbmRlci4nLCAnVHlwZUVycm9yJyk7XG4gICAgfVxuICAgIHZhciBpc0xvY2FsID0gc2VuZGVyLl9wYyA9PT0gdGhpcztcbiAgICBpZiAoIWlzTG9jYWwpIHtcbiAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1NlbmRlciB3YXMgbm90IGNyZWF0ZWQgYnkgdGhpcyBjb25uZWN0aW9uLicsICdJbnZhbGlkQWNjZXNzRXJyb3InKTtcbiAgICB9XG5cbiAgICAvLyBTZWFyY2ggZm9yIHRoZSBuYXRpdmUgc3RyZWFtIHRoZSBzZW5kZXJzIHRyYWNrIGJlbG9uZ3MgdG8uXG4gICAgdGhpcy5fc3RyZWFtcyA9IHRoaXMuX3N0cmVhbXMgfHwge307XG4gICAgdmFyIHN0cmVhbSA9IHZvaWQgMDtcbiAgICBPYmplY3Qua2V5cyh0aGlzLl9zdHJlYW1zKS5mb3JFYWNoKGZ1bmN0aW9uIChzdHJlYW1pZCkge1xuICAgICAgdmFyIGhhc1RyYWNrID0gX3RoaXMxNS5fc3RyZWFtc1tzdHJlYW1pZF0uZ2V0VHJhY2tzKCkuZmluZChmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgcmV0dXJuIHNlbmRlci50cmFjayA9PT0gdHJhY2s7XG4gICAgICB9KTtcbiAgICAgIGlmIChoYXNUcmFjaykge1xuICAgICAgICBzdHJlYW0gPSBfdGhpczE1Ll9zdHJlYW1zW3N0cmVhbWlkXTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChzdHJlYW0pIHtcbiAgICAgIGlmIChzdHJlYW0uZ2V0VHJhY2tzKCkubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vIGlmIHRoaXMgaXMgdGhlIGxhc3QgdHJhY2sgb2YgdGhlIHN0cmVhbSwgcmVtb3ZlIHRoZSBzdHJlYW0uIFRoaXNcbiAgICAgICAgLy8gdGFrZXMgY2FyZSBvZiBhbnkgc2hpbW1lZCBfc2VuZGVycy5cbiAgICAgICAgdGhpcy5yZW1vdmVTdHJlYW0odGhpcy5fcmV2ZXJzZVN0cmVhbXNbc3RyZWFtLmlkXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZWx5aW5nIG9uIHRoZSBzYW1lIG9kZCBjaHJvbWUgYmVoYXZpb3VyIGFzIGFib3ZlLlxuICAgICAgICBzdHJlYW0ucmVtb3ZlVHJhY2soc2VuZGVyLnRyYWNrKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ25lZ290aWF0aW9ubmVlZGVkJykpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gc2hpbVBlZXJDb25uZWN0aW9uKHdpbmRvdykge1xuICB2YXIgYnJvd3NlckRldGFpbHMgPSB1dGlscy5kZXRlY3RCcm93c2VyKHdpbmRvdyk7XG5cbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gJiYgd2luZG93LndlYmtpdFJUQ1BlZXJDb25uZWN0aW9uKSB7XG4gICAgLy8gdmVyeSBiYXNpYyBzdXBwb3J0IGZvciBvbGQgdmVyc2lvbnMuXG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uID0gd2luZG93LndlYmtpdFJUQ1BlZXJDb25uZWN0aW9uO1xuICB9XG4gIGlmICghd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGFkZEljZUNhbmRpZGF0ZU51bGxTdXBwb3J0ZWQgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZS5sZW5ndGggPT09IDA7XG5cbiAgLy8gc2hpbSBpbXBsaWNpdCBjcmVhdGlvbiBvZiBSVENTZXNzaW9uRGVzY3JpcHRpb24vUlRDSWNlQ2FuZGlkYXRlXG4gIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNTMpIHtcbiAgICBbJ3NldExvY2FsRGVzY3JpcHRpb24nLCAnc2V0UmVtb3RlRGVzY3JpcHRpb24nLCAnYWRkSWNlQ2FuZGlkYXRlJ10uZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgICB2YXIgbmF0aXZlTWV0aG9kID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdO1xuICAgICAgdmFyIG1ldGhvZE9iaiA9IF9kZWZpbmVQcm9wZXJ0eSh7fSwgbWV0aG9kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFyZ3VtZW50c1swXSA9IG5ldyAobWV0aG9kID09PSAnYWRkSWNlQ2FuZGlkYXRlJyA/IHdpbmRvdy5SVENJY2VDYW5kaWRhdGUgOiB3aW5kb3cuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKShhcmd1bWVudHNbMF0pO1xuICAgICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9KTtcbiAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXSA9IG1ldGhvZE9ialttZXRob2RdO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gc3VwcG9ydCBmb3IgYWRkSWNlQ2FuZGlkYXRlKG51bGwgb3IgdW5kZWZpbmVkKVxuICB2YXIgbmF0aXZlQWRkSWNlQ2FuZGlkYXRlID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRJY2VDYW5kaWRhdGU7XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkSWNlQ2FuZGlkYXRlID0gZnVuY3Rpb24gYWRkSWNlQ2FuZGlkYXRlKCkge1xuICAgIGlmICghYWRkSWNlQ2FuZGlkYXRlTnVsbFN1cHBvcnRlZCAmJiAhYXJndW1lbnRzWzBdKSB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdKSB7XG4gICAgICAgIGFyZ3VtZW50c1sxXS5hcHBseShudWxsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgLy8gRmlyZWZveCA2OCsgZW1pdHMgYW5kIHByb2Nlc3NlcyB7Y2FuZGlkYXRlOiBcIlwiLCAuLi59LCBpZ25vcmVcbiAgICAvLyBpbiBvbGRlciB2ZXJzaW9ucy4gTmF0aXZlIHN1cHBvcnQgcGxhbm5lZCBmb3IgQ2hyb21lIE03Ny5cbiAgICBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDc4ICYmIGFyZ3VtZW50c1swXSAmJiBhcmd1bWVudHNbMF0uY2FuZGlkYXRlID09PSAnJykge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbmF0aXZlQWRkSWNlQ2FuZGlkYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59XG5cbi8vIEF0dGVtcHQgdG8gZml4IE9OTiBpbiBwbGFuLWIgbW9kZS5cbmZ1bmN0aW9uIGZpeE5lZ290aWF0aW9uTmVlZGVkKHdpbmRvdykge1xuICB2YXIgYnJvd3NlckRldGFpbHMgPSB1dGlscy5kZXRlY3RCcm93c2VyKHdpbmRvdyk7XG4gIHV0aWxzLndyYXBQZWVyQ29ubmVjdGlvbkV2ZW50KHdpbmRvdywgJ25lZ290aWF0aW9ubmVlZGVkJywgZnVuY3Rpb24gKGUpIHtcbiAgICB2YXIgcGMgPSBlLnRhcmdldDtcbiAgICBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDcyIHx8IHBjLmdldENvbmZpZ3VyYXRpb24gJiYgcGMuZ2V0Q29uZmlndXJhdGlvbigpLnNkcFNlbWFudGljcyA9PT0gJ3BsYW4tYicpIHtcbiAgICAgIGlmIChwYy5zaWduYWxpbmdTdGF0ZSAhPT0gJ3N0YWJsZScpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZTtcbiAgfSk7XG59XG4iLCIvKlxuICogIENvcHlyaWdodCAoYykgMjAxOCBUaGUgYWRhcHRlci5qcyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2hpbUdldERpc3BsYXlNZWRpYSA9IHNoaW1HZXREaXNwbGF5TWVkaWE7XG5mdW5jdGlvbiBzaGltR2V0RGlzcGxheU1lZGlhKHdpbmRvdywgZ2V0U291cmNlSWQpIHtcbiAgaWYgKHdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzICYmICdnZXREaXNwbGF5TWVkaWEnIGluIHdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghd2luZG93Lm5hdmlnYXRvci5tZWRpYURldmljZXMpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gZ2V0U291cmNlSWQgaXMgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBwcm9taXNlIHJlc29sdmluZyB3aXRoXG4gIC8vIHRoZSBzb3VyY2VJZCBvZiB0aGUgc2NyZWVuL3dpbmRvdy90YWIgdG8gYmUgc2hhcmVkLlxuICBpZiAodHlwZW9mIGdldFNvdXJjZUlkICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgY29uc29sZS5lcnJvcignc2hpbUdldERpc3BsYXlNZWRpYTogZ2V0U291cmNlSWQgYXJndW1lbnQgaXMgbm90ICcgKyAnYSBmdW5jdGlvbicpO1xuICAgIHJldHVybjtcbiAgfVxuICB3aW5kb3cubmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXREaXNwbGF5TWVkaWEgPSBmdW5jdGlvbiBnZXREaXNwbGF5TWVkaWEoY29uc3RyYWludHMpIHtcbiAgICByZXR1cm4gZ2V0U291cmNlSWQoY29uc3RyYWludHMpLnRoZW4oZnVuY3Rpb24gKHNvdXJjZUlkKSB7XG4gICAgICB2YXIgd2lkdGhTcGVjaWZpZWQgPSBjb25zdHJhaW50cy52aWRlbyAmJiBjb25zdHJhaW50cy52aWRlby53aWR0aDtcbiAgICAgIHZhciBoZWlnaHRTcGVjaWZpZWQgPSBjb25zdHJhaW50cy52aWRlbyAmJiBjb25zdHJhaW50cy52aWRlby5oZWlnaHQ7XG4gICAgICB2YXIgZnJhbWVSYXRlU3BlY2lmaWVkID0gY29uc3RyYWludHMudmlkZW8gJiYgY29uc3RyYWludHMudmlkZW8uZnJhbWVSYXRlO1xuICAgICAgY29uc3RyYWludHMudmlkZW8gPSB7XG4gICAgICAgIG1hbmRhdG9yeToge1xuICAgICAgICAgIGNocm9tZU1lZGlhU291cmNlOiAnZGVza3RvcCcsXG4gICAgICAgICAgY2hyb21lTWVkaWFTb3VyY2VJZDogc291cmNlSWQsXG4gICAgICAgICAgbWF4RnJhbWVSYXRlOiBmcmFtZVJhdGVTcGVjaWZpZWQgfHwgM1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgaWYgKHdpZHRoU3BlY2lmaWVkKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5tYXhXaWR0aCA9IHdpZHRoU3BlY2lmaWVkO1xuICAgICAgfVxuICAgICAgaWYgKGhlaWdodFNwZWNpZmllZCkge1xuICAgICAgICBjb25zdHJhaW50cy52aWRlby5tYW5kYXRvcnkubWF4SGVpZ2h0ID0gaGVpZ2h0U3BlY2lmaWVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShjb25zdHJhaW50cyk7XG4gICAgfSk7XG4gIH07XG59XG4iLCIvKlxuICogIENvcHlyaWdodCAoYykgMjAxNiBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbmV4cG9ydHMuc2hpbUdldFVzZXJNZWRpYSA9IHNoaW1HZXRVc2VyTWVkaWE7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG52YXIgdXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfdXRpbHMpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG52YXIgbG9nZ2luZyA9IHV0aWxzLmxvZztcblxuZnVuY3Rpb24gc2hpbUdldFVzZXJNZWRpYSh3aW5kb3cpIHtcbiAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdyAmJiB3aW5kb3cubmF2aWdhdG9yO1xuXG4gIGlmICghbmF2aWdhdG9yLm1lZGlhRGV2aWNlcykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBicm93c2VyRGV0YWlscyA9IHV0aWxzLmRldGVjdEJyb3dzZXIod2luZG93KTtcblxuICB2YXIgY29uc3RyYWludHNUb0Nocm9tZV8gPSBmdW5jdGlvbiBjb25zdHJhaW50c1RvQ2hyb21lXyhjKSB7XG4gICAgaWYgKCh0eXBlb2YgYyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoYykpICE9PSAnb2JqZWN0JyB8fCBjLm1hbmRhdG9yeSB8fCBjLm9wdGlvbmFsKSB7XG4gICAgICByZXR1cm4gYztcbiAgICB9XG4gICAgdmFyIGNjID0ge307XG4gICAgT2JqZWN0LmtleXMoYykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVxdWlyZScgfHwga2V5ID09PSAnYWR2YW5jZWQnIHx8IGtleSA9PT0gJ21lZGlhU291cmNlJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgciA9IF90eXBlb2YoY1trZXldKSA9PT0gJ29iamVjdCcgPyBjW2tleV0gOiB7IGlkZWFsOiBjW2tleV0gfTtcbiAgICAgIGlmIChyLmV4YWN0ICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIHIuZXhhY3QgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHIubWluID0gci5tYXggPSByLmV4YWN0O1xuICAgICAgfVxuICAgICAgdmFyIG9sZG5hbWVfID0gZnVuY3Rpb24gb2xkbmFtZV8ocHJlZml4LCBuYW1lKSB7XG4gICAgICAgIGlmIChwcmVmaXgpIHtcbiAgICAgICAgICByZXR1cm4gcHJlZml4ICsgbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc2xpY2UoMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5hbWUgPT09ICdkZXZpY2VJZCcgPyAnc291cmNlSWQnIDogbmFtZTtcbiAgICAgIH07XG4gICAgICBpZiAoci5pZGVhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNjLm9wdGlvbmFsID0gY2Mub3B0aW9uYWwgfHwgW107XG4gICAgICAgIHZhciBvYyA9IHt9O1xuICAgICAgICBpZiAodHlwZW9mIHIuaWRlYWwgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgb2Nbb2xkbmFtZV8oJ21pbicsIGtleSldID0gci5pZGVhbDtcbiAgICAgICAgICBjYy5vcHRpb25hbC5wdXNoKG9jKTtcbiAgICAgICAgICBvYyA9IHt9O1xuICAgICAgICAgIG9jW29sZG5hbWVfKCdtYXgnLCBrZXkpXSA9IHIuaWRlYWw7XG4gICAgICAgICAgY2Mub3B0aW9uYWwucHVzaChvYyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2Nbb2xkbmFtZV8oJycsIGtleSldID0gci5pZGVhbDtcbiAgICAgICAgICBjYy5vcHRpb25hbC5wdXNoKG9jKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHIuZXhhY3QgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygci5leGFjdCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgY2MubWFuZGF0b3J5ID0gY2MubWFuZGF0b3J5IHx8IHt9O1xuICAgICAgICBjYy5tYW5kYXRvcnlbb2xkbmFtZV8oJycsIGtleSldID0gci5leGFjdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIFsnbWluJywgJ21heCddLmZvckVhY2goZnVuY3Rpb24gKG1peCkge1xuICAgICAgICAgIGlmIChyW21peF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2MubWFuZGF0b3J5ID0gY2MubWFuZGF0b3J5IHx8IHt9O1xuICAgICAgICAgICAgY2MubWFuZGF0b3J5W29sZG5hbWVfKG1peCwga2V5KV0gPSByW21peF07XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoYy5hZHZhbmNlZCkge1xuICAgICAgY2Mub3B0aW9uYWwgPSAoY2Mub3B0aW9uYWwgfHwgW10pLmNvbmNhdChjLmFkdmFuY2VkKTtcbiAgICB9XG4gICAgcmV0dXJuIGNjO1xuICB9O1xuXG4gIHZhciBzaGltQ29uc3RyYWludHNfID0gZnVuY3Rpb24gc2hpbUNvbnN0cmFpbnRzXyhjb25zdHJhaW50cywgZnVuYykge1xuICAgIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uID49IDYxKSB7XG4gICAgICByZXR1cm4gZnVuYyhjb25zdHJhaW50cyk7XG4gICAgfVxuICAgIGNvbnN0cmFpbnRzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25zdHJhaW50cykpO1xuICAgIGlmIChjb25zdHJhaW50cyAmJiBfdHlwZW9mKGNvbnN0cmFpbnRzLmF1ZGlvKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciByZW1hcCA9IGZ1bmN0aW9uIHJlbWFwKG9iaiwgYSwgYikge1xuICAgICAgICBpZiAoYSBpbiBvYmogJiYgIShiIGluIG9iaikpIHtcbiAgICAgICAgICBvYmpbYl0gPSBvYmpbYV07XG4gICAgICAgICAgZGVsZXRlIG9ialthXTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0cmFpbnRzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25zdHJhaW50cykpO1xuICAgICAgcmVtYXAoY29uc3RyYWludHMuYXVkaW8sICdhdXRvR2FpbkNvbnRyb2wnLCAnZ29vZ0F1dG9HYWluQ29udHJvbCcpO1xuICAgICAgcmVtYXAoY29uc3RyYWludHMuYXVkaW8sICdub2lzZVN1cHByZXNzaW9uJywgJ2dvb2dOb2lzZVN1cHByZXNzaW9uJyk7XG4gICAgICBjb25zdHJhaW50cy5hdWRpbyA9IGNvbnN0cmFpbnRzVG9DaHJvbWVfKGNvbnN0cmFpbnRzLmF1ZGlvKTtcbiAgICB9XG4gICAgaWYgKGNvbnN0cmFpbnRzICYmIF90eXBlb2YoY29uc3RyYWludHMudmlkZW8pID09PSAnb2JqZWN0Jykge1xuICAgICAgLy8gU2hpbSBmYWNpbmdNb2RlIGZvciBtb2JpbGUgJiBzdXJmYWNlIHByby5cbiAgICAgIHZhciBmYWNlID0gY29uc3RyYWludHMudmlkZW8uZmFjaW5nTW9kZTtcbiAgICAgIGZhY2UgPSBmYWNlICYmICgodHlwZW9mIGZhY2UgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGZhY2UpKSA9PT0gJ29iamVjdCcgPyBmYWNlIDogeyBpZGVhbDogZmFjZSB9KTtcbiAgICAgIHZhciBnZXRTdXBwb3J0ZWRGYWNpbmdNb2RlTGllcyA9IGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPCA2NjtcblxuICAgICAgaWYgKGZhY2UgJiYgKGZhY2UuZXhhY3QgPT09ICd1c2VyJyB8fCBmYWNlLmV4YWN0ID09PSAnZW52aXJvbm1lbnQnIHx8IGZhY2UuaWRlYWwgPT09ICd1c2VyJyB8fCBmYWNlLmlkZWFsID09PSAnZW52aXJvbm1lbnQnKSAmJiAhKG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0U3VwcG9ydGVkQ29uc3RyYWludHMgJiYgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRTdXBwb3J0ZWRDb25zdHJhaW50cygpLmZhY2luZ01vZGUgJiYgIWdldFN1cHBvcnRlZEZhY2luZ01vZGVMaWVzKSkge1xuICAgICAgICBkZWxldGUgY29uc3RyYWludHMudmlkZW8uZmFjaW5nTW9kZTtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSB2b2lkIDA7XG4gICAgICAgIGlmIChmYWNlLmV4YWN0ID09PSAnZW52aXJvbm1lbnQnIHx8IGZhY2UuaWRlYWwgPT09ICdlbnZpcm9ubWVudCcpIHtcbiAgICAgICAgICBtYXRjaGVzID0gWydiYWNrJywgJ3JlYXInXTtcbiAgICAgICAgfSBlbHNlIGlmIChmYWNlLmV4YWN0ID09PSAndXNlcicgfHwgZmFjZS5pZGVhbCA9PT0gJ3VzZXInKSB7XG4gICAgICAgICAgbWF0Y2hlcyA9IFsnZnJvbnQnXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICAgIC8vIExvb2sgZm9yIG1hdGNoZXMgaW4gbGFiZWwsIG9yIHVzZSBsYXN0IGNhbSBmb3IgYmFjayAodHlwaWNhbCkuXG4gICAgICAgICAgcmV0dXJuIG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpLnRoZW4oZnVuY3Rpb24gKGRldmljZXMpIHtcbiAgICAgICAgICAgIGRldmljZXMgPSBkZXZpY2VzLmZpbHRlcihmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICByZXR1cm4gZC5raW5kID09PSAndmlkZW9pbnB1dCc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBkZXYgPSBkZXZpY2VzLmZpbmQoZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoZXMuc29tZShmdW5jdGlvbiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5sYWJlbC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKG1hdGNoKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghZGV2ICYmIGRldmljZXMubGVuZ3RoICYmIG1hdGNoZXMuaW5jbHVkZXMoJ2JhY2snKSkge1xuICAgICAgICAgICAgICBkZXYgPSBkZXZpY2VzW2RldmljZXMubGVuZ3RoIC0gMV07IC8vIG1vcmUgbGlrZWx5IHRoZSBiYWNrIGNhbVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRldikge1xuICAgICAgICAgICAgICBjb25zdHJhaW50cy52aWRlby5kZXZpY2VJZCA9IGZhY2UuZXhhY3QgPyB7IGV4YWN0OiBkZXYuZGV2aWNlSWQgfSA6IHsgaWRlYWw6IGRldi5kZXZpY2VJZCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3RyYWludHMudmlkZW8gPSBjb25zdHJhaW50c1RvQ2hyb21lXyhjb25zdHJhaW50cy52aWRlbyk7XG4gICAgICAgICAgICBsb2dnaW5nKCdjaHJvbWU6ICcgKyBKU09OLnN0cmluZ2lmeShjb25zdHJhaW50cykpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmMoY29uc3RyYWludHMpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdHJhaW50cy52aWRlbyA9IGNvbnN0cmFpbnRzVG9DaHJvbWVfKGNvbnN0cmFpbnRzLnZpZGVvKTtcbiAgICB9XG4gICAgbG9nZ2luZygnY2hyb21lOiAnICsgSlNPTi5zdHJpbmdpZnkoY29uc3RyYWludHMpKTtcbiAgICByZXR1cm4gZnVuYyhjb25zdHJhaW50cyk7XG4gIH07XG5cbiAgdmFyIHNoaW1FcnJvcl8gPSBmdW5jdGlvbiBzaGltRXJyb3JfKGUpIHtcbiAgICBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA+PSA2NCkge1xuICAgICAgcmV0dXJuIGU7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiB7XG4gICAgICAgIFBlcm1pc3Npb25EZW5pZWRFcnJvcjogJ05vdEFsbG93ZWRFcnJvcicsXG4gICAgICAgIFBlcm1pc3Npb25EaXNtaXNzZWRFcnJvcjogJ05vdEFsbG93ZWRFcnJvcicsXG4gICAgICAgIEludmFsaWRTdGF0ZUVycm9yOiAnTm90QWxsb3dlZEVycm9yJyxcbiAgICAgICAgRGV2aWNlc05vdEZvdW5kRXJyb3I6ICdOb3RGb3VuZEVycm9yJyxcbiAgICAgICAgQ29uc3RyYWludE5vdFNhdGlzZmllZEVycm9yOiAnT3ZlcmNvbnN0cmFpbmVkRXJyb3InLFxuICAgICAgICBUcmFja1N0YXJ0RXJyb3I6ICdOb3RSZWFkYWJsZUVycm9yJyxcbiAgICAgICAgTWVkaWFEZXZpY2VGYWlsZWREdWVUb1NodXRkb3duOiAnTm90QWxsb3dlZEVycm9yJyxcbiAgICAgICAgTWVkaWFEZXZpY2VLaWxsU3dpdGNoT246ICdOb3RBbGxvd2VkRXJyb3InLFxuICAgICAgICBUYWJDYXB0dXJlRXJyb3I6ICdBYm9ydEVycm9yJyxcbiAgICAgICAgU2NyZWVuQ2FwdHVyZUVycm9yOiAnQWJvcnRFcnJvcicsXG4gICAgICAgIERldmljZUNhcHR1cmVFcnJvcjogJ0Fib3J0RXJyb3InXG4gICAgICB9W2UubmFtZV0gfHwgZS5uYW1lLFxuICAgICAgbWVzc2FnZTogZS5tZXNzYWdlLFxuICAgICAgY29uc3RyYWludDogZS5jb25zdHJhaW50IHx8IGUuY29uc3RyYWludE5hbWUsXG4gICAgICB0b1N0cmluZzogZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWUgKyAodGhpcy5tZXNzYWdlICYmICc6ICcpICsgdGhpcy5tZXNzYWdlO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgdmFyIGdldFVzZXJNZWRpYV8gPSBmdW5jdGlvbiBnZXRVc2VyTWVkaWFfKGNvbnN0cmFpbnRzLCBvblN1Y2Nlc3MsIG9uRXJyb3IpIHtcbiAgICBzaGltQ29uc3RyYWludHNfKGNvbnN0cmFpbnRzLCBmdW5jdGlvbiAoYykge1xuICAgICAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYShjLCBvblN1Y2Nlc3MsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGlmIChvbkVycm9yKSB7XG4gICAgICAgICAgb25FcnJvcihzaGltRXJyb3JfKGUpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG4gIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBnZXRVc2VyTWVkaWFfLmJpbmQobmF2aWdhdG9yKTtcblxuICAvLyBFdmVuIHRob3VnaCBDaHJvbWUgNDUgaGFzIG5hdmlnYXRvci5tZWRpYURldmljZXMgYW5kIGEgZ2V0VXNlck1lZGlhXG4gIC8vIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYSBQcm9taXNlLCBpdCBkb2VzIG5vdCBhY2NlcHQgc3BlYy1zdHlsZVxuICAvLyBjb25zdHJhaW50cy5cbiAgaWYgKG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKSB7XG4gICAgdmFyIG9yaWdHZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYS5iaW5kKG5hdmlnYXRvci5tZWRpYURldmljZXMpO1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhID0gZnVuY3Rpb24gKGNzKSB7XG4gICAgICByZXR1cm4gc2hpbUNvbnN0cmFpbnRzXyhjcywgZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgcmV0dXJuIG9yaWdHZXRVc2VyTWVkaWEoYykudGhlbihmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgICAgaWYgKGMuYXVkaW8gJiYgIXN0cmVhbS5nZXRBdWRpb1RyYWNrcygpLmxlbmd0aCB8fCBjLnZpZGVvICYmICFzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKGZ1bmN0aW9uICh0cmFjaykge1xuICAgICAgICAgICAgICB0cmFjay5zdG9wKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJycsICdOb3RGb3VuZEVycm9yJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzdHJlYW07XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KHNoaW1FcnJvcl8oZSkpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cbn1cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5cbnZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxuZXhwb3J0cy5zaGltUlRDSWNlQ2FuZGlkYXRlID0gc2hpbVJUQ0ljZUNhbmRpZGF0ZTtcbmV4cG9ydHMuc2hpbU1heE1lc3NhZ2VTaXplID0gc2hpbU1heE1lc3NhZ2VTaXplO1xuZXhwb3J0cy5zaGltU2VuZFRocm93VHlwZUVycm9yID0gc2hpbVNlbmRUaHJvd1R5cGVFcnJvcjtcbmV4cG9ydHMuc2hpbUNvbm5lY3Rpb25TdGF0ZSA9IHNoaW1Db25uZWN0aW9uU3RhdGU7XG5leHBvcnRzLnJlbW92ZUFsbG93RXh0bWFwTWl4ZWQgPSByZW1vdmVBbGxvd0V4dG1hcE1peGVkO1xuXG52YXIgX3NkcCA9IHJlcXVpcmUoJ3NkcCcpO1xuXG52YXIgX3NkcDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9zZHApO1xuXG52YXIgX3V0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgdXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfdXRpbHMpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBzaGltUlRDSWNlQ2FuZGlkYXRlKHdpbmRvdykge1xuICAvLyBmb3VuZGF0aW9uIGlzIGFyYml0cmFyaWx5IGNob3NlbiBhcyBhbiBpbmRpY2F0b3IgZm9yIGZ1bGwgc3VwcG9ydCBmb3JcbiAgLy8gaHR0cHM6Ly93M2MuZ2l0aHViLmlvL3dlYnJ0Yy1wYy8jcnRjaWNlY2FuZGlkYXRlLWludGVyZmFjZVxuICBpZiAoIXdpbmRvdy5SVENJY2VDYW5kaWRhdGUgfHwgd2luZG93LlJUQ0ljZUNhbmRpZGF0ZSAmJiAnZm91bmRhdGlvbicgaW4gd2luZG93LlJUQ0ljZUNhbmRpZGF0ZS5wcm90b3R5cGUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgTmF0aXZlUlRDSWNlQ2FuZGlkYXRlID0gd2luZG93LlJUQ0ljZUNhbmRpZGF0ZTtcbiAgd2luZG93LlJUQ0ljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uIFJUQ0ljZUNhbmRpZGF0ZShhcmdzKSB7XG4gICAgLy8gUmVtb3ZlIHRoZSBhPSB3aGljaCBzaG91bGRuJ3QgYmUgcGFydCBvZiB0aGUgY2FuZGlkYXRlIHN0cmluZy5cbiAgICBpZiAoKHR5cGVvZiBhcmdzID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihhcmdzKSkgPT09ICdvYmplY3QnICYmIGFyZ3MuY2FuZGlkYXRlICYmIGFyZ3MuY2FuZGlkYXRlLmluZGV4T2YoJ2E9JykgPT09IDApIHtcbiAgICAgIGFyZ3MgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGFyZ3MpKTtcbiAgICAgIGFyZ3MuY2FuZGlkYXRlID0gYXJncy5jYW5kaWRhdGUuc3Vic3RyKDIpO1xuICAgIH1cblxuICAgIGlmIChhcmdzLmNhbmRpZGF0ZSAmJiBhcmdzLmNhbmRpZGF0ZS5sZW5ndGgpIHtcbiAgICAgIC8vIEF1Z21lbnQgdGhlIG5hdGl2ZSBjYW5kaWRhdGUgd2l0aCB0aGUgcGFyc2VkIGZpZWxkcy5cbiAgICAgIHZhciBuYXRpdmVDYW5kaWRhdGUgPSBuZXcgTmF0aXZlUlRDSWNlQ2FuZGlkYXRlKGFyZ3MpO1xuICAgICAgdmFyIHBhcnNlZENhbmRpZGF0ZSA9IF9zZHAyLmRlZmF1bHQucGFyc2VDYW5kaWRhdGUoYXJncy5jYW5kaWRhdGUpO1xuICAgICAgdmFyIGF1Z21lbnRlZENhbmRpZGF0ZSA9IE9iamVjdC5hc3NpZ24obmF0aXZlQ2FuZGlkYXRlLCBwYXJzZWRDYW5kaWRhdGUpO1xuXG4gICAgICAvLyBBZGQgYSBzZXJpYWxpemVyIHRoYXQgZG9lcyBub3Qgc2VyaWFsaXplIHRoZSBleHRyYSBhdHRyaWJ1dGVzLlxuICAgICAgYXVnbWVudGVkQ2FuZGlkYXRlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBjYW5kaWRhdGU6IGF1Z21lbnRlZENhbmRpZGF0ZS5jYW5kaWRhdGUsXG4gICAgICAgICAgc2RwTWlkOiBhdWdtZW50ZWRDYW5kaWRhdGUuc2RwTWlkLFxuICAgICAgICAgIHNkcE1MaW5lSW5kZXg6IGF1Z21lbnRlZENhbmRpZGF0ZS5zZHBNTGluZUluZGV4LFxuICAgICAgICAgIHVzZXJuYW1lRnJhZ21lbnQ6IGF1Z21lbnRlZENhbmRpZGF0ZS51c2VybmFtZUZyYWdtZW50XG4gICAgICAgIH07XG4gICAgICB9O1xuICAgICAgcmV0dXJuIGF1Z21lbnRlZENhbmRpZGF0ZTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBOYXRpdmVSVENJY2VDYW5kaWRhdGUoYXJncyk7XG4gIH07XG4gIHdpbmRvdy5SVENJY2VDYW5kaWRhdGUucHJvdG90eXBlID0gTmF0aXZlUlRDSWNlQ2FuZGlkYXRlLnByb3RvdHlwZTtcblxuICAvLyBIb29rIHVwIHRoZSBhdWdtZW50ZWQgY2FuZGlkYXRlIGluIG9uaWNlY2FuZGlkYXRlIGFuZFxuICAvLyBhZGRFdmVudExpc3RlbmVyKCdpY2VjYW5kaWRhdGUnLCAuLi4pXG4gIHV0aWxzLndyYXBQZWVyQ29ubmVjdGlvbkV2ZW50KHdpbmRvdywgJ2ljZWNhbmRpZGF0ZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuY2FuZGlkYXRlKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZSwgJ2NhbmRpZGF0ZScsIHtcbiAgICAgICAgdmFsdWU6IG5ldyB3aW5kb3cuUlRDSWNlQ2FuZGlkYXRlKGUuY2FuZGlkYXRlKSxcbiAgICAgICAgd3JpdGFibGU6ICdmYWxzZSdcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHNoaW1NYXhNZXNzYWdlU2l6ZSh3aW5kb3cpIHtcbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuXG4gIGlmICghKCdzY3RwJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlKSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLCAnc2N0cCcsIHtcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIHRoaXMuX3NjdHAgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHRoaXMuX3NjdHA7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB2YXIgc2N0cEluRGVzY3JpcHRpb24gPSBmdW5jdGlvbiBzY3RwSW5EZXNjcmlwdGlvbihkZXNjcmlwdGlvbikge1xuICAgIGlmICghZGVzY3JpcHRpb24gfHwgIWRlc2NyaXB0aW9uLnNkcCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgc2VjdGlvbnMgPSBfc2RwMi5kZWZhdWx0LnNwbGl0U2VjdGlvbnMoZGVzY3JpcHRpb24uc2RwKTtcbiAgICBzZWN0aW9ucy5zaGlmdCgpO1xuICAgIHJldHVybiBzZWN0aW9ucy5zb21lKGZ1bmN0aW9uIChtZWRpYVNlY3Rpb24pIHtcbiAgICAgIHZhciBtTGluZSA9IF9zZHAyLmRlZmF1bHQucGFyc2VNTGluZShtZWRpYVNlY3Rpb24pO1xuICAgICAgcmV0dXJuIG1MaW5lICYmIG1MaW5lLmtpbmQgPT09ICdhcHBsaWNhdGlvbicgJiYgbUxpbmUucHJvdG9jb2wuaW5kZXhPZignU0NUUCcpICE9PSAtMTtcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgZ2V0UmVtb3RlRmlyZWZveFZlcnNpb24gPSBmdW5jdGlvbiBnZXRSZW1vdGVGaXJlZm94VmVyc2lvbihkZXNjcmlwdGlvbikge1xuICAgIC8vIFRPRE86IElzIHRoZXJlIGEgYmV0dGVyIHNvbHV0aW9uIGZvciBkZXRlY3RpbmcgRmlyZWZveD9cbiAgICB2YXIgbWF0Y2ggPSBkZXNjcmlwdGlvbi5zZHAubWF0Y2goL21vemlsbGEuLi5USElTX0lTX1NEUEFSVEEtKFxcZCspLyk7XG4gICAgaWYgKG1hdGNoID09PSBudWxsIHx8IG1hdGNoLmxlbmd0aCA8IDIpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgdmFyIHZlcnNpb24gPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xuICAgIC8vIFRlc3QgZm9yIE5hTiAoeWVzLCB0aGlzIGlzIHVnbHkpXG4gICAgcmV0dXJuIHZlcnNpb24gIT09IHZlcnNpb24gPyAtMSA6IHZlcnNpb247XG4gIH07XG5cbiAgdmFyIGdldENhblNlbmRNYXhNZXNzYWdlU2l6ZSA9IGZ1bmN0aW9uIGdldENhblNlbmRNYXhNZXNzYWdlU2l6ZShyZW1vdGVJc0ZpcmVmb3gpIHtcbiAgICAvLyBFdmVyeSBpbXBsZW1lbnRhdGlvbiB3ZSBrbm93IGNhbiBzZW5kIGF0IGxlYXN0IDY0IEtpQi5cbiAgICAvLyBOb3RlOiBBbHRob3VnaCBDaHJvbWUgaXMgdGVjaG5pY2FsbHkgYWJsZSB0byBzZW5kIHVwIHRvIDI1NiBLaUIsIHRoZVxuICAgIC8vICAgICAgIGRhdGEgZG9lcyBub3QgcmVhY2ggdGhlIG90aGVyIHBlZXIgcmVsaWFibHkuXG4gICAgLy8gICAgICAgU2VlOiBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3Avd2VicnRjL2lzc3Vlcy9kZXRhaWw/aWQ9ODQxOVxuICAgIHZhciBjYW5TZW5kTWF4TWVzc2FnZVNpemUgPSA2NTUzNjtcbiAgICBpZiAoYnJvd3NlckRldGFpbHMuYnJvd3NlciA9PT0gJ2ZpcmVmb3gnKSB7XG4gICAgICBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDU3KSB7XG4gICAgICAgIGlmIChyZW1vdGVJc0ZpcmVmb3ggPT09IC0xKSB7XG4gICAgICAgICAgLy8gRkYgPCA1NyB3aWxsIHNlbmQgaW4gMTYgS2lCIGNodW5rcyB1c2luZyB0aGUgZGVwcmVjYXRlZCBQUElEXG4gICAgICAgICAgLy8gZnJhZ21lbnRhdGlvbi5cbiAgICAgICAgICBjYW5TZW5kTWF4TWVzc2FnZVNpemUgPSAxNjM4NDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBIb3dldmVyLCBvdGhlciBGRiAoYW5kIFJBV1JUQykgY2FuIHJlYXNzZW1ibGUgUFBJRC1mcmFnbWVudGVkXG4gICAgICAgICAgLy8gbWVzc2FnZXMuIFRodXMsIHN1cHBvcnRpbmcgfjIgR2lCIHdoZW4gc2VuZGluZy5cbiAgICAgICAgICBjYW5TZW5kTWF4TWVzc2FnZVNpemUgPSAyMTQ3NDgzNjM3O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPCA2MCkge1xuICAgICAgICAvLyBDdXJyZW50bHksIGFsbCBGRiA+PSA1NyB3aWxsIHJlc2V0IHRoZSByZW1vdGUgbWF4aW11bSBtZXNzYWdlIHNpemVcbiAgICAgICAgLy8gdG8gdGhlIGRlZmF1bHQgdmFsdWUgd2hlbiBhIGRhdGEgY2hhbm5lbCBpcyBjcmVhdGVkIGF0IGEgbGF0ZXJcbiAgICAgICAgLy8gc3RhZ2UuIDooXG4gICAgICAgIC8vIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTQyNjgzMVxuICAgICAgICBjYW5TZW5kTWF4TWVzc2FnZVNpemUgPSBicm93c2VyRGV0YWlscy52ZXJzaW9uID09PSA1NyA/IDY1NTM1IDogNjU1MzY7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBGRiA+PSA2MCBzdXBwb3J0cyBzZW5kaW5nIH4yIEdpQlxuICAgICAgICBjYW5TZW5kTWF4TWVzc2FnZVNpemUgPSAyMTQ3NDgzNjM3O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2FuU2VuZE1heE1lc3NhZ2VTaXplO1xuICB9O1xuXG4gIHZhciBnZXRNYXhNZXNzYWdlU2l6ZSA9IGZ1bmN0aW9uIGdldE1heE1lc3NhZ2VTaXplKGRlc2NyaXB0aW9uLCByZW1vdGVJc0ZpcmVmb3gpIHtcbiAgICAvLyBOb3RlOiA2NTUzNiBieXRlcyBpcyB0aGUgZGVmYXVsdCB2YWx1ZSBmcm9tIHRoZSBTRFAgc3BlYy4gQWxzbyxcbiAgICAvLyAgICAgICBldmVyeSBpbXBsZW1lbnRhdGlvbiB3ZSBrbm93IHN1cHBvcnRzIHJlY2VpdmluZyA2NTUzNiBieXRlcy5cbiAgICB2YXIgbWF4TWVzc2FnZVNpemUgPSA2NTUzNjtcblxuICAgIC8vIEZGIDU3IGhhcyBhIHNsaWdodGx5IGluY29ycmVjdCBkZWZhdWx0IHJlbW90ZSBtYXggbWVzc2FnZSBzaXplLCBzb1xuICAgIC8vIHdlIG5lZWQgdG8gYWRqdXN0IGl0IGhlcmUgdG8gYXZvaWQgYSBmYWlsdXJlIHdoZW4gc2VuZGluZy5cbiAgICAvLyBTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTE0MjU2OTdcbiAgICBpZiAoYnJvd3NlckRldGFpbHMuYnJvd3NlciA9PT0gJ2ZpcmVmb3gnICYmIGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPT09IDU3KSB7XG4gICAgICBtYXhNZXNzYWdlU2l6ZSA9IDY1NTM1O1xuICAgIH1cblxuICAgIHZhciBtYXRjaCA9IF9zZHAyLmRlZmF1bHQubWF0Y2hQcmVmaXgoZGVzY3JpcHRpb24uc2RwLCAnYT1tYXgtbWVzc2FnZS1zaXplOicpO1xuICAgIGlmIChtYXRjaC5sZW5ndGggPiAwKSB7XG4gICAgICBtYXhNZXNzYWdlU2l6ZSA9IHBhcnNlSW50KG1hdGNoWzBdLnN1YnN0cigxOSksIDEwKTtcbiAgICB9IGVsc2UgaWYgKGJyb3dzZXJEZXRhaWxzLmJyb3dzZXIgPT09ICdmaXJlZm94JyAmJiByZW1vdGVJc0ZpcmVmb3ggIT09IC0xKSB7XG4gICAgICAvLyBJZiB0aGUgbWF4aW11bSBtZXNzYWdlIHNpemUgaXMgbm90IHByZXNlbnQgaW4gdGhlIHJlbW90ZSBTRFAgYW5kXG4gICAgICAvLyBib3RoIGxvY2FsIGFuZCByZW1vdGUgYXJlIEZpcmVmb3gsIHRoZSByZW1vdGUgcGVlciBjYW4gcmVjZWl2ZVxuICAgICAgLy8gfjIgR2lCLlxuICAgICAgbWF4TWVzc2FnZVNpemUgPSAyMTQ3NDgzNjM3O1xuICAgIH1cbiAgICByZXR1cm4gbWF4TWVzc2FnZVNpemU7XG4gIH07XG5cbiAgdmFyIG9yaWdTZXRSZW1vdGVEZXNjcmlwdGlvbiA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb247XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb24gPSBmdW5jdGlvbiBzZXRSZW1vdGVEZXNjcmlwdGlvbigpIHtcbiAgICB0aGlzLl9zY3RwID0gbnVsbDtcbiAgICAvLyBDaHJvbWUgZGVjaWRlZCB0byBub3QgZXhwb3NlIC5zY3RwIGluIHBsYW4tYiBtb2RlLlxuICAgIC8vIEFzIHVzdWFsLCBhZGFwdGVyLmpzIGhhcyB0byBkbyBhbiAndWdseSB3b3Jha2Fyb3VuZCdcbiAgICAvLyB0byBjb3ZlciB1cCB0aGUgbWVzcy5cbiAgICBpZiAoYnJvd3NlckRldGFpbHMuYnJvd3NlciA9PT0gJ2Nocm9tZScgJiYgYnJvd3NlckRldGFpbHMudmVyc2lvbiA+PSA3Nikge1xuICAgICAgdmFyIF9nZXRDb25maWd1cmF0aW9uID0gdGhpcy5nZXRDb25maWd1cmF0aW9uKCksXG4gICAgICAgICAgc2RwU2VtYW50aWNzID0gX2dldENvbmZpZ3VyYXRpb24uc2RwU2VtYW50aWNzO1xuXG4gICAgICBpZiAoc2RwU2VtYW50aWNzID09PSAncGxhbi1iJykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3NjdHAnLCB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIHRoaXMuX3NjdHAgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHRoaXMuX3NjdHA7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzY3RwSW5EZXNjcmlwdGlvbihhcmd1bWVudHNbMF0pKSB7XG4gICAgICAvLyBDaGVjayBpZiB0aGUgcmVtb3RlIGlzIEZGLlxuICAgICAgdmFyIGlzRmlyZWZveCA9IGdldFJlbW90ZUZpcmVmb3hWZXJzaW9uKGFyZ3VtZW50c1swXSk7XG5cbiAgICAgIC8vIEdldCB0aGUgbWF4aW11bSBtZXNzYWdlIHNpemUgdGhlIGxvY2FsIHBlZXIgaXMgY2FwYWJsZSBvZiBzZW5kaW5nXG4gICAgICB2YXIgY2FuU2VuZE1NUyA9IGdldENhblNlbmRNYXhNZXNzYWdlU2l6ZShpc0ZpcmVmb3gpO1xuXG4gICAgICAvLyBHZXQgdGhlIG1heGltdW0gbWVzc2FnZSBzaXplIG9mIHRoZSByZW1vdGUgcGVlci5cbiAgICAgIHZhciByZW1vdGVNTVMgPSBnZXRNYXhNZXNzYWdlU2l6ZShhcmd1bWVudHNbMF0sIGlzRmlyZWZveCk7XG5cbiAgICAgIC8vIERldGVybWluZSBmaW5hbCBtYXhpbXVtIG1lc3NhZ2Ugc2l6ZVxuICAgICAgdmFyIG1heE1lc3NhZ2VTaXplID0gdm9pZCAwO1xuICAgICAgaWYgKGNhblNlbmRNTVMgPT09IDAgJiYgcmVtb3RlTU1TID09PSAwKSB7XG4gICAgICAgIG1heE1lc3NhZ2VTaXplID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICAgICAgfSBlbHNlIGlmIChjYW5TZW5kTU1TID09PSAwIHx8IHJlbW90ZU1NUyA9PT0gMCkge1xuICAgICAgICBtYXhNZXNzYWdlU2l6ZSA9IE1hdGgubWF4KGNhblNlbmRNTVMsIHJlbW90ZU1NUyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXhNZXNzYWdlU2l6ZSA9IE1hdGgubWluKGNhblNlbmRNTVMsIHJlbW90ZU1NUyk7XG4gICAgICB9XG5cbiAgICAgIC8vIENyZWF0ZSBhIGR1bW15IFJUQ1NjdHBUcmFuc3BvcnQgb2JqZWN0IGFuZCB0aGUgJ21heE1lc3NhZ2VTaXplJ1xuICAgICAgLy8gYXR0cmlidXRlLlxuICAgICAgdmFyIHNjdHAgPSB7fTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzY3RwLCAnbWF4TWVzc2FnZVNpemUnLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICAgIHJldHVybiBtYXhNZXNzYWdlU2l6ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB0aGlzLl9zY3RwID0gc2N0cDtcbiAgICB9XG5cbiAgICByZXR1cm4gb3JpZ1NldFJlbW90ZURlc2NyaXB0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHNoaW1TZW5kVGhyb3dUeXBlRXJyb3Iod2luZG93KSB7XG4gIGlmICghKHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJiAnY3JlYXRlRGF0YUNoYW5uZWwnIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gTm90ZTogQWx0aG91Z2ggRmlyZWZveCA+PSA1NyBoYXMgYSBuYXRpdmUgaW1wbGVtZW50YXRpb24sIHRoZSBtYXhpbXVtXG4gIC8vICAgICAgIG1lc3NhZ2Ugc2l6ZSBjYW4gYmUgcmVzZXQgZm9yIGFsbCBkYXRhIGNoYW5uZWxzIGF0IGEgbGF0ZXIgc3RhZ2UuXG4gIC8vICAgICAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTQyNjgzMVxuXG4gIGZ1bmN0aW9uIHdyYXBEY1NlbmQoZGMsIHBjKSB7XG4gICAgdmFyIG9yaWdEYXRhQ2hhbm5lbFNlbmQgPSBkYy5zZW5kO1xuICAgIGRjLnNlbmQgPSBmdW5jdGlvbiBzZW5kKCkge1xuICAgICAgdmFyIGRhdGEgPSBhcmd1bWVudHNbMF07XG4gICAgICB2YXIgbGVuZ3RoID0gZGF0YS5sZW5ndGggfHwgZGF0YS5zaXplIHx8IGRhdGEuYnl0ZUxlbmd0aDtcbiAgICAgIGlmIChkYy5yZWFkeVN0YXRlID09PSAnb3BlbicgJiYgcGMuc2N0cCAmJiBsZW5ndGggPiBwYy5zY3RwLm1heE1lc3NhZ2VTaXplKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01lc3NhZ2UgdG9vIGxhcmdlIChjYW4gc2VuZCBhIG1heGltdW0gb2YgJyArIHBjLnNjdHAubWF4TWVzc2FnZVNpemUgKyAnIGJ5dGVzKScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaWdEYXRhQ2hhbm5lbFNlbmQuYXBwbHkoZGMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuICB2YXIgb3JpZ0NyZWF0ZURhdGFDaGFubmVsID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVEYXRhQ2hhbm5lbDtcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVEYXRhQ2hhbm5lbCA9IGZ1bmN0aW9uIGNyZWF0ZURhdGFDaGFubmVsKCkge1xuICAgIHZhciBkYXRhQ2hhbm5lbCA9IG9yaWdDcmVhdGVEYXRhQ2hhbm5lbC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHdyYXBEY1NlbmQoZGF0YUNoYW5uZWwsIHRoaXMpO1xuICAgIHJldHVybiBkYXRhQ2hhbm5lbDtcbiAgfTtcbiAgdXRpbHMud3JhcFBlZXJDb25uZWN0aW9uRXZlbnQod2luZG93LCAnZGF0YWNoYW5uZWwnLCBmdW5jdGlvbiAoZSkge1xuICAgIHdyYXBEY1NlbmQoZS5jaGFubmVsLCBlLnRhcmdldCk7XG4gICAgcmV0dXJuIGU7XG4gIH0pO1xufVxuXG4vKiBzaGltcyBSVENDb25uZWN0aW9uU3RhdGUgYnkgcHJldGVuZGluZyBpdCBpcyB0aGUgc2FtZSBhcyBpY2VDb25uZWN0aW9uU3RhdGUuXG4gKiBTZWUgaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3dlYnJ0Yy9pc3N1ZXMvZGV0YWlsP2lkPTYxNDUjYzEyXG4gKiBmb3Igd2h5IHRoaXMgaXMgYSB2YWxpZCBoYWNrIGluIENocm9tZS4gSW4gRmlyZWZveCBpdCBpcyBzbGlnaHRseSBpbmNvcnJlY3RcbiAqIHNpbmNlIERUTFMgZmFpbHVyZXMgd291bGQgYmUgaGlkZGVuLiBTZWVcbiAqIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTEyNjU4MjdcbiAqIGZvciB0aGUgRmlyZWZveCB0cmFja2luZyBidWcuXG4gKi9cbmZ1bmN0aW9uIHNoaW1Db25uZWN0aW9uU3RhdGUod2luZG93KSB7XG4gIGlmICghd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uIHx8ICdjb25uZWN0aW9uU3RhdGUnIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHByb3RvID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnY29ubmVjdGlvblN0YXRlJywge1xuICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29tcGxldGVkOiAnY29ubmVjdGVkJyxcbiAgICAgICAgY2hlY2tpbmc6ICdjb25uZWN0aW5nJ1xuICAgICAgfVt0aGlzLmljZUNvbm5lY3Rpb25TdGF0ZV0gfHwgdGhpcy5pY2VDb25uZWN0aW9uU3RhdGU7XG4gICAgfSxcblxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdvbmNvbm5lY3Rpb25zdGF0ZWNoYW5nZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgIHJldHVybiB0aGlzLl9vbmNvbm5lY3Rpb25zdGF0ZWNoYW5nZSB8fCBudWxsO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbiBzZXQoY2IpIHtcbiAgICAgIGlmICh0aGlzLl9vbmNvbm5lY3Rpb25zdGF0ZWNoYW5nZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nvbm5lY3Rpb25zdGF0ZWNoYW5nZScsIHRoaXMuX29uY29ubmVjdGlvbnN0YXRlY2hhbmdlKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX29uY29ubmVjdGlvbnN0YXRlY2hhbmdlO1xuICAgICAgfVxuICAgICAgaWYgKGNiKSB7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgdGhpcy5fb25jb25uZWN0aW9uc3RhdGVjaGFuZ2UgPSBjYik7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0pO1xuXG4gIFsnc2V0TG9jYWxEZXNjcmlwdGlvbicsICdzZXRSZW1vdGVEZXNjcmlwdGlvbiddLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgIHZhciBvcmlnTWV0aG9kID0gcHJvdG9bbWV0aG9kXTtcbiAgICBwcm90b1ttZXRob2RdID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCF0aGlzLl9jb25uZWN0aW9uc3RhdGVjaGFuZ2Vwb2x5KSB7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3Rpb25zdGF0ZWNoYW5nZXBvbHkgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIHZhciBwYyA9IGUudGFyZ2V0O1xuICAgICAgICAgIGlmIChwYy5fbGFzdENvbm5lY3Rpb25TdGF0ZSAhPT0gcGMuY29ubmVjdGlvblN0YXRlKSB7XG4gICAgICAgICAgICBwYy5fbGFzdENvbm5lY3Rpb25TdGF0ZSA9IHBjLmNvbm5lY3Rpb25TdGF0ZTtcbiAgICAgICAgICAgIHZhciBuZXdFdmVudCA9IG5ldyBFdmVudCgnY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgZSk7XG4gICAgICAgICAgICBwYy5kaXNwYXRjaEV2ZW50KG5ld0V2ZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGU7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgdGhpcy5fY29ubmVjdGlvbnN0YXRlY2hhbmdlcG9seSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpZ01ldGhvZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZW1vdmVBbGxvd0V4dG1hcE1peGVkKHdpbmRvdykge1xuICAvKiByZW1vdmUgYT1leHRtYXAtYWxsb3ctbWl4ZWQgZm9yIHdlYnJ0Yy5vcmcgPCBNNzEgKi9cbiAgaWYgKCF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuICBpZiAoYnJvd3NlckRldGFpbHMuYnJvd3NlciA9PT0gJ2Nocm9tZScgJiYgYnJvd3NlckRldGFpbHMudmVyc2lvbiA+PSA3MSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoYnJvd3NlckRldGFpbHMuYnJvd3NlciA9PT0gJ3NhZmFyaScgJiYgYnJvd3NlckRldGFpbHMudmVyc2lvbiA+PSA2MDUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG5hdGl2ZVNSRCA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb247XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb24gPSBmdW5jdGlvbiBzZXRSZW1vdGVEZXNjcmlwdGlvbihkZXNjKSB7XG4gICAgaWYgKGRlc2MgJiYgZGVzYy5zZHAgJiYgZGVzYy5zZHAuaW5kZXhPZignXFxuYT1leHRtYXAtYWxsb3ctbWl4ZWQnKSAhPT0gLTEpIHtcbiAgICAgIGRlc2Muc2RwID0gZGVzYy5zZHAuc3BsaXQoJ1xcbicpLmZpbHRlcihmdW5jdGlvbiAobGluZSkge1xuICAgICAgICByZXR1cm4gbGluZS50cmltKCkgIT09ICdhPWV4dG1hcC1hbGxvdy1taXhlZCc7XG4gICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICB9XG4gICAgcmV0dXJuIG5hdGl2ZVNSRC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xufVxuIiwiLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTYgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2hpbUdldERpc3BsYXlNZWRpYSA9IGV4cG9ydHMuc2hpbUdldFVzZXJNZWRpYSA9IHVuZGVmaW5lZDtcblxudmFyIF9nZXR1c2VybWVkaWEgPSByZXF1aXJlKCcuL2dldHVzZXJtZWRpYScpO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ3NoaW1HZXRVc2VyTWVkaWEnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgIHJldHVybiBfZ2V0dXNlcm1lZGlhLnNoaW1HZXRVc2VyTWVkaWE7XG4gIH1cbn0pO1xuXG52YXIgX2dldGRpc3BsYXltZWRpYSA9IHJlcXVpcmUoJy4vZ2V0ZGlzcGxheW1lZGlhJyk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnc2hpbUdldERpc3BsYXlNZWRpYScsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIF9nZXRkaXNwbGF5bWVkaWEuc2hpbUdldERpc3BsYXlNZWRpYTtcbiAgfVxufSk7XG5leHBvcnRzLnNoaW1QZWVyQ29ubmVjdGlvbiA9IHNoaW1QZWVyQ29ubmVjdGlvbjtcbmV4cG9ydHMuc2hpbVJlcGxhY2VUcmFjayA9IHNoaW1SZXBsYWNlVHJhY2s7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG52YXIgdXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfdXRpbHMpO1xuXG52YXIgX2ZpbHRlcmljZXNlcnZlcnMgPSByZXF1aXJlKCcuL2ZpbHRlcmljZXNlcnZlcnMnKTtcblxudmFyIF9ydGNwZWVyY29ubmVjdGlvblNoaW0gPSByZXF1aXJlKCdydGNwZWVyY29ubmVjdGlvbi1zaGltJyk7XG5cbnZhciBfcnRjcGVlcmNvbm5lY3Rpb25TaGltMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3J0Y3BlZXJjb25uZWN0aW9uU2hpbSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIHNoaW1QZWVyQ29ubmVjdGlvbih3aW5kb3cpIHtcbiAgdmFyIGJyb3dzZXJEZXRhaWxzID0gdXRpbHMuZGV0ZWN0QnJvd3Nlcih3aW5kb3cpO1xuXG4gIGlmICh3aW5kb3cuUlRDSWNlR2F0aGVyZXIpIHtcbiAgICBpZiAoIXdpbmRvdy5SVENJY2VDYW5kaWRhdGUpIHtcbiAgICAgIHdpbmRvdy5SVENJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbiBSVENJY2VDYW5kaWRhdGUoYXJncykge1xuICAgICAgICByZXR1cm4gYXJncztcbiAgICAgIH07XG4gICAgfVxuICAgIGlmICghd2luZG93LlJUQ1Nlc3Npb25EZXNjcmlwdGlvbikge1xuICAgICAgd2luZG93LlJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBhcmdzO1xuICAgICAgfTtcbiAgICB9XG4gICAgLy8gdGhpcyBhZGRzIGFuIGFkZGl0aW9uYWwgZXZlbnQgbGlzdGVuZXIgdG8gTWVkaWFTdHJhY2tUcmFjayB0aGF0IHNpZ25hbHNcbiAgICAvLyB3aGVuIGEgdHJhY2tzIGVuYWJsZWQgcHJvcGVydHkgd2FzIGNoYW5nZWQuIFdvcmthcm91bmQgZm9yIGEgYnVnIGluXG4gICAgLy8gYWRkU3RyZWFtLCBzZWUgYmVsb3cuIE5vIGxvbmdlciByZXF1aXJlZCBpbiAxNTAyNStcbiAgICBpZiAoYnJvd3NlckRldGFpbHMudmVyc2lvbiA8IDE1MDI1KSB7XG4gICAgICB2YXIgb3JpZ01TVEVuYWJsZWQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrLnByb3RvdHlwZSwgJ2VuYWJsZWQnKTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuTWVkaWFTdHJlYW1UcmFjay5wcm90b3R5cGUsICdlbmFibGVkJywge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uIHNldCh2YWx1ZSkge1xuICAgICAgICAgIG9yaWdNU1RFbmFibGVkLnNldC5jYWxsKHRoaXMsIHZhbHVlKTtcbiAgICAgICAgICB2YXIgZXYgPSBuZXcgRXZlbnQoJ2VuYWJsZWQnKTtcbiAgICAgICAgICBldi5lbmFibGVkID0gdmFsdWU7XG4gICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KGV2KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gT1JUQyBkZWZpbmVzIHRoZSBEVE1GIHNlbmRlciBhIGJpdCBkaWZmZXJlbnQuXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS93M2Mvb3J0Yy9pc3N1ZXMvNzE0XG4gIGlmICh3aW5kb3cuUlRDUnRwU2VuZGVyICYmICEoJ2R0bWYnIGluIHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlKSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZSwgJ2R0bWYnLCB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2R0bWYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0aGlzLnRyYWNrLmtpbmQgPT09ICdhdWRpbycpIHtcbiAgICAgICAgICAgIHRoaXMuX2R0bWYgPSBuZXcgd2luZG93LlJUQ0R0bWZTZW5kZXIodGhpcyk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnRyYWNrLmtpbmQgPT09ICd2aWRlbycpIHtcbiAgICAgICAgICAgIHRoaXMuX2R0bWYgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZHRtZjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICAvLyBFZGdlIGN1cnJlbnRseSBvbmx5IGltcGxlbWVudHMgdGhlIFJUQ0R0bWZTZW5kZXIsIG5vdCB0aGVcbiAgLy8gUlRDRFRNRlNlbmRlciBhbGlhcy4gU2VlIGh0dHA6Ly9kcmFmdC5vcnRjLm9yZy8jcnRjZHRtZnNlbmRlcjIqXG4gIGlmICh3aW5kb3cuUlRDRHRtZlNlbmRlciAmJiAhd2luZG93LlJUQ0RUTUZTZW5kZXIpIHtcbiAgICB3aW5kb3cuUlRDRFRNRlNlbmRlciA9IHdpbmRvdy5SVENEdG1mU2VuZGVyO1xuICB9XG5cbiAgdmFyIFJUQ1BlZXJDb25uZWN0aW9uU2hpbSA9ICgwLCBfcnRjcGVlcmNvbm5lY3Rpb25TaGltMi5kZWZhdWx0KSh3aW5kb3csIGJyb3dzZXJEZXRhaWxzLnZlcnNpb24pO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gPSBmdW5jdGlvbiBSVENQZWVyQ29ubmVjdGlvbihjb25maWcpIHtcbiAgICBpZiAoY29uZmlnICYmIGNvbmZpZy5pY2VTZXJ2ZXJzKSB7XG4gICAgICBjb25maWcuaWNlU2VydmVycyA9ICgwLCBfZmlsdGVyaWNlc2VydmVycy5maWx0ZXJJY2VTZXJ2ZXJzKShjb25maWcuaWNlU2VydmVycywgYnJvd3NlckRldGFpbHMudmVyc2lvbik7XG4gICAgICB1dGlscy5sb2coJ0lDRSBzZXJ2ZXJzIGFmdGVyIGZpbHRlcmluZzonLCBjb25maWcuaWNlU2VydmVycyk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgUlRDUGVlckNvbm5lY3Rpb25TaGltKGNvbmZpZyk7XG4gIH07XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUgPSBSVENQZWVyQ29ubmVjdGlvblNoaW0ucHJvdG90eXBlO1xufVxuXG5mdW5jdGlvbiBzaGltUmVwbGFjZVRyYWNrKHdpbmRvdykge1xuICAvLyBPUlRDIGhhcyByZXBsYWNlVHJhY2sgLS0gaHR0cHM6Ly9naXRodWIuY29tL3czYy9vcnRjL2lzc3Vlcy82MTRcbiAgaWYgKHdpbmRvdy5SVENSdHBTZW5kZXIgJiYgISgncmVwbGFjZVRyYWNrJyBpbiB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZSkpIHtcbiAgICB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZS5yZXBsYWNlVHJhY2sgPSB3aW5kb3cuUlRDUnRwU2VuZGVyLnByb3RvdHlwZS5zZXRUcmFjaztcbiAgfVxufVxuIiwiLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTggVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZmlsdGVySWNlU2VydmVycyA9IGZpbHRlckljZVNlcnZlcnM7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG52YXIgdXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfdXRpbHMpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG4vLyBFZGdlIGRvZXMgbm90IGxpa2Vcbi8vIDEpIHN0dW46IGZpbHRlcmVkIGFmdGVyIDE0MzkzIHVubGVzcyA/dHJhbnNwb3J0PXVkcCBpcyBwcmVzZW50XG4vLyAyKSB0dXJuOiB0aGF0IGRvZXMgbm90IGhhdmUgYWxsIG9mIHR1cm46aG9zdDpwb3J0P3RyYW5zcG9ydD11ZHBcbi8vIDMpIHR1cm46IHdpdGggaXB2NiBhZGRyZXNzZXNcbi8vIDQpIHR1cm46IG9jY3VycmluZyBtdWxpcGxlIHRpbWVzXG5mdW5jdGlvbiBmaWx0ZXJJY2VTZXJ2ZXJzKGljZVNlcnZlcnMsIGVkZ2VWZXJzaW9uKSB7XG4gIHZhciBoYXNUdXJuID0gZmFsc2U7XG4gIGljZVNlcnZlcnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGljZVNlcnZlcnMpKTtcbiAgcmV0dXJuIGljZVNlcnZlcnMuZmlsdGVyKGZ1bmN0aW9uIChzZXJ2ZXIpIHtcbiAgICBpZiAoc2VydmVyICYmIChzZXJ2ZXIudXJscyB8fCBzZXJ2ZXIudXJsKSkge1xuICAgICAgdmFyIHVybHMgPSBzZXJ2ZXIudXJscyB8fCBzZXJ2ZXIudXJsO1xuICAgICAgaWYgKHNlcnZlci51cmwgJiYgIXNlcnZlci51cmxzKSB7XG4gICAgICAgIHV0aWxzLmRlcHJlY2F0ZWQoJ1JUQ0ljZVNlcnZlci51cmwnLCAnUlRDSWNlU2VydmVyLnVybHMnKTtcbiAgICAgIH1cbiAgICAgIHZhciBpc1N0cmluZyA9IHR5cGVvZiB1cmxzID09PSAnc3RyaW5nJztcbiAgICAgIGlmIChpc1N0cmluZykge1xuICAgICAgICB1cmxzID0gW3VybHNdO1xuICAgICAgfVxuICAgICAgdXJscyA9IHVybHMuZmlsdGVyKGZ1bmN0aW9uICh1cmwpIHtcbiAgICAgICAgLy8gZmlsdGVyIFNUVU4gdW5jb25kaXRpb25hbGx5LlxuICAgICAgICBpZiAodXJsLmluZGV4T2YoJ3N0dW46JykgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmFsaWRUdXJuID0gdXJsLnN0YXJ0c1dpdGgoJ3R1cm4nKSAmJiAhdXJsLnN0YXJ0c1dpdGgoJ3R1cm46WycpICYmIHVybC5pbmNsdWRlcygndHJhbnNwb3J0PXVkcCcpO1xuICAgICAgICBpZiAodmFsaWRUdXJuICYmICFoYXNUdXJuKSB7XG4gICAgICAgICAgaGFzVHVybiA9IHRydWU7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbGlkVHVybiAmJiAhaGFzVHVybjtcbiAgICAgIH0pO1xuXG4gICAgICBkZWxldGUgc2VydmVyLnVybDtcbiAgICAgIHNlcnZlci51cmxzID0gaXNTdHJpbmcgPyB1cmxzWzBdIDogdXJscztcbiAgICAgIHJldHVybiAhIXVybHMubGVuZ3RoO1xuICAgIH1cbiAgfSk7XG59XG4iLCIvKlxuICogIENvcHlyaWdodCAoYykgMjAxOCBUaGUgYWRhcHRlci5qcyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2hpbUdldERpc3BsYXlNZWRpYSA9IHNoaW1HZXREaXNwbGF5TWVkaWE7XG5mdW5jdGlvbiBzaGltR2V0RGlzcGxheU1lZGlhKHdpbmRvdykge1xuICBpZiAoISgnZ2V0RGlzcGxheU1lZGlhJyBpbiB3aW5kb3cubmF2aWdhdG9yKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIXdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh3aW5kb3cubmF2aWdhdG9yLm1lZGlhRGV2aWNlcyAmJiAnZ2V0RGlzcGxheU1lZGlhJyBpbiB3aW5kb3cubmF2aWdhdG9yLm1lZGlhRGV2aWNlcykge1xuICAgIHJldHVybjtcbiAgfVxuICB3aW5kb3cubmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXREaXNwbGF5TWVkaWEgPSB3aW5kb3cubmF2aWdhdG9yLmdldERpc3BsYXlNZWRpYS5iaW5kKHdpbmRvdy5uYXZpZ2F0b3IpO1xufVxuIiwiLypcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTYgVGhlIFdlYlJUQyBwcm9qZWN0IGF1dGhvcnMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGEgQlNELXN0eWxlIGxpY2Vuc2VcbiAqICB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGluIHRoZSByb290IG9mIHRoZSBzb3VyY2VcbiAqICB0cmVlLlxuICovXG4vKiBlc2xpbnQtZW52IG5vZGUgKi9cbid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2hpbUdldFVzZXJNZWRpYSA9IHNoaW1HZXRVc2VyTWVkaWE7XG5mdW5jdGlvbiBzaGltR2V0VXNlck1lZGlhKHdpbmRvdykge1xuICB2YXIgbmF2aWdhdG9yID0gd2luZG93ICYmIHdpbmRvdy5uYXZpZ2F0b3I7XG5cbiAgdmFyIHNoaW1FcnJvcl8gPSBmdW5jdGlvbiBzaGltRXJyb3JfKGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogeyBQZXJtaXNzaW9uRGVuaWVkRXJyb3I6ICdOb3RBbGxvd2VkRXJyb3InIH1bZS5uYW1lXSB8fCBlLm5hbWUsXG4gICAgICBtZXNzYWdlOiBlLm1lc3NhZ2UsXG4gICAgICBjb25zdHJhaW50OiBlLmNvbnN0cmFpbnQsXG4gICAgICB0b1N0cmluZzogZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWU7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBnZXRVc2VyTWVkaWEgZXJyb3Igc2hpbS5cbiAgdmFyIG9yaWdHZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYS5iaW5kKG5hdmlnYXRvci5tZWRpYURldmljZXMpO1xuICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSA9IGZ1bmN0aW9uIChjKSB7XG4gICAgcmV0dXJuIG9yaWdHZXRVc2VyTWVkaWEoYykuY2F0Y2goZnVuY3Rpb24gKGUpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChzaGltRXJyb3JfKGUpKTtcbiAgICB9KTtcbiAgfTtcbn1cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuLyogZXNsaW50LWVudiBub2RlICovXG4ndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLnNoaW1HZXREaXNwbGF5TWVkaWEgPSBleHBvcnRzLnNoaW1HZXRVc2VyTWVkaWEgPSB1bmRlZmluZWQ7XG5cbnZhciBfdHlwZW9mID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIgPyBmdW5jdGlvbiAob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9IDogZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTtcblxudmFyIF9nZXR1c2VybWVkaWEgPSByZXF1aXJlKCcuL2dldHVzZXJtZWRpYScpO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ3NoaW1HZXRVc2VyTWVkaWEnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgIHJldHVybiBfZ2V0dXNlcm1lZGlhLnNoaW1HZXRVc2VyTWVkaWE7XG4gIH1cbn0pO1xuXG52YXIgX2dldGRpc3BsYXltZWRpYSA9IHJlcXVpcmUoJy4vZ2V0ZGlzcGxheW1lZGlhJyk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnc2hpbUdldERpc3BsYXlNZWRpYScsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIF9nZXRkaXNwbGF5bWVkaWEuc2hpbUdldERpc3BsYXlNZWRpYTtcbiAgfVxufSk7XG5leHBvcnRzLnNoaW1PblRyYWNrID0gc2hpbU9uVHJhY2s7XG5leHBvcnRzLnNoaW1QZWVyQ29ubmVjdGlvbiA9IHNoaW1QZWVyQ29ubmVjdGlvbjtcbmV4cG9ydHMuc2hpbVNlbmRlckdldFN0YXRzID0gc2hpbVNlbmRlckdldFN0YXRzO1xuZXhwb3J0cy5zaGltUmVjZWl2ZXJHZXRTdGF0cyA9IHNoaW1SZWNlaXZlckdldFN0YXRzO1xuZXhwb3J0cy5zaGltUmVtb3ZlU3RyZWFtID0gc2hpbVJlbW92ZVN0cmVhbTtcbmV4cG9ydHMuc2hpbVJUQ0RhdGFDaGFubmVsID0gc2hpbVJUQ0RhdGFDaGFubmVsO1xuZXhwb3J0cy5zaGltQWRkVHJhbnNjZWl2ZXIgPSBzaGltQWRkVHJhbnNjZWl2ZXI7XG5leHBvcnRzLnNoaW1HZXRQYXJhbWV0ZXJzID0gc2hpbUdldFBhcmFtZXRlcnM7XG5leHBvcnRzLnNoaW1DcmVhdGVPZmZlciA9IHNoaW1DcmVhdGVPZmZlcjtcbmV4cG9ydHMuc2hpbUNyZWF0ZUFuc3dlciA9IHNoaW1DcmVhdGVBbnN3ZXI7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG52YXIgdXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfdXRpbHMpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHZhbHVlKSB7IGlmIChrZXkgaW4gb2JqKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgeyB2YWx1ZTogdmFsdWUsIGVudW1lcmFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgd3JpdGFibGU6IHRydWUgfSk7IH0gZWxzZSB7IG9ialtrZXldID0gdmFsdWU7IH0gcmV0dXJuIG9iajsgfVxuXG5mdW5jdGlvbiBzaGltT25UcmFjayh3aW5kb3cpIHtcbiAgaWYgKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1RyYWNrRXZlbnQgJiYgJ3JlY2VpdmVyJyBpbiB3aW5kb3cuUlRDVHJhY2tFdmVudC5wcm90b3R5cGUgJiYgISgndHJhbnNjZWl2ZXInIGluIHdpbmRvdy5SVENUcmFja0V2ZW50LnByb3RvdHlwZSkpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LlJUQ1RyYWNrRXZlbnQucHJvdG90eXBlLCAndHJhbnNjZWl2ZXInLCB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIHsgcmVjZWl2ZXI6IHRoaXMucmVjZWl2ZXIgfTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaGltUGVlckNvbm5lY3Rpb24od2luZG93KSB7XG4gIHZhciBicm93c2VyRGV0YWlscyA9IHV0aWxzLmRldGVjdEJyb3dzZXIod2luZG93KTtcblxuICBpZiAoKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHdpbmRvdykpICE9PSAnb2JqZWN0JyB8fCAhKHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiB8fCB3aW5kb3cubW96UlRDUGVlckNvbm5lY3Rpb24pKSB7XG4gICAgcmV0dXJuOyAvLyBwcm9iYWJseSBtZWRpYS5wZWVyY29ubmVjdGlvbi5lbmFibGVkPWZhbHNlIGluIGFib3V0OmNvbmZpZ1xuICB9XG4gIGlmICghd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uICYmIHdpbmRvdy5tb3pSVENQZWVyQ29ubmVjdGlvbikge1xuICAgIC8vIHZlcnkgYmFzaWMgc3VwcG9ydCBmb3Igb2xkIHZlcnNpb25zLlxuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiA9IHdpbmRvdy5tb3pSVENQZWVyQ29ubmVjdGlvbjtcbiAgfVxuXG4gIGlmIChicm93c2VyRGV0YWlscy52ZXJzaW9uIDwgNTMpIHtcbiAgICAvLyBzaGltIGF3YXkgbmVlZCBmb3Igb2Jzb2xldGUgUlRDSWNlQ2FuZGlkYXRlL1JUQ1Nlc3Npb25EZXNjcmlwdGlvbi5cbiAgICBbJ3NldExvY2FsRGVzY3JpcHRpb24nLCAnc2V0UmVtb3RlRGVzY3JpcHRpb24nLCAnYWRkSWNlQ2FuZGlkYXRlJ10uZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgICB2YXIgbmF0aXZlTWV0aG9kID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdO1xuICAgICAgdmFyIG1ldGhvZE9iaiA9IF9kZWZpbmVQcm9wZXJ0eSh7fSwgbWV0aG9kLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFyZ3VtZW50c1swXSA9IG5ldyAobWV0aG9kID09PSAnYWRkSWNlQ2FuZGlkYXRlJyA/IHdpbmRvdy5SVENJY2VDYW5kaWRhdGUgOiB3aW5kb3cuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKShhcmd1bWVudHNbMF0pO1xuICAgICAgICByZXR1cm4gbmF0aXZlTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9KTtcbiAgICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXSA9IG1ldGhvZE9ialttZXRob2RdO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gc3VwcG9ydCBmb3IgYWRkSWNlQ2FuZGlkYXRlKG51bGwgb3IgdW5kZWZpbmVkKVxuICAvLyBhcyB3ZWxsIGFzIGlnbm9yaW5nIHtzZHBNaWQsIGNhbmRpZGF0ZTogXCJcIn1cbiAgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPCA2OCkge1xuICAgIHZhciBuYXRpdmVBZGRJY2VDYW5kaWRhdGUgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZTtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZSA9IGZ1bmN0aW9uIGFkZEljZUNhbmRpZGF0ZSgpIHtcbiAgICAgIGlmICghYXJndW1lbnRzWzBdKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHNbMV0pIHtcbiAgICAgICAgICBhcmd1bWVudHNbMV0uYXBwbHkobnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfVxuICAgICAgLy8gRmlyZWZveCA2OCsgZW1pdHMgYW5kIHByb2Nlc3NlcyB7Y2FuZGlkYXRlOiBcIlwiLCAuLi59LCBpZ25vcmVcbiAgICAgIC8vIGluIG9sZGVyIHZlcnNpb25zLlxuICAgICAgaWYgKGFyZ3VtZW50c1swXSAmJiBhcmd1bWVudHNbMF0uY2FuZGlkYXRlID09PSAnJykge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmF0aXZlQWRkSWNlQ2FuZGlkYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIHZhciBtb2Rlcm5TdGF0c1R5cGVzID0ge1xuICAgIGluYm91bmRydHA6ICdpbmJvdW5kLXJ0cCcsXG4gICAgb3V0Ym91bmRydHA6ICdvdXRib3VuZC1ydHAnLFxuICAgIGNhbmRpZGF0ZXBhaXI6ICdjYW5kaWRhdGUtcGFpcicsXG4gICAgbG9jYWxjYW5kaWRhdGU6ICdsb2NhbC1jYW5kaWRhdGUnLFxuICAgIHJlbW90ZWNhbmRpZGF0ZTogJ3JlbW90ZS1jYW5kaWRhdGUnXG4gIH07XG5cbiAgdmFyIG5hdGl2ZUdldFN0YXRzID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTdGF0cztcbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTdGF0cyA9IGZ1bmN0aW9uIGdldFN0YXRzKCkge1xuICAgIHZhciBfYXJndW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgICAgc2VsZWN0b3IgPSBfYXJndW1lbnRzWzBdLFxuICAgICAgICBvblN1Y2MgPSBfYXJndW1lbnRzWzFdLFxuICAgICAgICBvbkVyciA9IF9hcmd1bWVudHNbMl07XG5cbiAgICByZXR1cm4gbmF0aXZlR2V0U3RhdHMuYXBwbHkodGhpcywgW3NlbGVjdG9yIHx8IG51bGxdKS50aGVuKGZ1bmN0aW9uIChzdGF0cykge1xuICAgICAgaWYgKGJyb3dzZXJEZXRhaWxzLnZlcnNpb24gPCA1MyAmJiAhb25TdWNjKSB7XG4gICAgICAgIC8vIFNoaW0gb25seSBwcm9taXNlIGdldFN0YXRzIHdpdGggc3BlYy1oeXBoZW5zIGluIHR5cGUgbmFtZXNcbiAgICAgICAgLy8gTGVhdmUgY2FsbGJhY2sgdmVyc2lvbiBhbG9uZTsgbWlzYyBvbGQgdXNlcyBvZiBmb3JFYWNoIGJlZm9yZSBNYXBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzdGF0cy5mb3JFYWNoKGZ1bmN0aW9uIChzdGF0KSB7XG4gICAgICAgICAgICBzdGF0LnR5cGUgPSBtb2Rlcm5TdGF0c1R5cGVzW3N0YXQudHlwZV0gfHwgc3RhdC50eXBlO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGUubmFtZSAhPT0gJ1R5cGVFcnJvcicpIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIEF2b2lkIFR5cGVFcnJvcjogXCJ0eXBlXCIgaXMgcmVhZC1vbmx5LCBpbiBvbGQgdmVyc2lvbnMuIDM0LTQzaXNoXG4gICAgICAgICAgc3RhdHMuZm9yRWFjaChmdW5jdGlvbiAoc3RhdCwgaSkge1xuICAgICAgICAgICAgc3RhdHMuc2V0KGksIE9iamVjdC5hc3NpZ24oe30sIHN0YXQsIHtcbiAgICAgICAgICAgICAgdHlwZTogbW9kZXJuU3RhdHNUeXBlc1tzdGF0LnR5cGVdIHx8IHN0YXQudHlwZVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RhdHM7XG4gICAgfSkudGhlbihvblN1Y2MsIG9uRXJyKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2hpbVNlbmRlckdldFN0YXRzKHdpbmRvdykge1xuICBpZiAoISgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgPT09ICdvYmplY3QnICYmIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJiB3aW5kb3cuUlRDUnRwU2VuZGVyKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAod2luZG93LlJUQ1J0cFNlbmRlciAmJiAnZ2V0U3RhdHMnIGluIHdpbmRvdy5SVENSdHBTZW5kZXIucHJvdG90eXBlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBvcmlnR2V0U2VuZGVycyA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0U2VuZGVycztcbiAgaWYgKG9yaWdHZXRTZW5kZXJzKSB7XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRTZW5kZXJzID0gZnVuY3Rpb24gZ2V0U2VuZGVycygpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHZhciBzZW5kZXJzID0gb3JpZ0dldFNlbmRlcnMuYXBwbHkodGhpcywgW10pO1xuICAgICAgc2VuZGVycy5mb3JFYWNoKGZ1bmN0aW9uIChzZW5kZXIpIHtcbiAgICAgICAgcmV0dXJuIHNlbmRlci5fcGMgPSBfdGhpcztcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHNlbmRlcnM7XG4gICAgfTtcbiAgfVxuXG4gIHZhciBvcmlnQWRkVHJhY2sgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrO1xuICBpZiAob3JpZ0FkZFRyYWNrKSB7XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRUcmFjayA9IGZ1bmN0aW9uIGFkZFRyYWNrKCkge1xuICAgICAgdmFyIHNlbmRlciA9IG9yaWdBZGRUcmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgc2VuZGVyLl9wYyA9IHRoaXM7XG4gICAgICByZXR1cm4gc2VuZGVyO1xuICAgIH07XG4gIH1cbiAgd2luZG93LlJUQ1J0cFNlbmRlci5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbiBnZXRTdGF0cygpIHtcbiAgICByZXR1cm4gdGhpcy50cmFjayA/IHRoaXMuX3BjLmdldFN0YXRzKHRoaXMudHJhY2spIDogUHJvbWlzZS5yZXNvbHZlKG5ldyBNYXAoKSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHNoaW1SZWNlaXZlckdldFN0YXRzKHdpbmRvdykge1xuICBpZiAoISgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgPT09ICdvYmplY3QnICYmIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJiB3aW5kb3cuUlRDUnRwU2VuZGVyKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAod2luZG93LlJUQ1J0cFNlbmRlciAmJiAnZ2V0U3RhdHMnIGluIHdpbmRvdy5SVENSdHBSZWNlaXZlci5wcm90b3R5cGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG9yaWdHZXRSZWNlaXZlcnMgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFJlY2VpdmVycztcbiAgaWYgKG9yaWdHZXRSZWNlaXZlcnMpIHtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldFJlY2VpdmVycyA9IGZ1bmN0aW9uIGdldFJlY2VpdmVycygpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICB2YXIgcmVjZWl2ZXJzID0gb3JpZ0dldFJlY2VpdmVycy5hcHBseSh0aGlzLCBbXSk7XG4gICAgICByZWNlaXZlcnMuZm9yRWFjaChmdW5jdGlvbiAocmVjZWl2ZXIpIHtcbiAgICAgICAgcmV0dXJuIHJlY2VpdmVyLl9wYyA9IF90aGlzMjtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlY2VpdmVycztcbiAgICB9O1xuICB9XG4gIHV0aWxzLndyYXBQZWVyQ29ubmVjdGlvbkV2ZW50KHdpbmRvdywgJ3RyYWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICBlLnJlY2VpdmVyLl9wYyA9IGUuc3JjRWxlbWVudDtcbiAgICByZXR1cm4gZTtcbiAgfSk7XG4gIHdpbmRvdy5SVENSdHBSZWNlaXZlci5wcm90b3R5cGUuZ2V0U3RhdHMgPSBmdW5jdGlvbiBnZXRTdGF0cygpIHtcbiAgICByZXR1cm4gdGhpcy5fcGMuZ2V0U3RhdHModGhpcy50cmFjayk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHNoaW1SZW1vdmVTdHJlYW0od2luZG93KSB7XG4gIGlmICghd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uIHx8ICdyZW1vdmVTdHJlYW0nIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbiByZW1vdmVTdHJlYW0oc3RyZWFtKSB7XG4gICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICB1dGlscy5kZXByZWNhdGVkKCdyZW1vdmVTdHJlYW0nLCAncmVtb3ZlVHJhY2snKTtcbiAgICB0aGlzLmdldFNlbmRlcnMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzZW5kZXIpIHtcbiAgICAgIGlmIChzZW5kZXIudHJhY2sgJiYgc3RyZWFtLmdldFRyYWNrcygpLmluY2x1ZGVzKHNlbmRlci50cmFjaykpIHtcbiAgICAgICAgX3RoaXMzLnJlbW92ZVRyYWNrKHNlbmRlcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHNoaW1SVENEYXRhQ2hhbm5lbCh3aW5kb3cpIHtcbiAgLy8gcmVuYW1lIERhdGFDaGFubmVsIHRvIFJUQ0RhdGFDaGFubmVsIChuYXRpdmUgZml4IGluIEZGNjApOlxuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xMTczODUxXG4gIGlmICh3aW5kb3cuRGF0YUNoYW5uZWwgJiYgIXdpbmRvdy5SVENEYXRhQ2hhbm5lbCkge1xuICAgIHdpbmRvdy5SVENEYXRhQ2hhbm5lbCA9IHdpbmRvdy5EYXRhQ2hhbm5lbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaGltQWRkVHJhbnNjZWl2ZXIod2luZG93KSB7XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJydGNIYWNrcy9hZGFwdGVyL2lzc3Vlcy85OTgjaXNzdWVjb21tZW50LTUxNjkyMTY0N1xuICAvLyBGaXJlZm94IGlnbm9yZXMgdGhlIGluaXQgc2VuZEVuY29kaW5ncyBvcHRpb25zIHBhc3NlZCB0byBhZGRUcmFuc2NlaXZlclxuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xMzk2OTE4XG4gIGlmICghKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgb3JpZ0FkZFRyYW5zY2VpdmVyID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRUcmFuc2NlaXZlcjtcbiAgaWYgKG9yaWdBZGRUcmFuc2NlaXZlcikge1xuICAgIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhbnNjZWl2ZXIgPSBmdW5jdGlvbiBhZGRUcmFuc2NlaXZlcigpIHtcbiAgICAgIHRoaXMuc2V0UGFyYW1ldGVyc1Byb21pc2VzID0gW107XG4gICAgICB2YXIgaW5pdFBhcmFtZXRlcnMgPSBhcmd1bWVudHNbMV07XG4gICAgICB2YXIgc2hvdWxkUGVyZm9ybUNoZWNrID0gaW5pdFBhcmFtZXRlcnMgJiYgJ3NlbmRFbmNvZGluZ3MnIGluIGluaXRQYXJhbWV0ZXJzO1xuICAgICAgaWYgKHNob3VsZFBlcmZvcm1DaGVjaykge1xuICAgICAgICAvLyBJZiBzZW5kRW5jb2RpbmdzIHBhcmFtcyBhcmUgcHJvdmlkZWQsIHZhbGlkYXRlIGdyYW1tYXJcbiAgICAgICAgaW5pdFBhcmFtZXRlcnMuc2VuZEVuY29kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uIChlbmNvZGluZ1BhcmFtKSB7XG4gICAgICAgICAgaWYgKCdyaWQnIGluIGVuY29kaW5nUGFyYW0pIHtcbiAgICAgICAgICAgIHZhciByaWRSZWdleCA9IC9eW2EtejAtOV17MCwxNn0kL2k7XG4gICAgICAgICAgICBpZiAoIXJpZFJlZ2V4LnRlc3QoZW5jb2RpbmdQYXJhbS5yaWQpKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgUklEIHZhbHVlIHByb3ZpZGVkLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJ3NjYWxlUmVzb2x1dGlvbkRvd25CeScgaW4gZW5jb2RpbmdQYXJhbSkge1xuICAgICAgICAgICAgaWYgKCEocGFyc2VGbG9hdChlbmNvZGluZ1BhcmFtLnNjYWxlUmVzb2x1dGlvbkRvd25CeSkgPj0gMS4wKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc2NhbGVfcmVzb2x1dGlvbl9kb3duX2J5IG11c3QgYmUgPj0gMS4wJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICgnbWF4RnJhbWVyYXRlJyBpbiBlbmNvZGluZ1BhcmFtKSB7XG4gICAgICAgICAgICBpZiAoIShwYXJzZUZsb2F0KGVuY29kaW5nUGFyYW0ubWF4RnJhbWVyYXRlKSA+PSAwKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignbWF4X2ZyYW1lcmF0ZSBtdXN0IGJlID49IDAuMCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICB2YXIgdHJhbnNjZWl2ZXIgPSBvcmlnQWRkVHJhbnNjZWl2ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGlmIChzaG91bGRQZXJmb3JtQ2hlY2spIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGluaXQgb3B0aW9ucyB3ZXJlIGFwcGxpZWQuIElmIG5vdCB3ZSBkbyB0aGlzIGluIGFuXG4gICAgICAgIC8vIGFzeW5jaHJvbm91cyB3YXkgYW5kIHNhdmUgdGhlIHByb21pc2UgcmVmZXJlbmNlIGluIGEgZ2xvYmFsIG9iamVjdC5cbiAgICAgICAgLy8gVGhpcyBpcyBhbiB1Z2x5IGhhY2ssIGJ1dCBhdCB0aGUgc2FtZSB0aW1lIGlzIHdheSBtb3JlIHJvYnVzdCB0aGFuXG4gICAgICAgIC8vIGNoZWNraW5nIHRoZSBzZW5kZXIgcGFyYW1ldGVycyBiZWZvcmUgYW5kIGFmdGVyIHRoZSBjcmVhdGVPZmZlclxuICAgICAgICAvLyBBbHNvIG5vdGUgdGhhdCBhZnRlciB0aGUgY3JlYXRlb2ZmZXIgd2UgYXJlIG5vdCAxMDAlIHN1cmUgdGhhdFxuICAgICAgICAvLyB0aGUgcGFyYW1zIHdlcmUgYXN5bmNocm9ub3VzbHkgYXBwbGllZCBzbyB3ZSBtaWdodCBtaXNzIHRoZVxuICAgICAgICAvLyBvcHBvcnR1bml0eSB0byByZWNyZWF0ZSBvZmZlci5cbiAgICAgICAgdmFyIHNlbmRlciA9IHRyYW5zY2VpdmVyLnNlbmRlcjtcblxuICAgICAgICB2YXIgcGFyYW1zID0gc2VuZGVyLmdldFBhcmFtZXRlcnMoKTtcbiAgICAgICAgaWYgKCEoJ2VuY29kaW5ncycgaW4gcGFyYW1zKSB8fFxuICAgICAgICAvLyBBdm9pZCBiZWluZyBmb29sZWQgYnkgcGF0Y2hlZCBnZXRQYXJhbWV0ZXJzKCkgYmVsb3cuXG4gICAgICAgIHBhcmFtcy5lbmNvZGluZ3MubGVuZ3RoID09PSAxICYmIE9iamVjdC5rZXlzKHBhcmFtcy5lbmNvZGluZ3NbMF0pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHBhcmFtcy5lbmNvZGluZ3MgPSBpbml0UGFyYW1ldGVycy5zZW5kRW5jb2RpbmdzO1xuICAgICAgICAgIHNlbmRlci5zZW5kRW5jb2RpbmdzID0gaW5pdFBhcmFtZXRlcnMuc2VuZEVuY29kaW5ncztcbiAgICAgICAgICB0aGlzLnNldFBhcmFtZXRlcnNQcm9taXNlcy5wdXNoKHNlbmRlci5zZXRQYXJhbWV0ZXJzKHBhcmFtcykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkZWxldGUgc2VuZGVyLnNlbmRFbmNvZGluZ3M7XG4gICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZGVsZXRlIHNlbmRlci5zZW5kRW5jb2RpbmdzO1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRyYW5zY2VpdmVyO1xuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gc2hpbUdldFBhcmFtZXRlcnMod2luZG93KSB7XG4gIGlmICghKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1J0cFNlbmRlcikpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG9yaWdHZXRQYXJhbWV0ZXJzID0gd2luZG93LlJUQ1J0cFNlbmRlci5wcm90b3R5cGUuZ2V0UGFyYW1ldGVycztcbiAgaWYgKG9yaWdHZXRQYXJhbWV0ZXJzKSB7XG4gICAgd2luZG93LlJUQ1J0cFNlbmRlci5wcm90b3R5cGUuZ2V0UGFyYW1ldGVycyA9IGZ1bmN0aW9uIGdldFBhcmFtZXRlcnMoKSB7XG4gICAgICB2YXIgcGFyYW1zID0gb3JpZ0dldFBhcmFtZXRlcnMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGlmICghKCdlbmNvZGluZ3MnIGluIHBhcmFtcykpIHtcbiAgICAgICAgcGFyYW1zLmVuY29kaW5ncyA9IFtdLmNvbmNhdCh0aGlzLnNlbmRFbmNvZGluZ3MgfHwgW3t9XSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFyYW1zO1xuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gc2hpbUNyZWF0ZU9mZmVyKHdpbmRvdykge1xuICAvLyBodHRwczovL2dpdGh1Yi5jb20vd2VicnRjSGFja3MvYWRhcHRlci9pc3N1ZXMvOTk4I2lzc3VlY29tbWVudC01MTY5MjE2NDdcbiAgLy8gRmlyZWZveCBpZ25vcmVzIHRoZSBpbml0IHNlbmRFbmNvZGluZ3Mgb3B0aW9ucyBwYXNzZWQgdG8gYWRkVHJhbnNjZWl2ZXJcbiAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTM5NjkxOFxuICBpZiAoISgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgPT09ICdvYmplY3QnICYmIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbikpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG9yaWdDcmVhdGVPZmZlciA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlT2ZmZXI7XG4gIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlT2ZmZXIgPSBmdW5jdGlvbiBjcmVhdGVPZmZlcigpIHtcbiAgICB2YXIgX3RoaXM0ID0gdGhpcyxcbiAgICAgICAgX2FyZ3VtZW50czIgPSBhcmd1bWVudHM7XG5cbiAgICBpZiAodGhpcy5zZXRQYXJhbWV0ZXJzUHJvbWlzZXMgJiYgdGhpcy5zZXRQYXJhbWV0ZXJzUHJvbWlzZXMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwodGhpcy5zZXRQYXJhbWV0ZXJzUHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gb3JpZ0NyZWF0ZU9mZmVyLmFwcGx5KF90aGlzNCwgX2FyZ3VtZW50czIpO1xuICAgICAgfSkuZmluYWxseShmdW5jdGlvbiAoKSB7XG4gICAgICAgIF90aGlzNC5zZXRQYXJhbWV0ZXJzUHJvbWlzZXMgPSBbXTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gb3JpZ0NyZWF0ZU9mZmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHNoaW1DcmVhdGVBbnN3ZXIod2luZG93KSB7XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJydGNIYWNrcy9hZGFwdGVyL2lzc3Vlcy85OTgjaXNzdWVjb21tZW50LTUxNjkyMTY0N1xuICAvLyBGaXJlZm94IGlnbm9yZXMgdGhlIGluaXQgc2VuZEVuY29kaW5ncyBvcHRpb25zIHBhc3NlZCB0byBhZGRUcmFuc2NlaXZlclxuICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xMzk2OTE4XG4gIGlmICghKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgb3JpZ0NyZWF0ZUFuc3dlciA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlQW5zd2VyO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZUFuc3dlciA9IGZ1bmN0aW9uIGNyZWF0ZUFuc3dlcigpIHtcbiAgICB2YXIgX3RoaXM1ID0gdGhpcyxcbiAgICAgICAgX2FyZ3VtZW50czMgPSBhcmd1bWVudHM7XG5cbiAgICBpZiAodGhpcy5zZXRQYXJhbWV0ZXJzUHJvbWlzZXMgJiYgdGhpcy5zZXRQYXJhbWV0ZXJzUHJvbWlzZXMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwodGhpcy5zZXRQYXJhbWV0ZXJzUHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gb3JpZ0NyZWF0ZUFuc3dlci5hcHBseShfdGhpczUsIF9hcmd1bWVudHMzKTtcbiAgICAgIH0pLmZpbmFsbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICBfdGhpczUuc2V0UGFyYW1ldGVyc1Byb21pc2VzID0gW107XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG9yaWdDcmVhdGVBbnN3ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcbn1cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE4IFRoZSBhZGFwdGVyLmpzIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5zaGltR2V0RGlzcGxheU1lZGlhID0gc2hpbUdldERpc3BsYXlNZWRpYTtcbmZ1bmN0aW9uIHNoaW1HZXREaXNwbGF5TWVkaWEod2luZG93LCBwcmVmZXJyZWRNZWRpYVNvdXJjZSkge1xuICBpZiAod2luZG93Lm5hdmlnYXRvci5tZWRpYURldmljZXMgJiYgJ2dldERpc3BsYXlNZWRpYScgaW4gd2luZG93Lm5hdmlnYXRvci5tZWRpYURldmljZXMpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCF3aW5kb3cubmF2aWdhdG9yLm1lZGlhRGV2aWNlcykge1xuICAgIHJldHVybjtcbiAgfVxuICB3aW5kb3cubmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXREaXNwbGF5TWVkaWEgPSBmdW5jdGlvbiBnZXREaXNwbGF5TWVkaWEoY29uc3RyYWludHMpIHtcbiAgICBpZiAoIShjb25zdHJhaW50cyAmJiBjb25zdHJhaW50cy52aWRlbykpIHtcbiAgICAgIHZhciBlcnIgPSBuZXcgRE9NRXhjZXB0aW9uKCdnZXREaXNwbGF5TWVkaWEgd2l0aG91dCB2aWRlbyAnICsgJ2NvbnN0cmFpbnRzIGlzIHVuZGVmaW5lZCcpO1xuICAgICAgZXJyLm5hbWUgPSAnTm90Rm91bmRFcnJvcic7XG4gICAgICAvLyBmcm9tIGh0dHBzOi8vaGV5Y2FtLmdpdGh1Yi5pby93ZWJpZGwvI2lkbC1ET01FeGNlcHRpb24tZXJyb3ItbmFtZXNcbiAgICAgIGVyci5jb2RlID0gODtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgIH1cbiAgICBpZiAoY29uc3RyYWludHMudmlkZW8gPT09IHRydWUpIHtcbiAgICAgIGNvbnN0cmFpbnRzLnZpZGVvID0geyBtZWRpYVNvdXJjZTogcHJlZmVycmVkTWVkaWFTb3VyY2UgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3RyYWludHMudmlkZW8ubWVkaWFTb3VyY2UgPSBwcmVmZXJyZWRNZWRpYVNvdXJjZTtcbiAgICB9XG4gICAgcmV0dXJuIHdpbmRvdy5uYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShjb25zdHJhaW50cyk7XG4gIH07XG59XG4iLCIvKlxuICogIENvcHlyaWdodCAoYykgMjAxNiBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbmV4cG9ydHMuc2hpbUdldFVzZXJNZWRpYSA9IHNoaW1HZXRVc2VyTWVkaWE7XG5cbnZhciBfdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG52YXIgdXRpbHMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChfdXRpbHMpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGVsc2UgeyB2YXIgbmV3T2JqID0ge307IGlmIChvYmogIT0gbnVsbCkgeyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSBuZXdPYmpba2V5XSA9IG9ialtrZXldOyB9IH0gbmV3T2JqLmRlZmF1bHQgPSBvYmo7IHJldHVybiBuZXdPYmo7IH0gfVxuXG5mdW5jdGlvbiBzaGltR2V0VXNlck1lZGlhKHdpbmRvdykge1xuICB2YXIgYnJvd3NlckRldGFpbHMgPSB1dGlscy5kZXRlY3RCcm93c2VyKHdpbmRvdyk7XG4gIHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cgJiYgd2luZG93Lm5hdmlnYXRvcjtcbiAgdmFyIE1lZGlhU3RyZWFtVHJhY2sgPSB3aW5kb3cgJiYgd2luZG93Lk1lZGlhU3RyZWFtVHJhY2s7XG5cbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IGZ1bmN0aW9uIChjb25zdHJhaW50cywgb25TdWNjZXNzLCBvbkVycm9yKSB7XG4gICAgLy8gUmVwbGFjZSBGaXJlZm94IDQ0KydzIGRlcHJlY2F0aW9uIHdhcm5pbmcgd2l0aCB1bnByZWZpeGVkIHZlcnNpb24uXG4gICAgdXRpbHMuZGVwcmVjYXRlZCgnbmF2aWdhdG9yLmdldFVzZXJNZWRpYScsICduYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYScpO1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKS50aGVuKG9uU3VjY2Vzcywgb25FcnJvcik7XG4gIH07XG5cbiAgaWYgKCEoYnJvd3NlckRldGFpbHMudmVyc2lvbiA+IDU1ICYmICdhdXRvR2FpbkNvbnRyb2wnIGluIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0U3VwcG9ydGVkQ29uc3RyYWludHMoKSkpIHtcbiAgICB2YXIgcmVtYXAgPSBmdW5jdGlvbiByZW1hcChvYmosIGEsIGIpIHtcbiAgICAgIGlmIChhIGluIG9iaiAmJiAhKGIgaW4gb2JqKSkge1xuICAgICAgICBvYmpbYl0gPSBvYmpbYV07XG4gICAgICAgIGRlbGV0ZSBvYmpbYV07XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciBuYXRpdmVHZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYS5iaW5kKG5hdmlnYXRvci5tZWRpYURldmljZXMpO1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhID0gZnVuY3Rpb24gKGMpIHtcbiAgICAgIGlmICgodHlwZW9mIGMgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGMpKSA9PT0gJ29iamVjdCcgJiYgX3R5cGVvZihjLmF1ZGlvKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgYyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYykpO1xuICAgICAgICByZW1hcChjLmF1ZGlvLCAnYXV0b0dhaW5Db250cm9sJywgJ21vekF1dG9HYWluQ29udHJvbCcpO1xuICAgICAgICByZW1hcChjLmF1ZGlvLCAnbm9pc2VTdXBwcmVzc2lvbicsICdtb3pOb2lzZVN1cHByZXNzaW9uJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmF0aXZlR2V0VXNlck1lZGlhKGMpO1xuICAgIH07XG5cbiAgICBpZiAoTWVkaWFTdHJlYW1UcmFjayAmJiBNZWRpYVN0cmVhbVRyYWNrLnByb3RvdHlwZS5nZXRTZXR0aW5ncykge1xuICAgICAgdmFyIG5hdGl2ZUdldFNldHRpbmdzID0gTWVkaWFTdHJlYW1UcmFjay5wcm90b3R5cGUuZ2V0U2V0dGluZ3M7XG4gICAgICBNZWRpYVN0cmVhbVRyYWNrLnByb3RvdHlwZS5nZXRTZXR0aW5ncyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9iaiA9IG5hdGl2ZUdldFNldHRpbmdzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJlbWFwKG9iaiwgJ21vekF1dG9HYWluQ29udHJvbCcsICdhdXRvR2FpbkNvbnRyb2wnKTtcbiAgICAgICAgcmVtYXAob2JqLCAnbW96Tm9pc2VTdXBwcmVzc2lvbicsICdub2lzZVN1cHByZXNzaW9uJyk7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChNZWRpYVN0cmVhbVRyYWNrICYmIE1lZGlhU3RyZWFtVHJhY2sucHJvdG90eXBlLmFwcGx5Q29uc3RyYWludHMpIHtcbiAgICAgIHZhciBuYXRpdmVBcHBseUNvbnN0cmFpbnRzID0gTWVkaWFTdHJlYW1UcmFjay5wcm90b3R5cGUuYXBwbHlDb25zdHJhaW50cztcbiAgICAgIE1lZGlhU3RyZWFtVHJhY2sucHJvdG90eXBlLmFwcGx5Q29uc3RyYWludHMgPSBmdW5jdGlvbiAoYykge1xuICAgICAgICBpZiAodGhpcy5raW5kID09PSAnYXVkaW8nICYmICh0eXBlb2YgYyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2YoYykpID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGMpKTtcbiAgICAgICAgICByZW1hcChjLCAnYXV0b0dhaW5Db250cm9sJywgJ21vekF1dG9HYWluQ29udHJvbCcpO1xuICAgICAgICAgIHJlbWFwKGMsICdub2lzZVN1cHByZXNzaW9uJywgJ21vek5vaXNlU3VwcHJlc3Npb24nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmF0aXZlQXBwbHlDb25zdHJhaW50cy5hcHBseSh0aGlzLCBbY10pO1xuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cbiIsIi8qXG4gKiAgQ29weXJpZ2h0IChjKSAyMDE2IFRoZSBXZWJSVEMgcHJvamVjdCBhdXRob3JzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqICBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhIEJTRC1zdHlsZSBsaWNlbnNlXG4gKiAgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBvZiB0aGUgc291cmNlXG4gKiAgdHJlZS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbmV4cG9ydHMuc2hpbUxvY2FsU3RyZWFtc0FQSSA9IHNoaW1Mb2NhbFN0cmVhbXNBUEk7XG5leHBvcnRzLnNoaW1SZW1vdGVTdHJlYW1zQVBJID0gc2hpbVJlbW90ZVN0cmVhbXNBUEk7XG5leHBvcnRzLnNoaW1DYWxsYmFja3NBUEkgPSBzaGltQ2FsbGJhY2tzQVBJO1xuZXhwb3J0cy5zaGltR2V0VXNlck1lZGlhID0gc2hpbUdldFVzZXJNZWRpYTtcbmV4cG9ydHMuc2hpbUNvbnN0cmFpbnRzID0gc2hpbUNvbnN0cmFpbnRzO1xuZXhwb3J0cy5zaGltUlRDSWNlU2VydmVyVXJscyA9IHNoaW1SVENJY2VTZXJ2ZXJVcmxzO1xuZXhwb3J0cy5zaGltVHJhY2tFdmVudFRyYW5zY2VpdmVyID0gc2hpbVRyYWNrRXZlbnRUcmFuc2NlaXZlcjtcbmV4cG9ydHMuc2hpbUNyZWF0ZU9mZmVyTGVnYWN5ID0gc2hpbUNyZWF0ZU9mZmVyTGVnYWN5O1xuZXhwb3J0cy5zaGltQXVkaW9Db250ZXh0ID0gc2hpbUF1ZGlvQ29udGV4dDtcblxudmFyIF91dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbnZhciB1dGlscyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKF91dGlscyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKG9iaikgeyBpZiAob2JqICYmIG9iai5fX2VzTW9kdWxlKSB7IHJldHVybiBvYmo7IH0gZWxzZSB7IHZhciBuZXdPYmogPSB7fTsgaWYgKG9iaiAhPSBudWxsKSB7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSBuZXdPYmouZGVmYXVsdCA9IG9iajsgcmV0dXJuIG5ld09iajsgfSB9XG5cbmZ1bmN0aW9uIHNoaW1Mb2NhbFN0cmVhbXNBUEkod2luZG93KSB7XG4gIGlmICgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgIT09ICdvYmplY3QnIHx8ICF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCEoJ2dldExvY2FsU3RyZWFtcycgaW4gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZSkpIHtcbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmdldExvY2FsU3RyZWFtcyA9IGZ1bmN0aW9uIGdldExvY2FsU3RyZWFtcygpIHtcbiAgICAgIGlmICghdGhpcy5fbG9jYWxTdHJlYW1zKSB7XG4gICAgICAgIHRoaXMuX2xvY2FsU3RyZWFtcyA9IFtdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX2xvY2FsU3RyZWFtcztcbiAgICB9O1xuICB9XG4gIGlmICghKCdhZGRTdHJlYW0nIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgdmFyIF9hZGRUcmFjayA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuYWRkVHJhY2s7XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5hZGRTdHJlYW0gPSBmdW5jdGlvbiBhZGRTdHJlYW0oc3RyZWFtKSB7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICBpZiAoIXRoaXMuX2xvY2FsU3RyZWFtcykge1xuICAgICAgICB0aGlzLl9sb2NhbFN0cmVhbXMgPSBbXTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5fbG9jYWxTdHJlYW1zLmluY2x1ZGVzKHN0cmVhbSkpIHtcbiAgICAgICAgdGhpcy5fbG9jYWxTdHJlYW1zLnB1c2goc3RyZWFtKTtcbiAgICAgIH1cbiAgICAgIC8vIFRyeSB0byBlbXVsYXRlIENocm9tZSdzIGJlaGF2aW91ciBvZiBhZGRpbmcgaW4gYXVkaW8tdmlkZW8gb3JkZXIuXG4gICAgICAvLyBTYWZhcmkgb3JkZXJzIGJ5IHRyYWNrIGlkLlxuICAgICAgc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9hZGRUcmFjay5jYWxsKF90aGlzLCB0cmFjaywgc3RyZWFtKTtcbiAgICAgIH0pO1xuICAgICAgc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkuZm9yRWFjaChmdW5jdGlvbiAodHJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9hZGRUcmFjay5jYWxsKF90aGlzLCB0cmFjaywgc3RyZWFtKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmFkZFRyYWNrID0gZnVuY3Rpb24gYWRkVHJhY2sodHJhY2spIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgc3RyZWFtcyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgc3RyZWFtc1tfa2V5IC0gMV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgICB9XG5cbiAgICAgIGlmIChzdHJlYW1zKSB7XG4gICAgICAgIHN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgICAgaWYgKCFfdGhpczIuX2xvY2FsU3RyZWFtcykge1xuICAgICAgICAgICAgX3RoaXMyLl9sb2NhbFN0cmVhbXMgPSBbc3RyZWFtXTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCFfdGhpczIuX2xvY2FsU3RyZWFtcy5pbmNsdWRlcyhzdHJlYW0pKSB7XG4gICAgICAgICAgICBfdGhpczIuX2xvY2FsU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBfYWRkVHJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG4gIGlmICghKCdyZW1vdmVTdHJlYW0nIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbiByZW1vdmVTdHJlYW0oc3RyZWFtKSB7XG4gICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgaWYgKCF0aGlzLl9sb2NhbFN0cmVhbXMpIHtcbiAgICAgICAgdGhpcy5fbG9jYWxTdHJlYW1zID0gW107XG4gICAgICB9XG4gICAgICB2YXIgaW5kZXggPSB0aGlzLl9sb2NhbFN0cmVhbXMuaW5kZXhPZihzdHJlYW0pO1xuICAgICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLl9sb2NhbFN0cmVhbXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIHZhciB0cmFja3MgPSBzdHJlYW0uZ2V0VHJhY2tzKCk7XG4gICAgICB0aGlzLmdldFNlbmRlcnMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzZW5kZXIpIHtcbiAgICAgICAgaWYgKHRyYWNrcy5pbmNsdWRlcyhzZW5kZXIudHJhY2spKSB7XG4gICAgICAgICAgX3RoaXMzLnJlbW92ZVRyYWNrKHNlbmRlcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gc2hpbVJlbW90ZVN0cmVhbXNBUEkod2luZG93KSB7XG4gIGlmICgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgIT09ICdvYmplY3QnIHx8ICF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCEoJ2dldFJlbW90ZVN0cmVhbXMnIGluIHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUpKSB7XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5nZXRSZW1vdGVTdHJlYW1zID0gZnVuY3Rpb24gZ2V0UmVtb3RlU3RyZWFtcygpIHtcbiAgICAgIHJldHVybiB0aGlzLl9yZW1vdGVTdHJlYW1zID8gdGhpcy5fcmVtb3RlU3RyZWFtcyA6IFtdO1xuICAgIH07XG4gIH1cbiAgaWYgKCEoJ29uYWRkc3RyZWFtJyBpbiB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlKSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLCAnb25hZGRzdHJlYW0nLCB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29uYWRkc3RyZWFtO1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24gc2V0KGYpIHtcbiAgICAgICAgdmFyIF90aGlzNCA9IHRoaXM7XG5cbiAgICAgICAgaWYgKHRoaXMuX29uYWRkc3RyZWFtKSB7XG4gICAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCdhZGRzdHJlYW0nLCB0aGlzLl9vbmFkZHN0cmVhbSk7XG4gICAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0cmFjaycsIHRoaXMuX29uYWRkc3RyZWFtcG9seSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKCdhZGRzdHJlYW0nLCB0aGlzLl9vbmFkZHN0cmVhbSA9IGYpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RyYWNrJywgdGhpcy5fb25hZGRzdHJlYW1wb2x5ID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICBlLnN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgICAgICBpZiAoIV90aGlzNC5fcmVtb3RlU3RyZWFtcykge1xuICAgICAgICAgICAgICBfdGhpczQuX3JlbW90ZVN0cmVhbXMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChfdGhpczQuX3JlbW90ZVN0cmVhbXMuaW5jbHVkZXMoc3RyZWFtKSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfdGhpczQuX3JlbW90ZVN0cmVhbXMucHVzaChzdHJlYW0pO1xuICAgICAgICAgICAgdmFyIGV2ZW50ID0gbmV3IEV2ZW50KCdhZGRzdHJlYW0nKTtcbiAgICAgICAgICAgIGV2ZW50LnN0cmVhbSA9IHN0cmVhbTtcbiAgICAgICAgICAgIF90aGlzNC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdmFyIG9yaWdTZXRSZW1vdGVEZXNjcmlwdGlvbiA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb247XG4gICAgd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIHNldFJlbW90ZURlc2NyaXB0aW9uKCkge1xuICAgICAgdmFyIHBjID0gdGhpcztcbiAgICAgIGlmICghdGhpcy5fb25hZGRzdHJlYW1wb2x5KSB7XG4gICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndHJhY2snLCB0aGlzLl9vbmFkZHN0cmVhbXBvbHkgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIGUuc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgICAgIGlmICghcGMuX3JlbW90ZVN0cmVhbXMpIHtcbiAgICAgICAgICAgICAgcGMuX3JlbW90ZVN0cmVhbXMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwYy5fcmVtb3RlU3RyZWFtcy5pbmRleE9mKHN0cmVhbSkgPj0gMCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYy5fcmVtb3RlU3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgICAgICAgICB2YXIgZXZlbnQgPSBuZXcgRXZlbnQoJ2FkZHN0cmVhbScpO1xuICAgICAgICAgICAgZXZlbnQuc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICAgICAgcGMuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaWdTZXRSZW1vdGVEZXNjcmlwdGlvbi5hcHBseShwYywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIHNoaW1DYWxsYmFja3NBUEkod2luZG93KSB7XG4gIGlmICgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgIT09ICdvYmplY3QnIHx8ICF3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24pIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHByb3RvdHlwZSA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGU7XG4gIHZhciBvcmlnQ3JlYXRlT2ZmZXIgPSBwcm90b3R5cGUuY3JlYXRlT2ZmZXI7XG4gIHZhciBvcmlnQ3JlYXRlQW5zd2VyID0gcHJvdG90eXBlLmNyZWF0ZUFuc3dlcjtcbiAgdmFyIHNldExvY2FsRGVzY3JpcHRpb24gPSBwcm90b3R5cGUuc2V0TG9jYWxEZXNjcmlwdGlvbjtcbiAgdmFyIHNldFJlbW90ZURlc2NyaXB0aW9uID0gcHJvdG90eXBlLnNldFJlbW90ZURlc2NyaXB0aW9uO1xuICB2YXIgYWRkSWNlQ2FuZGlkYXRlID0gcHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZTtcblxuICBwcm90b3R5cGUuY3JlYXRlT2ZmZXIgPSBmdW5jdGlvbiBjcmVhdGVPZmZlcihzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA+PSAyID8gYXJndW1lbnRzWzJdIDogYXJndW1lbnRzWzBdO1xuICAgIHZhciBwcm9taXNlID0gb3JpZ0NyZWF0ZU9mZmVyLmFwcGx5KHRoaXMsIFtvcHRpb25zXSk7XG4gICAgaWYgKCFmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbiAgICBwcm9taXNlLnRoZW4oc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfTtcblxuICBwcm90b3R5cGUuY3JlYXRlQW5zd2VyID0gZnVuY3Rpb24gY3JlYXRlQW5zd2VyKHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID49IDIgPyBhcmd1bWVudHNbMl0gOiBhcmd1bWVudHNbMF07XG4gICAgdmFyIHByb21pc2UgPSBvcmlnQ3JlYXRlQW5zd2VyLmFwcGx5KHRoaXMsIFtvcHRpb25zXSk7XG4gICAgaWYgKCFmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbiAgICBwcm9taXNlLnRoZW4oc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfTtcblxuICB2YXIgd2l0aENhbGxiYWNrID0gZnVuY3Rpb24gd2l0aENhbGxiYWNrKGRlc2NyaXB0aW9uLCBzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gc2V0TG9jYWxEZXNjcmlwdGlvbi5hcHBseSh0aGlzLCBbZGVzY3JpcHRpb25dKTtcbiAgICBpZiAoIWZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIHByb21pc2UudGhlbihzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjayk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9O1xuICBwcm90b3R5cGUuc2V0TG9jYWxEZXNjcmlwdGlvbiA9IHdpdGhDYWxsYmFjaztcblxuICB3aXRoQ2FsbGJhY2sgPSBmdW5jdGlvbiB3aXRoQ2FsbGJhY2soZGVzY3JpcHRpb24sIHN1Y2Nlc3NDYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrKSB7XG4gICAgdmFyIHByb21pc2UgPSBzZXRSZW1vdGVEZXNjcmlwdGlvbi5hcHBseSh0aGlzLCBbZGVzY3JpcHRpb25dKTtcbiAgICBpZiAoIWZhaWx1cmVDYWxsYmFjaykge1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIHByb21pc2UudGhlbihzdWNjZXNzQ2FsbGJhY2ssIGZhaWx1cmVDYWxsYmFjayk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9O1xuICBwcm90b3R5cGUuc2V0UmVtb3RlRGVzY3JpcHRpb24gPSB3aXRoQ2FsbGJhY2s7XG5cbiAgd2l0aENhbGxiYWNrID0gZnVuY3Rpb24gd2l0aENhbGxiYWNrKGNhbmRpZGF0ZSwgc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICB2YXIgcHJvbWlzZSA9IGFkZEljZUNhbmRpZGF0ZS5hcHBseSh0aGlzLCBbY2FuZGlkYXRlXSk7XG4gICAgaWYgKCFmYWlsdXJlQ2FsbGJhY2spIHtcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH1cbiAgICBwcm9taXNlLnRoZW4oc3VjY2Vzc0NhbGxiYWNrLCBmYWlsdXJlQ2FsbGJhY2spO1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfTtcbiAgcHJvdG90eXBlLmFkZEljZUNhbmRpZGF0ZSA9IHdpdGhDYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gc2hpbUdldFVzZXJNZWRpYSh3aW5kb3cpIHtcbiAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdyAmJiB3aW5kb3cubmF2aWdhdG9yO1xuXG4gIGlmIChuYXZpZ2F0b3IubWVkaWFEZXZpY2VzICYmIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKSB7XG4gICAgLy8gc2hpbSBub3QgbmVlZGVkIGluIFNhZmFyaSAxMi4xXG4gICAgdmFyIG1lZGlhRGV2aWNlcyA9IG5hdmlnYXRvci5tZWRpYURldmljZXM7XG4gICAgdmFyIF9nZXRVc2VyTWVkaWEgPSBtZWRpYURldmljZXMuZ2V0VXNlck1lZGlhLmJpbmQobWVkaWFEZXZpY2VzKTtcbiAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSA9IGZ1bmN0aW9uIChjb25zdHJhaW50cykge1xuICAgICAgcmV0dXJuIF9nZXRVc2VyTWVkaWEoc2hpbUNvbnN0cmFpbnRzKGNvbnN0cmFpbnRzKSk7XG4gICAgfTtcbiAgfVxuXG4gIGlmICghbmF2aWdhdG9yLmdldFVzZXJNZWRpYSAmJiBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzICYmIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKSB7XG4gICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IGZ1bmN0aW9uIGdldFVzZXJNZWRpYShjb25zdHJhaW50cywgY2IsIGVycmNiKSB7XG4gICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShjb25zdHJhaW50cykudGhlbihjYiwgZXJyY2IpO1xuICAgIH0uYmluZChuYXZpZ2F0b3IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNoaW1Db25zdHJhaW50cyhjb25zdHJhaW50cykge1xuICBpZiAoY29uc3RyYWludHMgJiYgY29uc3RyYWludHMudmlkZW8gIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBjb25zdHJhaW50cywgeyB2aWRlbzogdXRpbHMuY29tcGFjdE9iamVjdChjb25zdHJhaW50cy52aWRlbykgfSk7XG4gIH1cblxuICByZXR1cm4gY29uc3RyYWludHM7XG59XG5cbmZ1bmN0aW9uIHNoaW1SVENJY2VTZXJ2ZXJVcmxzKHdpbmRvdykge1xuICBpZiAoIXdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbikge1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBtaWdyYXRlIGZyb20gbm9uLXNwZWMgUlRDSWNlU2VydmVyLnVybCB0byBSVENJY2VTZXJ2ZXIudXJsc1xuICB2YXIgT3JpZ1BlZXJDb25uZWN0aW9uID0gd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24gPSBmdW5jdGlvbiBSVENQZWVyQ29ubmVjdGlvbihwY0NvbmZpZywgcGNDb25zdHJhaW50cykge1xuICAgIGlmIChwY0NvbmZpZyAmJiBwY0NvbmZpZy5pY2VTZXJ2ZXJzKSB7XG4gICAgICB2YXIgbmV3SWNlU2VydmVycyA9IFtdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwY0NvbmZpZy5pY2VTZXJ2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzZXJ2ZXIgPSBwY0NvbmZpZy5pY2VTZXJ2ZXJzW2ldO1xuICAgICAgICBpZiAoIXNlcnZlci5oYXNPd25Qcm9wZXJ0eSgndXJscycpICYmIHNlcnZlci5oYXNPd25Qcm9wZXJ0eSgndXJsJykpIHtcbiAgICAgICAgICB1dGlscy5kZXByZWNhdGVkKCdSVENJY2VTZXJ2ZXIudXJsJywgJ1JUQ0ljZVNlcnZlci51cmxzJyk7XG4gICAgICAgICAgc2VydmVyID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzZXJ2ZXIpKTtcbiAgICAgICAgICBzZXJ2ZXIudXJscyA9IHNlcnZlci51cmw7XG4gICAgICAgICAgZGVsZXRlIHNlcnZlci51cmw7XG4gICAgICAgICAgbmV3SWNlU2VydmVycy5wdXNoKHNlcnZlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV3SWNlU2VydmVycy5wdXNoKHBjQ29uZmlnLmljZVNlcnZlcnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBwY0NvbmZpZy5pY2VTZXJ2ZXJzID0gbmV3SWNlU2VydmVycztcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBPcmlnUGVlckNvbm5lY3Rpb24ocGNDb25maWcsIHBjQ29uc3RyYWludHMpO1xuICB9O1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlID0gT3JpZ1BlZXJDb25uZWN0aW9uLnByb3RvdHlwZTtcbiAgLy8gd3JhcCBzdGF0aWMgbWV0aG9kcy4gQ3VycmVudGx5IGp1c3QgZ2VuZXJhdGVDZXJ0aWZpY2F0ZS5cbiAgaWYgKCdnZW5lcmF0ZUNlcnRpZmljYXRlJyBpbiBPcmlnUGVlckNvbm5lY3Rpb24pIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LlJUQ1BlZXJDb25uZWN0aW9uLCAnZ2VuZXJhdGVDZXJ0aWZpY2F0ZScsIHtcbiAgICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgICByZXR1cm4gT3JpZ1BlZXJDb25uZWN0aW9uLmdlbmVyYXRlQ2VydGlmaWNhdGU7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2hpbVRyYWNrRXZlbnRUcmFuc2NlaXZlcih3aW5kb3cpIHtcbiAgLy8gQWRkIGV2ZW50LnRyYW5zY2VpdmVyIG1lbWJlciBvdmVyIGRlcHJlY2F0ZWQgZXZlbnQucmVjZWl2ZXJcbiAgaWYgKCh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZih3aW5kb3cpKSA9PT0gJ29iamVjdCcgJiYgd2luZG93LlJUQ1RyYWNrRXZlbnQgJiYgJ3JlY2VpdmVyJyBpbiB3aW5kb3cuUlRDVHJhY2tFdmVudC5wcm90b3R5cGUgJiYgISgndHJhbnNjZWl2ZXInIGluIHdpbmRvdy5SVENUcmFja0V2ZW50LnByb3RvdHlwZSkpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LlJUQ1RyYWNrRXZlbnQucHJvdG90eXBlLCAndHJhbnNjZWl2ZXInLCB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIHsgcmVjZWl2ZXI6IHRoaXMucmVjZWl2ZXIgfTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaGltQ3JlYXRlT2ZmZXJMZWdhY3kod2luZG93KSB7XG4gIHZhciBvcmlnQ3JlYXRlT2ZmZXIgPSB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZU9mZmVyO1xuICB3aW5kb3cuUlRDUGVlckNvbm5lY3Rpb24ucHJvdG90eXBlLmNyZWF0ZU9mZmVyID0gZnVuY3Rpb24gY3JlYXRlT2ZmZXIob2ZmZXJPcHRpb25zKSB7XG4gICAgaWYgKG9mZmVyT3B0aW9ucykge1xuICAgICAgaWYgKHR5cGVvZiBvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVBdWRpbyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gc3VwcG9ydCBiaXQgdmFsdWVzXG4gICAgICAgIG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZUF1ZGlvID0gISFvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVBdWRpbztcbiAgICAgIH1cbiAgICAgIHZhciBhdWRpb1RyYW5zY2VpdmVyID0gdGhpcy5nZXRUcmFuc2NlaXZlcnMoKS5maW5kKGZ1bmN0aW9uICh0cmFuc2NlaXZlcikge1xuICAgICAgICByZXR1cm4gdHJhbnNjZWl2ZXIucmVjZWl2ZXIudHJhY2sua2luZCA9PT0gJ2F1ZGlvJztcbiAgICAgIH0pO1xuICAgICAgaWYgKG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZUF1ZGlvID09PSBmYWxzZSAmJiBhdWRpb1RyYW5zY2VpdmVyKSB7XG4gICAgICAgIGlmIChhdWRpb1RyYW5zY2VpdmVyLmRpcmVjdGlvbiA9PT0gJ3NlbmRyZWN2Jykge1xuICAgICAgICAgIGlmIChhdWRpb1RyYW5zY2VpdmVyLnNldERpcmVjdGlvbikge1xuICAgICAgICAgICAgYXVkaW9UcmFuc2NlaXZlci5zZXREaXJlY3Rpb24oJ3NlbmRvbmx5Jyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF1ZGlvVHJhbnNjZWl2ZXIuZGlyZWN0aW9uID0gJ3NlbmRvbmx5JztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYXVkaW9UcmFuc2NlaXZlci5kaXJlY3Rpb24gPT09ICdyZWN2b25seScpIHtcbiAgICAgICAgICBpZiAoYXVkaW9UcmFuc2NlaXZlci5zZXREaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGF1ZGlvVHJhbnNjZWl2ZXIuc2V0RGlyZWN0aW9uKCdpbmFjdGl2ZScpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhdWRpb1RyYW5zY2VpdmVyLmRpcmVjdGlvbiA9ICdpbmFjdGl2ZSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG9mZmVyT3B0aW9ucy5vZmZlclRvUmVjZWl2ZUF1ZGlvID09PSB0cnVlICYmICFhdWRpb1RyYW5zY2VpdmVyKSB7XG4gICAgICAgIHRoaXMuYWRkVHJhbnNjZWl2ZXIoJ2F1ZGlvJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygb2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlVmlkZW8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIHN1cHBvcnQgYml0IHZhbHVlc1xuICAgICAgICBvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyA9ICEhb2ZmZXJPcHRpb25zLm9mZmVyVG9SZWNlaXZlVmlkZW87XG4gICAgICB9XG4gICAgICB2YXIgdmlkZW9UcmFuc2NlaXZlciA9IHRoaXMuZ2V0VHJhbnNjZWl2ZXJzKCkuZmluZChmdW5jdGlvbiAodHJhbnNjZWl2ZXIpIHtcbiAgICAgICAgcmV0dXJuIHRyYW5zY2VpdmVyLnJlY2VpdmVyLnRyYWNrLmtpbmQgPT09ICd2aWRlbyc7XG4gICAgICB9KTtcbiAgICAgIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyA9PT0gZmFsc2UgJiYgdmlkZW9UcmFuc2NlaXZlcikge1xuICAgICAgICBpZiAodmlkZW9UcmFuc2NlaXZlci5kaXJlY3Rpb24gPT09ICdzZW5kcmVjdicpIHtcbiAgICAgICAgICBpZiAodmlkZW9UcmFuc2NlaXZlci5zZXREaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIHZpZGVvVHJhbnNjZWl2ZXIuc2V0RGlyZWN0aW9uKCdzZW5kb25seScpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2aWRlb1RyYW5zY2VpdmVyLmRpcmVjdGlvbiA9ICdzZW5kb25seSc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHZpZGVvVHJhbnNjZWl2ZXIuZGlyZWN0aW9uID09PSAncmVjdm9ubHknKSB7XG4gICAgICAgICAgaWYgKHZpZGVvVHJhbnNjZWl2ZXIuc2V0RGlyZWN0aW9uKSB7XG4gICAgICAgICAgICB2aWRlb1RyYW5zY2VpdmVyLnNldERpcmVjdGlvbignaW5hY3RpdmUnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmlkZW9UcmFuc2NlaXZlci5kaXJlY3Rpb24gPSAnaW5hY3RpdmUnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChvZmZlck9wdGlvbnMub2ZmZXJUb1JlY2VpdmVWaWRlbyA9PT0gdHJ1ZSAmJiAhdmlkZW9UcmFuc2NlaXZlcikge1xuICAgICAgICB0aGlzLmFkZFRyYW5zY2VpdmVyKCd2aWRlbycpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3JpZ0NyZWF0ZU9mZmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHNoaW1BdWRpb0NvbnRleHQod2luZG93KSB7XG4gIGlmICgodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyAndW5kZWZpbmVkJyA6IF90eXBlb2Yod2luZG93KSkgIT09ICdvYmplY3QnIHx8IHdpbmRvdy5BdWRpb0NvbnRleHQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgd2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG59XG4iLCIvKlxuICogIENvcHlyaWdodCAoYykgMjAxNiBUaGUgV2ViUlRDIHByb2plY3QgYXV0aG9ycy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiAgVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYSBCU0Qtc3R5bGUgbGljZW5zZVxuICogIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3Qgb2YgdGhlIHNvdXJjZVxuICogIHRyZWUuXG4gKi9cbi8qIGVzbGludC1lbnYgbm9kZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgX3R5cGVvZiA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiID8gZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfSA6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07XG5cbmV4cG9ydHMuZXh0cmFjdFZlcnNpb24gPSBleHRyYWN0VmVyc2lvbjtcbmV4cG9ydHMud3JhcFBlZXJDb25uZWN0aW9uRXZlbnQgPSB3cmFwUGVlckNvbm5lY3Rpb25FdmVudDtcbmV4cG9ydHMuZGlzYWJsZUxvZyA9IGRpc2FibGVMb2c7XG5leHBvcnRzLmRpc2FibGVXYXJuaW5ncyA9IGRpc2FibGVXYXJuaW5ncztcbmV4cG9ydHMubG9nID0gbG9nO1xuZXhwb3J0cy5kZXByZWNhdGVkID0gZGVwcmVjYXRlZDtcbmV4cG9ydHMuZGV0ZWN0QnJvd3NlciA9IGRldGVjdEJyb3dzZXI7XG5leHBvcnRzLmNvbXBhY3RPYmplY3QgPSBjb21wYWN0T2JqZWN0O1xuZXhwb3J0cy53YWxrU3RhdHMgPSB3YWxrU3RhdHM7XG5leHBvcnRzLmZpbHRlclN0YXRzID0gZmlsdGVyU3RhdHM7XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbnZhciBsb2dEaXNhYmxlZF8gPSB0cnVlO1xudmFyIGRlcHJlY2F0aW9uV2FybmluZ3NfID0gdHJ1ZTtcblxuLyoqXG4gKiBFeHRyYWN0IGJyb3dzZXIgdmVyc2lvbiBvdXQgb2YgdGhlIHByb3ZpZGVkIHVzZXIgYWdlbnQgc3RyaW5nLlxuICpcbiAqIEBwYXJhbSB7IXN0cmluZ30gdWFzdHJpbmcgdXNlckFnZW50IHN0cmluZy5cbiAqIEBwYXJhbSB7IXN0cmluZ30gZXhwciBSZWd1bGFyIGV4cHJlc3Npb24gdXNlZCBhcyBtYXRjaCBjcml0ZXJpYS5cbiAqIEBwYXJhbSB7IW51bWJlcn0gcG9zIHBvc2l0aW9uIGluIHRoZSB2ZXJzaW9uIHN0cmluZyB0byBiZSByZXR1cm5lZC5cbiAqIEByZXR1cm4geyFudW1iZXJ9IGJyb3dzZXIgdmVyc2lvbi5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdFZlcnNpb24odWFzdHJpbmcsIGV4cHIsIHBvcykge1xuICB2YXIgbWF0Y2ggPSB1YXN0cmluZy5tYXRjaChleHByKTtcbiAgcmV0dXJuIG1hdGNoICYmIG1hdGNoLmxlbmd0aCA+PSBwb3MgJiYgcGFyc2VJbnQobWF0Y2hbcG9zXSwgMTApO1xufVxuXG4vLyBXcmFwcyB0aGUgcGVlcmNvbm5lY3Rpb24gZXZlbnQgZXZlbnROYW1lVG9XcmFwIGluIGEgZnVuY3Rpb25cbi8vIHdoaWNoIHJldHVybnMgdGhlIG1vZGlmaWVkIGV2ZW50IG9iamVjdCAob3IgZmFsc2UgdG8gcHJldmVudFxuLy8gdGhlIGV2ZW50KS5cbmZ1bmN0aW9uIHdyYXBQZWVyQ29ubmVjdGlvbkV2ZW50KHdpbmRvdywgZXZlbnROYW1lVG9XcmFwLCB3cmFwcGVyKSB7XG4gIGlmICghd2luZG93LlJUQ1BlZXJDb25uZWN0aW9uKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBwcm90byA9IHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbi5wcm90b3R5cGU7XG4gIHZhciBuYXRpdmVBZGRFdmVudExpc3RlbmVyID0gcHJvdG8uYWRkRXZlbnRMaXN0ZW5lcjtcbiAgcHJvdG8uYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uIChuYXRpdmVFdmVudE5hbWUsIGNiKSB7XG4gICAgaWYgKG5hdGl2ZUV2ZW50TmFtZSAhPT0gZXZlbnROYW1lVG9XcmFwKSB7XG4gICAgICByZXR1cm4gbmF0aXZlQWRkRXZlbnRMaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICB2YXIgd3JhcHBlZENhbGxiYWNrID0gZnVuY3Rpb24gd3JhcHBlZENhbGxiYWNrKGUpIHtcbiAgICAgIHZhciBtb2RpZmllZEV2ZW50ID0gd3JhcHBlcihlKTtcbiAgICAgIGlmIChtb2RpZmllZEV2ZW50KSB7XG4gICAgICAgIGlmIChjYi5oYW5kbGVFdmVudCkge1xuICAgICAgICAgIGNiLmhhbmRsZUV2ZW50KG1vZGlmaWVkRXZlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNiKG1vZGlmaWVkRXZlbnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgICB0aGlzLl9ldmVudE1hcCA9IHRoaXMuX2V2ZW50TWFwIHx8IHt9O1xuICAgIGlmICghdGhpcy5fZXZlbnRNYXBbZXZlbnROYW1lVG9XcmFwXSkge1xuICAgICAgdGhpcy5fZXZlbnRNYXBbZXZlbnROYW1lVG9XcmFwXSA9IG5ldyBNYXAoKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRNYXBbZXZlbnROYW1lVG9XcmFwXS5zZXQoY2IsIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgcmV0dXJuIG5hdGl2ZUFkZEV2ZW50TGlzdGVuZXIuYXBwbHkodGhpcywgW25hdGl2ZUV2ZW50TmFtZSwgd3JhcHBlZENhbGxiYWNrXSk7XG4gIH07XG5cbiAgdmFyIG5hdGl2ZVJlbW92ZUV2ZW50TGlzdGVuZXIgPSBwcm90by5yZW1vdmVFdmVudExpc3RlbmVyO1xuICBwcm90by5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gKG5hdGl2ZUV2ZW50TmFtZSwgY2IpIHtcbiAgICBpZiAobmF0aXZlRXZlbnROYW1lICE9PSBldmVudE5hbWVUb1dyYXAgfHwgIXRoaXMuX2V2ZW50TWFwIHx8ICF0aGlzLl9ldmVudE1hcFtldmVudE5hbWVUb1dyYXBdKSB7XG4gICAgICByZXR1cm4gbmF0aXZlUmVtb3ZlRXZlbnRMaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuX2V2ZW50TWFwW2V2ZW50TmFtZVRvV3JhcF0uaGFzKGNiKSkge1xuICAgICAgcmV0dXJuIG5hdGl2ZVJlbW92ZUV2ZW50TGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgdmFyIHVud3JhcHBlZENiID0gdGhpcy5fZXZlbnRNYXBbZXZlbnROYW1lVG9XcmFwXS5nZXQoY2IpO1xuICAgIHRoaXMuX2V2ZW50TWFwW2V2ZW50TmFtZVRvV3JhcF0uZGVsZXRlKGNiKTtcbiAgICBpZiAodGhpcy5fZXZlbnRNYXBbZXZlbnROYW1lVG9XcmFwXS5zaXplID09PSAwKSB7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRNYXBbZXZlbnROYW1lVG9XcmFwXTtcbiAgICB9XG4gICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuX2V2ZW50TWFwKS5sZW5ndGggPT09IDApIHtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudE1hcDtcbiAgICB9XG4gICAgcmV0dXJuIG5hdGl2ZVJlbW92ZUV2ZW50TGlzdGVuZXIuYXBwbHkodGhpcywgW25hdGl2ZUV2ZW50TmFtZSwgdW53cmFwcGVkQ2JdKTtcbiAgfTtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdvbicgKyBldmVudE5hbWVUb1dyYXAsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgIHJldHVybiB0aGlzWydfb24nICsgZXZlbnROYW1lVG9XcmFwXTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24gc2V0KGNiKSB7XG4gICAgICBpZiAodGhpc1snX29uJyArIGV2ZW50TmFtZVRvV3JhcF0pIHtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZVRvV3JhcCwgdGhpc1snX29uJyArIGV2ZW50TmFtZVRvV3JhcF0pO1xuICAgICAgICBkZWxldGUgdGhpc1snX29uJyArIGV2ZW50TmFtZVRvV3JhcF07XG4gICAgICB9XG4gICAgICBpZiAoY2IpIHtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZVRvV3JhcCwgdGhpc1snX29uJyArIGV2ZW50TmFtZVRvV3JhcF0gPSBjYik7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBkaXNhYmxlTG9nKGJvb2wpIHtcbiAgaWYgKHR5cGVvZiBib29sICE9PSAnYm9vbGVhbicpIHtcbiAgICByZXR1cm4gbmV3IEVycm9yKCdBcmd1bWVudCB0eXBlOiAnICsgKHR5cGVvZiBib29sID09PSAndW5kZWZpbmVkJyA/ICd1bmRlZmluZWQnIDogX3R5cGVvZihib29sKSkgKyAnLiBQbGVhc2UgdXNlIGEgYm9vbGVhbi4nKTtcbiAgfVxuICBsb2dEaXNhYmxlZF8gPSBib29sO1xuICByZXR1cm4gYm9vbCA/ICdhZGFwdGVyLmpzIGxvZ2dpbmcgZGlzYWJsZWQnIDogJ2FkYXB0ZXIuanMgbG9nZ2luZyBlbmFibGVkJztcbn1cblxuLyoqXG4gKiBEaXNhYmxlIG9yIGVuYWJsZSBkZXByZWNhdGlvbiB3YXJuaW5nc1xuICogQHBhcmFtIHshYm9vbGVhbn0gYm9vbCBzZXQgdG8gdHJ1ZSB0byBkaXNhYmxlIHdhcm5pbmdzLlxuICovXG5mdW5jdGlvbiBkaXNhYmxlV2FybmluZ3MoYm9vbCkge1xuICBpZiAodHlwZW9mIGJvb2wgIT09ICdib29sZWFuJykge1xuICAgIHJldHVybiBuZXcgRXJyb3IoJ0FyZ3VtZW50IHR5cGU6ICcgKyAodHlwZW9mIGJvb2wgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKGJvb2wpKSArICcuIFBsZWFzZSB1c2UgYSBib29sZWFuLicpO1xuICB9XG4gIGRlcHJlY2F0aW9uV2FybmluZ3NfID0gIWJvb2w7XG4gIHJldHVybiAnYWRhcHRlci5qcyBkZXByZWNhdGlvbiB3YXJuaW5ncyAnICsgKGJvb2wgPyAnZGlzYWJsZWQnIDogJ2VuYWJsZWQnKTtcbn1cblxuZnVuY3Rpb24gbG9nKCkge1xuICBpZiAoKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gJ3VuZGVmaW5lZCcgOiBfdHlwZW9mKHdpbmRvdykpID09PSAnb2JqZWN0Jykge1xuICAgIGlmIChsb2dEaXNhYmxlZF8pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgY29uc29sZS5sb2cgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2hvd3MgYSBkZXByZWNhdGlvbiB3YXJuaW5nIHN1Z2dlc3RpbmcgdGhlIG1vZGVybiBhbmQgc3BlYy1jb21wYXRpYmxlIEFQSS5cbiAqL1xuZnVuY3Rpb24gZGVwcmVjYXRlZChvbGRNZXRob2QsIG5ld01ldGhvZCkge1xuICBpZiAoIWRlcHJlY2F0aW9uV2FybmluZ3NfKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnNvbGUud2FybihvbGRNZXRob2QgKyAnIGlzIGRlcHJlY2F0ZWQsIHBsZWFzZSB1c2UgJyArIG5ld01ldGhvZCArICcgaW5zdGVhZC4nKTtcbn1cblxuLyoqXG4gKiBCcm93c2VyIGRldGVjdG9yLlxuICpcbiAqIEByZXR1cm4ge29iamVjdH0gcmVzdWx0IGNvbnRhaW5pbmcgYnJvd3NlciBhbmQgdmVyc2lvblxuICogICAgIHByb3BlcnRpZXMuXG4gKi9cbmZ1bmN0aW9uIGRldGVjdEJyb3dzZXIod2luZG93KSB7XG4gIC8vIFJldHVybmVkIHJlc3VsdCBvYmplY3QuXG4gIHZhciByZXN1bHQgPSB7IGJyb3dzZXI6IG51bGwsIHZlcnNpb246IG51bGwgfTtcblxuICAvLyBGYWlsIGVhcmx5IGlmIGl0J3Mgbm90IGEgYnJvd3NlclxuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgIXdpbmRvdy5uYXZpZ2F0b3IpIHtcbiAgICByZXN1bHQuYnJvd3NlciA9ICdOb3QgYSBicm93c2VyLic7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuXG5cbiAgaWYgKG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEpIHtcbiAgICAvLyBGaXJlZm94LlxuICAgIHJlc3VsdC5icm93c2VyID0gJ2ZpcmVmb3gnO1xuICAgIHJlc3VsdC52ZXJzaW9uID0gZXh0cmFjdFZlcnNpb24obmF2aWdhdG9yLnVzZXJBZ2VudCwgL0ZpcmVmb3hcXC8oXFxkKylcXC4vLCAxKTtcbiAgfSBlbHNlIGlmIChuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8IHdpbmRvdy5pc1NlY3VyZUNvbnRleHQgPT09IGZhbHNlICYmIHdpbmRvdy53ZWJraXRSVENQZWVyQ29ubmVjdGlvbiAmJiAhd2luZG93LlJUQ0ljZUdhdGhlcmVyKSB7XG4gICAgLy8gQ2hyb21lLCBDaHJvbWl1bSwgV2VidmlldywgT3BlcmEuXG4gICAgLy8gVmVyc2lvbiBtYXRjaGVzIENocm9tZS9XZWJSVEMgdmVyc2lvbi5cbiAgICAvLyBDaHJvbWUgNzQgcmVtb3ZlZCB3ZWJraXRHZXRVc2VyTWVkaWEgb24gaHR0cCBhcyB3ZWxsIHNvIHdlIG5lZWQgdGhlXG4gICAgLy8gbW9yZSBjb21wbGljYXRlZCBmYWxsYmFjayB0byB3ZWJraXRSVENQZWVyQ29ubmVjdGlvbi5cbiAgICByZXN1bHQuYnJvd3NlciA9ICdjaHJvbWUnO1xuICAgIHJlc3VsdC52ZXJzaW9uID0gZXh0cmFjdFZlcnNpb24obmF2aWdhdG9yLnVzZXJBZ2VudCwgL0Nocm9tKGV8aXVtKVxcLyhcXGQrKVxcLi8sIDIpO1xuICB9IGVsc2UgaWYgKG5hdmlnYXRvci5tZWRpYURldmljZXMgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvRWRnZVxcLyhcXGQrKS4oXFxkKykkLykpIHtcbiAgICAvLyBFZGdlLlxuICAgIHJlc3VsdC5icm93c2VyID0gJ2VkZ2UnO1xuICAgIHJlc3VsdC52ZXJzaW9uID0gZXh0cmFjdFZlcnNpb24obmF2aWdhdG9yLnVzZXJBZ2VudCwgL0VkZ2VcXC8oXFxkKykuKFxcZCspJC8sIDIpO1xuICB9IGVsc2UgaWYgKHdpbmRvdy5SVENQZWVyQ29ubmVjdGlvbiAmJiBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9BcHBsZVdlYktpdFxcLyhcXGQrKVxcLi8pKSB7XG4gICAgLy8gU2FmYXJpLlxuICAgIHJlc3VsdC5icm93c2VyID0gJ3NhZmFyaSc7XG4gICAgcmVzdWx0LnZlcnNpb24gPSBleHRyYWN0VmVyc2lvbihuYXZpZ2F0b3IudXNlckFnZW50LCAvQXBwbGVXZWJLaXRcXC8oXFxkKylcXC4vLCAxKTtcbiAgICByZXN1bHQuc3VwcG9ydHNVbmlmaWVkUGxhbiA9IHdpbmRvdy5SVENSdHBUcmFuc2NlaXZlciAmJiAnY3VycmVudERpcmVjdGlvbicgaW4gd2luZG93LlJUQ1J0cFRyYW5zY2VpdmVyLnByb3RvdHlwZTtcbiAgfSBlbHNlIHtcbiAgICAvLyBEZWZhdWx0IGZhbGx0aHJvdWdoOiBub3Qgc3VwcG9ydGVkLlxuICAgIHJlc3VsdC5icm93c2VyID0gJ05vdCBhIHN1cHBvcnRlZCBicm93c2VyLic7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIHNvbWV0aGluZyBpcyBhbiBvYmplY3QuXG4gKlxuICogQHBhcmFtIHsqfSB2YWwgVGhlIHNvbWV0aGluZyB5b3Ugd2FudCB0byBjaGVjay5cbiAqIEByZXR1cm4gdHJ1ZSBpZiB2YWwgaXMgYW4gb2JqZWN0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IE9iamVjdF0nO1xufVxuXG4vKipcbiAqIFJlbW92ZSBhbGwgZW1wdHkgb2JqZWN0cyBhbmQgdW5kZWZpbmVkIHZhbHVlc1xuICogZnJvbSBhIG5lc3RlZCBvYmplY3QgLS0gYW4gZW5oYW5jZWQgYW5kIHZhbmlsbGEgdmVyc2lvblxuICogb2YgTG9kYXNoJ3MgYGNvbXBhY3RgLlxuICovXG5mdW5jdGlvbiBjb21wYWN0T2JqZWN0KGRhdGEpIHtcbiAgaWYgKCFpc09iamVjdChkYXRhKSkge1xuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgcmV0dXJuIE9iamVjdC5rZXlzKGRhdGEpLnJlZHVjZShmdW5jdGlvbiAoYWNjdW11bGF0b3IsIGtleSkge1xuICAgIHZhciBpc09iaiA9IGlzT2JqZWN0KGRhdGFba2V5XSk7XG4gICAgdmFyIHZhbHVlID0gaXNPYmogPyBjb21wYWN0T2JqZWN0KGRhdGFba2V5XSkgOiBkYXRhW2tleV07XG4gICAgdmFyIGlzRW1wdHlPYmplY3QgPSBpc09iaiAmJiAhT2JqZWN0LmtleXModmFsdWUpLmxlbmd0aDtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCBpc0VtcHR5T2JqZWN0KSB7XG4gICAgICByZXR1cm4gYWNjdW11bGF0b3I7XG4gICAgfVxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKGFjY3VtdWxhdG9yLCBfZGVmaW5lUHJvcGVydHkoe30sIGtleSwgdmFsdWUpKTtcbiAgfSwge30pO1xufVxuXG4vKiBpdGVyYXRlcyB0aGUgc3RhdHMgZ3JhcGggcmVjdXJzaXZlbHkuICovXG5mdW5jdGlvbiB3YWxrU3RhdHMoc3RhdHMsIGJhc2UsIHJlc3VsdFNldCkge1xuICBpZiAoIWJhc2UgfHwgcmVzdWx0U2V0LmhhcyhiYXNlLmlkKSkge1xuICAgIHJldHVybjtcbiAgfVxuICByZXN1bHRTZXQuc2V0KGJhc2UuaWQsIGJhc2UpO1xuICBPYmplY3Qua2V5cyhiYXNlKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKG5hbWUuZW5kc1dpdGgoJ0lkJykpIHtcbiAgICAgIHdhbGtTdGF0cyhzdGF0cywgc3RhdHMuZ2V0KGJhc2VbbmFtZV0pLCByZXN1bHRTZXQpO1xuICAgIH0gZWxzZSBpZiAobmFtZS5lbmRzV2l0aCgnSWRzJykpIHtcbiAgICAgIGJhc2VbbmFtZV0uZm9yRWFjaChmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgd2Fsa1N0YXRzKHN0YXRzLCBzdGF0cy5nZXQoaWQpLCByZXN1bHRTZXQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn1cblxuLyogZmlsdGVyIGdldFN0YXRzIGZvciBhIHNlbmRlci9yZWNlaXZlciB0cmFjay4gKi9cbmZ1bmN0aW9uIGZpbHRlclN0YXRzKHJlc3VsdCwgdHJhY2ssIG91dGJvdW5kKSB7XG4gIHZhciBzdHJlYW1TdGF0c1R5cGUgPSBvdXRib3VuZCA/ICdvdXRib3VuZC1ydHAnIDogJ2luYm91bmQtcnRwJztcbiAgdmFyIGZpbHRlcmVkUmVzdWx0ID0gbmV3IE1hcCgpO1xuICBpZiAodHJhY2sgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmlsdGVyZWRSZXN1bHQ7XG4gIH1cbiAgdmFyIHRyYWNrU3RhdHMgPSBbXTtcbiAgcmVzdWx0LmZvckVhY2goZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlLnR5cGUgPT09ICd0cmFjaycgJiYgdmFsdWUudHJhY2tJZGVudGlmaWVyID09PSB0cmFjay5pZCkge1xuICAgICAgdHJhY2tTdGF0cy5wdXNoKHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICB0cmFja1N0YXRzLmZvckVhY2goZnVuY3Rpb24gKHRyYWNrU3RhdCkge1xuICAgIHJlc3VsdC5mb3JFYWNoKGZ1bmN0aW9uIChzdGF0cykge1xuICAgICAgaWYgKHN0YXRzLnR5cGUgPT09IHN0cmVhbVN0YXRzVHlwZSAmJiBzdGF0cy50cmFja0lkID09PSB0cmFja1N0YXQuaWQpIHtcbiAgICAgICAgd2Fsa1N0YXRzKHJlc3VsdCwgc3RhdHMsIGZpbHRlcmVkUmVzdWx0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBmaWx0ZXJlZFJlc3VsdDtcbn1cbiIsImNvbnN0IGFwaSA9IHJlcXVpcmUoJ2phbnVzLXZpZGVvcm9vbS1hcGknKTtcclxuXHJcbmNvbnN0IEpBTlVTX0NPTkZJRyA9IHtcclxuICB1cmw6ICclSkFOVVNfVVJMJScsXHJcbiAga2VlcEFsaXZlSW50ZXJ2YWxNczogMzAwMDAsXHJcbiAgb3B0aW9uczoge1xyXG4gICAgcmVqZWN0VW5hdXRob3JpemVkOiBmYWxzZVxyXG4gIH0sXHJcblxyXG4gIGNvZGVjOiAndnA4LHZwOSxoMjY0JyxcclxuICB2aWRlb09yaWVudEV4dDogZmFsc2UsXHJcblxyXG4gIGJpdHJhdGU6IDc3NDE0NCwgIC8vbWF4IHZpZGVvIGJpdHJhdGUgZm9yIHNlbmRlcnMgKGUuZy4xMjgwMDApXHJcbiAgZmlyU2Vjb25kczogMTAsXHJcbiAgcHVibGlzaGVyczogMjAsICAgLy9tYXggbnVtYmVyIG9mIGNvbmN1cnJlbnQgc2VuZGVycyAoZS5nLiwgNiBmb3IgYSB2aWRlbyBjb25mZXJlbmNlIG9yIDEgZm9yIGEgd2ViaW5hcilcclxuICByZWNvcmREaXJlY3Rvcnk6ICclUkVDT1JEU19ESVJFQ1RPUlklJyxcclxuXHJcbiAgZmlsdGVyRGlyZWN0Q2FuZGlkYXRlczogdHJ1ZSxcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGphbnVzOiBuZXcgYXBpLkphbnVzQ29uZmlnKEpBTlVTX0NPTkZJRyksXHJcbiAgcm9vbTogbmV3IGFwaS5KYW51c1Jvb21Db25maWcoSkFOVVNfQ09ORklHKSxcclxuXHJcbiAgaWNlOiB7XHJcbiAgICBpY2VTZXJ2ZXJzOiBbXHJcbiAgICAgIHsgdXJsczogJ3N0dW46JUNPVFVSTl9VUkwlJyB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgIHVybHM6ICd0dXJuOiVDT1RVUk5fVVJMJScsXHJcbiAgICAgICAgIHVzZXJuYW1lOiAnJUNPVFVSTl9VU0VSTkFNRSUnLFxyXG4gICAgICAgICBjcmVkZW50aWFsOiAnJUNPVFVSTl9QQVNTV09SRCUnXHJcbiAgICAgIH0sXHJcbiAgICBdXHJcbiAgfSxcclxuXHJcbiAgZ2F0aGVyZXI6IHtcclxuICAgIHVybDogJyVHQVRIRVJFUl9VUkwlJyxcclxuICAgIHJlcG9ydGluZ0ludGVydmFsOiAnJVNFTkRfTUVUUklDU19JTlRFUlZBTCUnLCAgICAgIC8vdW5pdCA9IDAuMXNcclxuICAgIGNvbm5lY3Rpb25JbnRlcnZhbDogJyVDT05ORUNUX0dBVEhFUkVSX0lOVEVSVkFMJScsIC8vdW5pdCA9IDEuMHNcclxuICB9LFxyXG5cclxuICBtb2RlcmF0b3I6IHtcclxuICAgIHVybDogJyVNT0RFUkFUT1JfVVJMJScsXHJcbiAgICBjb25uZWN0aW9uSW50ZXJ2YWw6ICclQ09OTkVDVF9NT0RFUkFUT1JfSU5URVJWQUwlJywgLy91bml0ID0gMS4wc1xyXG4gIH1cclxufTsiLCJjb25zdCBhcGkgPSByZXF1aXJlKCdqYW51cy12aWRlb3Jvb20tYXBpJyk7XHJcbmNvbnN0IGFkYXB0ZXIgPSByZXF1aXJlKCd3ZWJydGMtYWRhcHRlcicpO1xyXG5cclxuY29uc3Qgcm9vbSA9IHJlcXVpcmUoJy4uL3Jvb20vcm9vbScpO1xyXG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcclxuY29uc3QgbGlua3MgPSByZXF1aXJlKCcuLi9saW5rcycpO1xyXG5cclxubGV0IGphbnVzQXBpID0gdW5kZWZpbmVkO1xyXG5cclxud2luZG93Lm9ubG9hZCA9ICgpID0+IHtcclxuICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XHJcblxyXG4gICAgY29uc3Qgdmlld1Jvb21zTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicm9vbXNMaXN0XCIpO1xyXG4gICAgY29uc3Qgdmlld1Jvb21zTGlzdEJsb2NrID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyb29tc0xpc3RCbG9ja1wiKTtcclxuICAgIGNvbnN0IHZpZXdSb29tSWRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicm9vbUlkSW5wdXRcIik7XHJcbiAgICBjb25zdCB2aWV3Um9vbVBpbklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyb29tUGluSW5wdXRcIik7XHJcbiAgICBjb25zdCB2aWV3Um9vbVNlY3JldElucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyb29tU2VjcmV0SW5wdXRcIik7XHJcbiAgICBjb25zdCB2aWV3RGlzcGxheU5hbWVJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZGlzcGxheU5hbWVJbnB1dFwiKTtcclxuXHJcbiAgICBjb25zdCB2aWV3Sm9pbkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiam9pblwiKTtcclxuXHJcbiAgICB2aWV3Sm9pbkJ1dHRvbi5vbmNsaWNrID0gam9pbjtcclxuXHJcbiAgICBjb25zdCBtZXRyaWNzRW5hYmxlZCA9IHVybFBhcmFtcy5nZXQoXCJuby1tZXRyaWNzXCIpICE9PSBcIlwiO1xyXG4gICAgY29uc29sZS5sb2coXCJNZXRyaWNzIGVuYWJsZWQ/XCIsIG1ldHJpY3NFbmFibGVkKTtcclxuXHJcbiAgICBjb25zdCBtb2RlcmF0aW9uRW5hYmxlZCA9IHVybFBhcmFtcy5nZXQoXCJuby1tb2RlcmF0aW9uXCIpICE9PSBcIlwiO1xyXG4gICAgY29uc29sZS5sb2coXCJNb2RlcmF0aW9uIGVuYWJsZWQ/XCIsIG1vZGVyYXRpb25FbmFibGVkKTtcclxuXHJcbiAgICBsZXQgcm9vbUlkID0gTnVtYmVyKHVybFBhcmFtcy5nZXQobGlua3Mucm9vbUlkUGFyYW0pKTtcclxuICAgIGxldCByb29tUGluID0gdXJsUGFyYW1zLmdldChsaW5rcy5yb29tUGluUGFyYW0pO1xyXG4gICAgbGV0IHJvb21TZWNyZXQgPSB1cmxQYXJhbXMuZ2V0KGxpbmtzLnJvb21TZWNyZXRQYXJhbSk7XHJcblxyXG4gICAgaWYgKCEhcm9vbUlkICYmIHJvb21JZCAhPT0gXCJcIikge1xyXG4gICAgICAgIHZpZXdSb29tSWRJbnB1dC52YWx1ZSA9IHJvb21JZDtcclxuICAgICAgICB2aWV3Um9vbUlkSW5wdXQuZGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgICAgIHZpZXdSb29tc0xpc3RCbG9jay5oaWRkZW4gPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgaWYgKCEhcm9vbVBpbiAmJiByb29tUGluICE9PSBcIlwiKSB7XHJcbiAgICAgICAgdmlld1Jvb21QaW5JbnB1dC52YWx1ZSA9IHJvb21QaW47XHJcbiAgICAgICAgdmlld1Jvb21QaW5JbnB1dC5kaXNhYmxlZCA9IHRydWU7XHJcbiAgICB9XHJcbiAgICBpZiAoISFyb29tU2VjcmV0ICYmIHJvb21TZWNyZXQgIT09IFwiXCIpIHtcclxuICAgICAgICB2aWV3Um9vbVNlY3JldElucHV0LnZhbHVlID0gcm9vbVNlY3JldDtcclxuICAgICAgICB2aWV3Um9vbVNlY3JldElucHV0LmRpc2FibGVkID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAobmV3IGFwaS5KYW51cyhjb25maWcuamFudXMsIGNvbnNvbGUpKS5jb25uZWN0KClcclxuICAgICAgICAudGhlbigoY29ubmVjdGVkKSA9PiB7XHJcbiAgICAgICAgICAgIGphbnVzQXBpID0gY29ubmVjdGVkO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkphbnVzIGNvbm5lY3RlZDpcIiwgamFudXNBcGkpO1xyXG4gICAgICAgICAgICByZXR1cm4gYXR0YWNoKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgZnVuY3Rpb24gTG9nb3V0KCl7XHJcbiAgICAgICAgY29uc3QgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICAgICAgeGhyLm9wZW4oJ1BPU1QnLCAnL3VzZXIvbG9nb3V0Jyk7XHJcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9VVRGLThcIik7XHJcbiAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2lnbmVkIG91dCBhczogJyArIHhoci5yZXNwb25zZVRleHQpO1xyXG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcclxuICAgICAgICAgICAgaWYocmVzdWx0LmNvZGUgPT09IDApe1xyXG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBcImxvZ2luLmh0bWxcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgeGhyLnNlbmQoXCJcIik7XHJcbiAgICB9XHJcbiAgICBsZXQgbG9nb3V0VGFnID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvZ291dFRhZycpO1xyXG4gICAgbG9nb3V0VGFnLm9uY2xpY2sgPSBMb2dvdXQ7XHJcbiAgICBsZXQgc3BhbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd1c2VyTmFtZScpO1xyXG4gICAgbGV0IHVzZXJOYW1lID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJ1c2VyTmFtZVwiKTtcclxuICAgIHNwYW4uaW5uZXJUZXh0ID0gdXNlck5hbWU7XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gYXR0YWNoKCkge1xyXG4gICAgICAgIGNvbnN0IHJvb21BcGkgPSBhd2FpdCBqYW51c0FwaS5hZGRQbHVnaW4obmV3IGFwaS5WaWRlb1Jvb20oY29uc29sZSwgY29uZmlnLmljZSwgZmFsc2UpKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlZpZGVvUm9vbSBwbHVnaW4gYXR0YWNoZWQ6XCIsIHJvb21BcGkpO1xyXG5cclxuICAgICAgICByb29tLmluaXRpYWxpemUoamFudXNBcGksIHJvb21BcGkpO1xyXG5cclxuICAgICAgICByZXR1cm4gcm9vbUFwaS5saXN0Um9vbXMoKS50aGVuKChyb29tcykgPT4ge1xyXG4gICAgICAgICAgICByb29tcy5mb3JFYWNoKChyb29tKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpO1xyXG4gICAgICAgICAgICAgICAgb3B0aW9uLnZhbHVlID0gcm9vbS5yb29tOyAvL2lkXHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShyb29tLmRlc2NyaXB0aW9uKTtcclxuICAgICAgICAgICAgICAgIG9wdGlvbi5hcHBlbmRDaGlsZChkZXNjcmlwdGlvbik7XHJcbiAgICAgICAgICAgICAgICB2aWV3Um9vbXNMaXN0LmFwcGVuZENoaWxkKG9wdGlvbik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIGpvaW4oKSB7XHJcbiAgICAgICAgcm9vbUlkID0gdmlld1Jvb21JZElucHV0LnZhbHVlO1xyXG4gICAgICAgIGlmIChyb29tSWQgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgcm9vbUlkID0gTnVtYmVyKHJvb21JZCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcm9vbUlkID0gTnVtYmVyKHZpZXdSb29tc0xpc3QudmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcm9vbVBpbiA9IHZpZXdSb29tUGluSW5wdXQudmFsdWU7XHJcbiAgICAgICAgaWYgKHJvb21QaW4gPT09IFwiXCIpIHtcclxuICAgICAgICAgICAgcm9vbVBpbiA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByb29tU2VjcmV0ID0gdmlld1Jvb21TZWNyZXRJbnB1dC52YWx1ZTtcclxuICAgICAgICBpZiAocm9vbVNlY3JldCA9PT0gXCJcIikge1xyXG4gICAgICAgICAgICByb29tU2VjcmV0ID0gbnVsbDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNlY3JldCBwcm92aWRlZFwiLCByb29tU2VjcmV0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gdmlld0Rpc3BsYXlOYW1lSW5wdXQudmFsdWU7XHJcbiAgICAgICAgaWYgKCFkaXNwbGF5TmFtZSkge1xyXG4gICAgICAgICAgICB3aW5kb3cuYWxlcnQoXCJJbnB1dCB5b3VyIGRpc3BsYXkgbmFtZSwgcGxlYXNlXCIpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcm9vbS5qb2luKFxyXG4gICAgICAgICAgICByb29tSWQsIHJvb21QaW4sIHJvb21TZWNyZXQsIGRpc3BsYXlOYW1lLFxyXG4gICAgICAgICAgICBtZXRyaWNzRW5hYmxlZCwgbW9kZXJhdGlvbkVuYWJsZWQpO1xyXG4gICAgfVxyXG59O1xyXG4iLCJjb25zdCByb29tSWRQYXJhbSA9IFwiaWRcIjtcclxuY29uc3Qgcm9vbVBpblBhcmFtID0gXCJwaW5cIjtcclxuY29uc3Qgcm9vbVNlY3JldFBhcmFtID0gXCJzZWNyZXRcIjtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgcm9vbVVybCxcclxuICAgIHJvb21JZFBhcmFtLFxyXG4gICAgcm9vbVBpblBhcmFtLFxyXG4gICAgcm9vbVNlY3JldFBhcmFtLFxyXG59O1xyXG5cclxuZnVuY3Rpb24gYmFzZVVybCgpIHtcclxuICAgIHJldHVybiB3aW5kb3cubG9jYXRpb24udG9TdHJpbmcoKVxyXG4gICAgICAgIC5yZXBsYWNlKC9hZG1pbi4qLywgXCJcIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJvb21VcmwoaWQsIHBpbikge1xyXG4gICAgbGV0IGxpbmsgPSBiYXNlVXJsKCkgKyBcIj9cIjtcclxuXHJcbiAgICBpZiAoIWlkIHx8IGlkID09PSBcIlwiKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkNhbid0IGNvbnN0cnVjdCBsaW5rIGZvciBhIHJvb20gd2l0aG91dCBpZFwiKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBsaW5rID0gbGluayArIGBpZD0ke2lkfWA7XHJcblxyXG4gICAgaWYgKCFwaW4gfHwgcGluID09PSBcIlwiKSB7XHJcbiAgICAgICAgcmV0dXJuIGxpbms7XHJcbiAgICB9XHJcbiAgICBsaW5rID0gbGluayArIGAmcGluPSR7cGlufWA7XHJcblxyXG4gICAgcmV0dXJuIGxpbms7XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBpbml0aWFsaXplLFxyXG4gICAgYXBwZW5kTWVzc2FnZSxcclxufTtcclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemUocHVibGlzaGVyKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIkluaXRpYWxpemluZyB0aGUgY2hhdFwiKTtcclxuXHJcbiAgICBsZXQgbWVzc2FnZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0ZXh0TWVzc2FnZUlucHV0XCIpO1xyXG4gICAgbGV0IHNlbmRCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNlbmRUZXh0TWVzc2FnZVwiKTtcclxuXHJcbiAgICBsZXQgaW5wdXRGaW5pc2hlZCA9ICgpID0+IHtcclxuICAgICAgICBzZW5kVGV4dE1lc3NhZ2UocHVibGlzaGVyLCBtZXNzYWdlSW5wdXQudmFsdWUpO1xyXG4gICAgICAgIG1lc3NhZ2VJbnB1dC52YWx1ZSA9ICcnO1xyXG4gICAgfTtcclxuXHJcbiAgICBzZW5kQnV0dG9uLm9uY2xpY2sgPSBpbnB1dEZpbmlzaGVkO1xyXG4gICAgbWVzc2FnZUlucHV0Lm9ua2V5cHJlc3MgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICBpZiAoZXZlbnQua2V5ID09PSBcIkVudGVyXCIpIHtcclxuICAgICAgICAgICAgaW5wdXRGaW5pc2hlZCgpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFwcGVuZE1lc3NhZ2UobWVzc2FnZSkge1xyXG4gICAgbGV0IG1lc3NhZ2VzSGlzdG9yeSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWVzc2FnZXNIaXN0b3J5XCIpO1xyXG4gICAgbGV0IHRleHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShtZXNzYWdlKTtcclxuICAgIGxldCBsaXN0SXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICBsaXN0SXRlbS5hcHBlbmRDaGlsZCh0ZXh0KTtcclxuICAgIG1lc3NhZ2VzSGlzdG9yeS5hcHBlbmRDaGlsZChsaXN0SXRlbSk7XHJcbiAgICBtZXNzYWdlc0hpc3Rvcnkuc2Nyb2xsVG9wID0gbWVzc2FnZXNIaXN0b3J5LnNjcm9sbEhlaWdodDtcclxufVxyXG5cclxuZnVuY3Rpb24gc2VuZFRleHRNZXNzYWdlKHB1Ymxpc2hlciwgdGV4dCkge1xyXG4gICAgaWYgKHRleHQgPT09IFwiXCIpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IG1lc3NhZ2UgPSB3cmFwV2l0aERhdGUocHVibGlzaGVyLmRpc3BsYXlOYW1lLCB0ZXh0KTtcclxuICAgIHB1Ymxpc2hlci5zZW5kRGF0YShtZXNzYWdlKTtcclxuICAgIGFwcGVuZE1lc3NhZ2UobWVzc2FnZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdyYXBXaXRoRGF0ZShkaXNwbGF5TmFtZSwgdGV4dCkge1xyXG4gICAgbGV0IGRhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgbGV0IGhvdXJzID0gZGF0ZS5nZXRIb3VycygpO1xyXG4gICAgbGV0IG1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsJzAnKTtcclxuICAgIGxldCBzZWNvbmRzID0gZGF0ZS5nZXRTZWNvbmRzKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCcwJyk7XHJcblxyXG4gICAgcmV0dXJuIGAke2hvdXJzfToke21pbnV0ZXN9OiR7c2Vjb25kc30gPCR7ZGlzcGxheU5hbWV9PjogJHt0ZXh0fWA7XHJcbn0iLCJjb25zdCBtZWRpYSA9IHJlcXVpcmUoJy4vbWVkaWEnKTtcclxuY29uc3QgaW5ib3VuZCA9IHJlcXVpcmUoJy4vaW5ib3VuZCcpO1xyXG5jb25zdCBob3N0ID0gcmVxdWlyZSgnLi9ob3N0L2hvc3QnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdGlhbGl6ZSxcclxuICAgIHVwZGF0ZU91dGJvdW5kLFxyXG4gICAgdXBkYXRlSW5ib3VuZCxcclxuICAgIHJlbW92ZUluYm91bmQsXHJcbiAgICBjbGVhckluYm91bmQsXHJcbiAgICBtZW1iZXJEaXNwbGF5ZWRcclxufTtcclxuXHJcbmNvbnN0IGluYm91bmREaXNwbGF5QnlNZW1iZXIgPSBuZXcgTWFwKCk7XHJcblxyXG5sZXQgaW5ib3VuZERpc3BsYXlzR3JpZDtcclxubGV0IG91dGJvdW5kRGlzcGxheTtcclxubGV0IHB1Ymxpc2hlcjtcclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemUob3V0Ym91bmRQdWJsaXNoZXIpIHtcclxuICAgIHB1Ymxpc2hlciA9IG91dGJvdW5kUHVibGlzaGVyO1xyXG4gICAgb3V0Ym91bmREaXNwbGF5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJvdXRib3VuZERpc3BsYXlcIik7XHJcbiAgICBpbmJvdW5kRGlzcGxheXNHcmlkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbmJvdW5kRGlzcGxheXNHcmlkXCIpO1xyXG5cclxuICAgIHNldEdyaWRXaWR0aCgyKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ3JpZFdpZGVyXCIpLm9uY2xpY2sgPSBtYWtlR3JpZFdpZGVyO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJncmlkTmFycm93ZXJcIikub25jbGljayA9IG1ha2VHcmlkTmFycm93ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZU91dGJvdW5kKHN0cmVhbSkge1xyXG4gICAgY29uc29sZS5sb2coYERpc3BsYXlpbmcgbG9jYWwgcGFydGljaXBhbnRgKTtcclxuICAgIGNvbnN0IGxhYmVsID0gcHVibGlzaGVyLmRpc3BsYXlOYW1lICsgXCIgKG1lKVwiO1xyXG5cclxuICAgIG91dGJvdW5kRGlzcGxheS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgcmV0dXJuIGRpc3BsYXkob3V0Ym91bmREaXNwbGF5LCBzdHJlYW0sIGxhYmVsLCB0cnVlLCB0cnVlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlSW5ib3VuZChzdHJlYW0sIG1lbWJlcklkLCBkaXNwbGF5TmFtZSwgY29udGFpbmVyID0gbnVsbCkge1xyXG4gICAgY29uc29sZS5sb2coYERpc3BsYXlpbmcgcmVtb3RlIHBhcnRpY2lwYW50ICR7bWVtYmVySWR9IGFsc28ga25vd24gYXMgJHtkaXNwbGF5TmFtZX1gKTtcclxuICAgIGNvbnN0IGNlbGwgPSBwcm92aWRlQ2VsbEluR3JpZChtZW1iZXJJZCwgY29udGFpbmVyKTtcclxuICAgIGNlbGwuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcbiAgICBpbmJvdW5kRGlzcGxheUJ5TWVtYmVyLnNldChtZW1iZXJJZCwgY2VsbCk7XHJcblxyXG4gICAgbGV0IGlzU3Vicm9vbSA9ICEhY29udGFpbmVyO1xyXG4gICAgY29uc3QgdmlkZW8gPSBkaXNwbGF5KGNlbGwsIHN0cmVhbSwgZGlzcGxheU5hbWUsIGlzU3Vicm9vbSwgaXNTdWJyb29tKTtcclxuXHJcbiAgICBpZiAoIWlzU3Vicm9vbSkge1xyXG4gICAgICAgIGluYm91bmQuYXBwZW5kQ29udHJvbHMoY2VsbCwgdmlkZW8sIG1lbWJlcklkKTtcclxuXHJcbiAgICAgICAgY29uc3QgaG9zdENvbnRyb2xzID0gaG9zdC5jcmVhdGVDb250cm9scyhtZW1iZXJJZCk7XHJcbiAgICAgICAgaWYgKGhvc3RDb250cm9scykge1xyXG4gICAgICAgICAgICBjZWxsLmFwcGVuZENoaWxkKGhvc3RDb250cm9scyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVJbmJvdW5kKG1lbWJlcklkKSB7XHJcbiAgICBjb25zdCBpbmJvdW5kRGlzcGxheSA9IGluYm91bmREaXNwbGF5QnlNZW1iZXIuZ2V0KG1lbWJlcklkKTtcclxuICAgIGlmIChpbmJvdW5kRGlzcGxheSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVtb3ZpbmcgZGlzcGxheSBmb3JcIiwgbWVtYmVySWQpO1xyXG4gICAgICAgIGluYm91bmREaXNwbGF5QnlNZW1iZXIuZGVsZXRlKG1lbWJlcklkKTtcclxuICAgICAgICBpbmJvdW5kRGlzcGxheS5yZW1vdmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYXJJbmJvdW5kKCkge1xyXG4gICAgaW5ib3VuZERpc3BsYXlCeU1lbWJlci5mb3JFYWNoKChjZWxsKSA9PiB7XHJcbiAgICAgICAgY2VsbC5yZW1vdmUoKTtcclxuICAgIH0pO1xyXG4gICAgaW5ib3VuZERpc3BsYXlCeU1lbWJlci5jbGVhcigpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtZW1iZXJEaXNwbGF5ZWQobWVtYmVySWQpIHtcclxuICAgIHJldHVybiAhIWluYm91bmREaXNwbGF5QnlNZW1iZXJbbWVtYmVySWRdO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBkaXNwbGF5KGNvbnRhaW5lciwgc3RyZWFtLCBsYWJlbCwgbWluaW1pemVkLCBpc0xvY2FsKSB7XHJcbiAgICBjb25zdCBjYXB0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInBcIik7XHJcbiAgICBjYXB0aW9uLnNldEF0dHJpYnV0ZShcImFsaWduXCIsIFwiY2VudGVyXCIpO1xyXG4gICAgY2FwdGlvbi5pbm5lclRleHQgPSBsYWJlbDtcclxuXHJcbiAgICBjb25zdCB2aWRlb1RyYWNrcyA9IG1lZGlhLnN0cmVhbVRyYWNrcyhzdHJlYW0sIFwidmlkZW9cIik7XHJcbiAgICBjb25zdCBhdWRpb1RyYWNrcyA9IG1lZGlhLnN0cmVhbVRyYWNrcyhzdHJlYW0sIFwiYXVkaW9cIik7XHJcblxyXG4gICAgY29uc3QgdmlkZW8gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidmlkZW9cIik7XHJcbiAgICB2aWRlby5zcmNPYmplY3QgPSBzdHJlYW07XHJcbiAgICBpZiAoaXNMb2NhbCkge1xyXG4gICAgICAgIHZpZGVvLm11dGVkID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzaXplID0gU0laRVNbbWluaW1pemVkXTtcclxuXHJcbiAgICBpZiAodmlkZW9UcmFja3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHZpZGVvLndpZHRoID0gc2l6ZS53aWR0aDtcclxuICAgICAgICB2aWRlby5oZWlnaHQgPSBzaXplLmhlaWdodDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmlkZW8ud2lkdGggPSAwO1xyXG4gICAgICAgIHZpZGVvLmhlaWdodCA9IDA7XHJcblxyXG4gICAgICAgIGNvbnN0IHNwZWFrZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgIGlmIChhdWRpb1RyYWNrcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHNwZWFrZXIuc3JjID0gXCJzcGVha2VyLmpwZ1wiO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNwZWFrZXIuc3JjID0gXCJtdXRlZC5qcGdcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3BlYWtlci53aWR0aCA9IHNpemUud2lkdGg7XHJcbiAgICAgICAgc3BlYWtlci5oZWlnaHQgPSBzaXplLmhlaWdodDtcclxuICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoc3BlYWtlcik7XHJcbiAgICB9XHJcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQodmlkZW8pO1xyXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwXCIpKTtcclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChjYXB0aW9uKTtcclxuXHJcbiAgICBhd2FpdCB2aWRlby5wbGF5KCk7XHJcbiAgICByZXR1cm4gdmlkZW87XHJcbn1cclxuXHJcbmxldCBncmlkV2lkdGg7XHJcblxyXG5mdW5jdGlvbiBtYWtlR3JpZFdpZGVyKCkge1xyXG4gICAgc2V0R3JpZFdpZHRoKGdyaWRXaWR0aCArIDEpO1xyXG59XHJcbmZ1bmN0aW9uIG1ha2VHcmlkTmFycm93ZXIoKSB7XHJcbiAgICBpZiAoZ3JpZFdpZHRoID4gMSkge1xyXG4gICAgICAgIHNldEdyaWRXaWR0aChncmlkV2lkdGggLSAxKTtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiBzZXRHcmlkV2lkdGgod2lkdGgpIHtcclxuICAgIGdyaWRXaWR0aCA9IHdpZHRoO1xyXG4gICAgaW5ib3VuZERpc3BsYXlzR3JpZC5zdHlsZS5ncmlkVGVtcGxhdGVDb2x1bW5zID0gXCJhdXRvIFwiLnJlcGVhdCh3aWR0aCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb3ZpZGVDZWxsSW5HcmlkKG1lbWJlcklkLCBjb250YWluZXIgPSBudWxsKSB7XHJcbiAgICBsZXQgY2VsbCA9IGluYm91bmREaXNwbGF5QnlNZW1iZXJbbWVtYmVySWRdO1xyXG4gICAgaWYgKCFjZWxsKSB7XHJcbiAgICAgICAgY2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICAgICAgbGV0IGdyaWQgPSBjb250YWluZXIgPyBjb250YWluZXIgOiBpbmJvdW5kRGlzcGxheXNHcmlkO1xyXG4gICAgICAgIGdyaWQuYXBwZW5kQ2hpbGQoY2VsbCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY2VsbDtcclxufVxyXG5cclxuY29uc3QgU0laRVMgPSB7XHJcbiAgICB0cnVlOiB7IHdpZHRoOiAzMjAsIGhlaWdodDogMjQwIH0sIC8vbWluaW1pemVkXHJcbiAgICBmYWxzZTogeyB3aWR0aDogNjQwLCBoZWlnaHQ6IDQ4MCB9LCAvL2Z1bGwtc2l6ZVxyXG59O1xyXG4iLCJjb25zdCBhcGkgPSByZXF1aXJlKCdqYW51cy12aWRlb3Jvb20tYXBpJyk7XHJcbmNvbnN0IHN1YnJvb20gPSByZXF1aXJlKCcuLi9zdWJyb29tJyk7XHJcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL2NvbmZpZycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBpbml0aWFsaXplLFxyXG4gICAgYXBwZW5kQ29udHJvbHNcclxufTtcclxuXHJcbmxldCByb29tQWRtaW5BcGkgPSB1bmRlZmluZWQ7XHJcblxyXG5sZXQgbW9uaXRvckZuO1xyXG5cclxubGV0IGNyZWF0ZVN1YlJvb21CdXR0b247XHJcbmNvbnN0IGNoZWNrYm94ZXMgPSBBcnJheSgpO1xyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZShtb2RlcmF0b3IsIF9tb25pdG9yRm4sIGphbnVzLCByb29tSWQsIHJvb21TZWNyZXQpIHtcclxuICAgIGlmIChyb29tQWRtaW5BcGkpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkJyZWFrLW91dCBjYXBhYmlsaXR5IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWRcIik7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgbW9uaXRvckZuID0gX21vbml0b3JGbjtcclxuXHJcbiAgICBqYW51cy5hZGRQbHVnaW4obmV3IGFwaS5WaWRlb1Jvb21BZG1pbihjb25maWcucm9vbSwgY29uc29sZSkpXHJcbiAgICAgICAgLnRoZW4oKGF0dGFjaGVkQXBpKSA9PiB7XHJcbiAgICAgICAgICAgIHJvb21BZG1pbkFwaSA9IGF0dGFjaGVkQXBpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlZpZGVvUm9vbUFkbWluIHBsdWdpbiBhdHRhY2hlZDpcIiwgcm9vbUFkbWluQXBpKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBjcmVhdGVTdWJSb29tQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjcmVhdGVTdWJSb29tXCIpO1xyXG4gICAgY3JlYXRlU3ViUm9vbUJ1dHRvbi5vbmNsaWNrID0gZm9ya1Jvb20obW9kZXJhdG9yLCByb29tSWQsIHJvb21TZWNyZXQpO1xyXG4gICAgY3JlYXRlU3ViUm9vbUJ1dHRvbi5oaWRkZW4gPSBmYWxzZTtcclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZm9ya1Jvb20obW9kZXJhdG9yLCByb29tSWQsIHJvb21TZWNyZXQpIHtcclxuICAgIHJldHVybiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBuZXcgYnJlYWstb3V0IHJvb21cIik7XHJcblxyXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkID0gY2hlY2tib3hlc1xyXG4gICAgICAgICAgICAuZmlsdGVyKChjaGVja2JveCkgPT4gY2hlY2tib3guY2hlY2tlZClcclxuICAgICAgICAgICAgLm1hcCgoY2hlY2tib3gpID0+IGNoZWNrYm94Lm1lbWJlcklkKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlNlbGVjdGVkIG1lbWJlcnNcIiwgc2VsZWN0ZWQpO1xyXG5cclxuICAgICAgICBjb25zdCByZWNvcmRpbmcgPSBmYWxzZTsgLy90b2RvXHJcbiAgICAgICAgY29uc3Qgc3Vicm9vbVBpbiA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICAgICAgICBjb25zdCBzdWJyb29tSWQgPSBhd2FpdCByb29tQWRtaW5BcGkuY3JlYXRlUm9vbShcIltCcmVhay1vdXQgcm9vbV1cIiwgdHJ1ZSwgcmVjb3JkaW5nLCBzdWJyb29tUGluLCByb29tU2VjcmV0KTtcclxuXHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHtcclxuICAgICAgICAgICAgXCJyb29tSWRcIjogcm9vbUlkLFxyXG4gICAgICAgICAgICBcIm9wZXJhdGlvblwiOiB7XHJcbiAgICAgICAgICAgICAgICBcImZvcmtSb29tXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBcInRhcmdldF9pZFwiOiBzdWJyb29tSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJ0YXJnZXRfcGluXCI6IHN1YnJvb21QaW4sXHJcbiAgICAgICAgICAgICAgICAgICAgXCJtZW1iZXJfaWRzXCI6IHNlbGVjdGVkXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhcIkJyZWFrLW91dCByZXF1ZXN0IGNvbnN0cnVjdGVkXCIsIGNvbW1hbmQpO1xyXG4gICAgICAgIG1vZGVyYXRvci5zZW5kUmVxdWVzdChjb21tYW5kKTtcclxuXHJcbiAgICAgICAgY29uc3QgZGlzcGxheSA9IHN1YnJvb20uY3JlYXRlTW9uaXRvcihzdWJyb29tSWQsIHN1YnJvb21QaW4sIFtcclxuICAgICAgICAgICAgbWVyZ2VSb29tKG1vZGVyYXRvciwgcm9vbUlkLCBzdWJyb29tSWQpLFxyXG4gICAgICAgICAgICBwcmVzZW50Um9vbShtb2RlcmF0b3IsIHJvb21JZCwgc3Vicm9vbUlkKVxyXG4gICAgICAgIF0pO1xyXG4gICAgICAgIG1vbml0b3JGbihzdWJyb29tSWQsIHN1YnJvb21QaW4sIGRpc3BsYXksIHRydWUpO1xyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gbWVyZ2VSb29tKG1vZGVyYXRvciwgcm9vbUlkLCBzdWJyb29tSWQpIHtcclxuICAgIHJldHVybiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJNZXJnaW5nIHN1YnJvb20gYmFja1wiLCBzdWJyb29tSWQpO1xyXG5cclxuICAgICAgICBjb25zdCBjb21tYW5kID0ge1xyXG4gICAgICAgICAgICBcInJvb21JZFwiOiByb29tSWQsXHJcbiAgICAgICAgICAgIFwib3BlcmF0aW9uXCI6IHtcclxuICAgICAgICAgICAgICAgIFwibWVyZ2VSb29tXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBcInRhcmdldF9pZFwiOiBzdWJyb29tSWQsXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhcIk1lcmdlLWJhY2sgcmVxdWVzdCBjb25zdHJ1Y3RlZFwiLCBjb21tYW5kKTtcclxuICAgICAgICBtb2RlcmF0b3Iuc2VuZFJlcXVlc3QoY29tbWFuZCk7XHJcblxyXG4gICAgICAgIHN1YnJvb20ucmVtb3ZlTW9uaXRvcihzdWJyb29tSWQpO1xyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gcHJlc2VudFJvb20obW9kZXJhdG9yLCByb29tSWQsIHN1YnJvb21JZCkge1xyXG4gICAgcmV0dXJuIGFzeW5jICgpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlByZXNlbnRpbmcgc3Vicm9vbSB0byB0aGUgY2xhc3Nyb29tXCIsIHN1YnJvb21JZCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSB7XHJcbiAgICAgICAgICAgIFwicm9vbUlkXCI6IHJvb21JZCxcclxuICAgICAgICAgICAgXCJvcGVyYXRpb25cIjoge1xyXG4gICAgICAgICAgICAgICAgXCJwcmVzZW50Um9vbVwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgXCJ0YXJnZXRfaWRcIjogc3Vicm9vbUlkLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJQcmVzZW50aW5nIHJlcXVlc3QgY29uc3RydWN0ZWQgXCIsIGNvbW1hbmQpO1xyXG4gICAgICAgIG1vZGVyYXRvci5zZW5kUmVxdWVzdChjb21tYW5kKTtcclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFwcGVuZENvbnRyb2xzKGNvbnRhaW5lciwgbWVtYmVySWQpIHtcclxuICAgIGNvbnN0IGNoZWNrYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xyXG4gICAgY2hlY2tib3gudHlwZSA9IFwiY2hlY2tib3hcIjtcclxuICAgIGNoZWNrYm94Lm1lbWJlcklkID0gbWVtYmVySWQ7XHJcblxyXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGNoZWNrYm94KTtcclxuICAgIGNoZWNrYm94ZXMucHVzaChjaGVja2JveCk7XHJcbn1cclxuIiwiY29uc3QgcmVzdHJpY3Rpb25zID0gcmVxdWlyZSgnLi9yZXN0cmljdGlvbnMnKTtcclxuY29uc3QgYnJlYWtvdXQgPSByZXF1aXJlKCcuL2JyZWFrb3V0Jyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIGluaXRpYWxpemUsXHJcbiAgICBjcmVhdGVDb250cm9scyxcclxufTtcclxuXHJcbmxldCBpbml0aWFsaXplZCA9IGZhbHNlO1xyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZShtb2RlcmF0b3IsIGphbnVzLCByb29tSWQsIHJvb21TZWNyZXQsIG1vbml0b3JGbikge1xyXG4gICAgaW5pdGlhbGl6ZWQgPSBpbml0aWFsaXplZCB8fCByZXN0cmljdGlvbnMuaW5pdGlhbGl6ZShtb2RlcmF0b3IsIHJvb21JZCkgJiZcclxuICAgICAgICAgICAgICAgICAgYnJlYWtvdXQuaW5pdGlhbGl6ZShtb2RlcmF0b3IsIG1vbml0b3JGbiwgamFudXMsIHJvb21JZCwgcm9vbVNlY3JldCk7XHJcbiAgICBjb25zb2xlLmxvZyhcIkhvc3QgY2FwYWJpbGl0aWVzIGluaXRpYWxpemVkP1wiLCBpbml0aWFsaXplZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUNvbnRyb2xzKG1lbWJlcklkKSB7XHJcbiAgICBpZiAoIWluaXRpYWxpemVkKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICByZXN0cmljdGlvbnMuYXBwZW5kQ29udHJvbHMoY29udGFpbmVyLCBtZW1iZXJJZCk7XHJcbiAgICBicmVha291dC5hcHBlbmRDb250cm9scyhjb250YWluZXIsIG1lbWJlcklkKTtcclxuXHJcbiAgICByZXR1cm4gY29udGFpbmVyO1xyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdGlhbGl6ZSxcclxuICAgIGFwcGVuZENvbnRyb2xzXHJcbn07XHJcblxyXG5sZXQgcmVzdHJpY3Rpb25zQXBpO1xyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZShtb2RlcmF0b3IsIHJvb21JZCkge1xyXG4gICAgaWYgKHJlc3RyaWN0aW9uc0FwaSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVzdHJpY3RpbmcgY2FwYWJpbGl0eSBpcyBhbHJlYWR5IGluaXRpYWxpemVkXCIpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb25zdHJ1Y3RSZXF1ZXN0KG1lbWJlcklkLCBraW5kLCByZXN0cmljdGVkKSB7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IHtcclxuICAgICAgICAgICAgXCJyb29tSWRcIjogcm9vbUlkLFxyXG4gICAgICAgICAgICBcIm9wZXJhdGlvblwiOiB7XHJcbiAgICAgICAgICAgICAgICBcInNldFJlc3RyaWN0aW9uXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICBcIm1lbWJlcl9pZFwiOiBtZW1iZXJJZCxcclxuICAgICAgICAgICAgICAgICAgICBcImtpbmRcIjoga2luZCxcclxuICAgICAgICAgICAgICAgICAgICBcInJlc3RyaWN0ZWRcIjogcmVzdHJpY3RlZFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJSZXN0cmljdGlvbiByZXF1ZXN0IGNvbnN0cnVjdGVkIFwiLCBjb21tYW5kKTtcclxuICAgICAgICByZXR1cm4gY29tbWFuZDtcclxuICAgIH1cclxuXHJcbiAgICByZXN0cmljdGlvbnNBcGkgPSB7XHJcbiAgICAgICAgcmVzdHJpY3RQYXJ0aWNpcGFudDogKG1lbWJlcklkLCBraW5kKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXN0cmljdGluZyAke2tpbmR9IHRyYWNrIG9mICR7bWVtYmVySWR9YCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbW1hbmQgPSBjb25zdHJ1Y3RSZXF1ZXN0KG1lbWJlcklkLCBraW5kLCB0cnVlKTtcclxuICAgICAgICAgICAgbW9kZXJhdG9yLnNlbmRSZXF1ZXN0KGNvbW1hbmQpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdW5yZXN0cmljdFBhcnRpY2lwYW50OiAobWVtYmVySWQsIGtpbmQpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYFVucmVzdHJpY3RpbmcgJHtraW5kfSB0cmFjayBvZiAke21lbWJlcklkfWApO1xyXG4gICAgICAgICAgICBjb25zdCBjb21tYW5kID0gY29uc3RydWN0UmVxdWVzdChtZW1iZXJJZCwga2luZCwgZmFsc2UpO1xyXG4gICAgICAgICAgICBtb2RlcmF0b3Iuc2VuZFJlcXVlc3QoY29tbWFuZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXBwZW5kQ29udHJvbHMoY29udGFpbmVyLCBtZW1iZXJJZCkge1xyXG4gICAgY29uc3QgbXV0ZUZvckFsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICBtdXRlRm9yQWxsLmlubmVyVGV4dCA9IE1VVEVfQVVESU9fRk9SX0FMTDtcclxuICAgIG11dGVGb3JBbGwub25jbGljayA9IG11dGVBdWRpb0ZvckFsbChtZW1iZXJJZCwgbXV0ZUZvckFsbCk7XHJcblxyXG4gICAgY29uc3QgaGlkZUZvckFsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICBoaWRlRm9yQWxsLmlubmVyVGV4dCA9IE1VVEVfVklERU9fRk9SX0FMTDtcclxuICAgIGhpZGVGb3JBbGwub25jbGljayA9IG11dGVWaWRlb0ZvckFsbChtZW1iZXJJZCwgaGlkZUZvckFsbCk7XHJcblxyXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG11dGVGb3JBbGwpO1xyXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGhpZGVGb3JBbGwpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtdXRlQXVkaW9Gb3JBbGwobWVtYmVySWQsIGJ1dHRvbikge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICByZXN0cmljdGlvbnNBcGkucmVzdHJpY3RQYXJ0aWNpcGFudChtZW1iZXJJZCwgXCJhdWRpb1wiKTtcclxuXHJcbiAgICAgICAgYnV0dG9uLmlubmVyVGV4dCA9IFVOTVVURV9BVURJT19GT1JfQUxMO1xyXG4gICAgICAgIGJ1dHRvbi5vbmNsaWNrID0gdW5tdXRlQXVkaW9Gb3JBbGwobWVtYmVySWQsIGJ1dHRvbik7XHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBtdXRlVmlkZW9Gb3JBbGwobWVtYmVySWQsIGJ1dHRvbikge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICByZXN0cmljdGlvbnNBcGkucmVzdHJpY3RQYXJ0aWNpcGFudChtZW1iZXJJZCwgXCJ2aWRlb1wiKTtcclxuXHJcbiAgICAgICAgYnV0dG9uLmlubmVyVGV4dCA9IFVOTVVURV9WSURFT19GT1JfQUxMO1xyXG4gICAgICAgIGJ1dHRvbi5vbmNsaWNrID0gdW5tdXRlVmlkZW9Gb3JBbGwobWVtYmVySWQsIGJ1dHRvbik7XHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiB1bm11dGVBdWRpb0ZvckFsbChtZW1iZXJJZCwgYnV0dG9uKSB7XHJcbiAgICByZXR1cm4gKCkgPT4ge1xyXG4gICAgICAgIHJlc3RyaWN0aW9uc0FwaS51bnJlc3RyaWN0UGFydGljaXBhbnQobWVtYmVySWQsIFwiYXVkaW9cIik7XHJcblxyXG4gICAgICAgIGJ1dHRvbi5pbm5lclRleHQgPSBNVVRFX0FVRElPX0ZPUl9BTEw7XHJcbiAgICAgICAgYnV0dG9uLm9uY2xpY2sgPSBtdXRlQXVkaW9Gb3JBbGwobWVtYmVySWQsIGJ1dHRvbik7XHJcbiAgICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiB1bm11dGVWaWRlb0ZvckFsbChtZW1iZXJJZCwgYnV0dG9uKSB7XHJcbiAgICByZXR1cm4gKCkgPT4ge1xyXG4gICAgICAgIHJlc3RyaWN0aW9uc0FwaS51bnJlc3RyaWN0UGFydGljaXBhbnQobWVtYmVySWQsIFwidmlkZW9cIik7XHJcblxyXG4gICAgICAgIGJ1dHRvbi5pbm5lclRleHQgPSBNVVRFX1ZJREVPX0ZPUl9BTEw7XHJcbiAgICAgICAgYnV0dG9uLm9uY2xpY2sgPSBtdXRlVmlkZW9Gb3JBbGwobWVtYmVySWQsIGJ1dHRvbik7XHJcbiAgICB9O1xyXG59XHJcblxyXG5jb25zdCBNVVRFX0FVRElPX0ZPUl9BTEwgPSBcIk11dGUgZm9yIGFsbFwiO1xyXG5jb25zdCBVTk1VVEVfQVVESU9fRk9SX0FMTCA9IFwiVW5tdXRlIGZvciBhbGxcIjtcclxuY29uc3QgTVVURV9WSURFT19GT1JfQUxMID0gXCJVbndhdGNoIGZvciBhbGxcIjtcclxuY29uc3QgVU5NVVRFX1ZJREVPX0ZPUl9BTEwgPSBcIldhdGNoIGZvciBhbGxcIjtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBpbml0aWFsaXplLFxyXG4gICAgYXBwZW5kQ29udHJvbHMsXHJcbn07XHJcblxyXG5sZXQgc3Vic2NyaXB0aW9ucztcclxuLy8gTWFwW01lbWJlcklkLCBTdWJzY3JpYmVyXVxyXG5cclxubGV0IHN1YnJvb21TdWJzY3JpcHRpb25zO1xyXG4vLyBNYXBbUm9vbUlkLCBNYXBbTWVtYmVySWQsIFN1YnNjcmliZXJdXVxyXG5cclxubGV0IHJlbW92ZUZvY3VzQnV0dG9uO1xyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZShfc3Vic2NyaXB0aW9ucywgX3N1YnJvb21TdWJzY3JpcHRpb25zKSB7XHJcbiAgICBzdWJzY3JpcHRpb25zID0gX3N1YnNjcmlwdGlvbnM7XHJcbiAgICBzdWJyb29tU3Vic2NyaXB0aW9ucyA9IF9zdWJyb29tU3Vic2NyaXB0aW9ucztcclxuICAgIHJlbW92ZUZvY3VzQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZW1vdmVGb2N1c1wiKTtcclxuICAgIHJlbW92ZUZvY3VzQnV0dG9uLm9uY2xpY2sgPSByZW1vdmVGb2N1cztcclxufVxyXG5cclxuZnVuY3Rpb24gYXBwZW5kQ29udHJvbHMoY29udGFpbmVyLCB2aWRlbywgbWVtYmVySWQpIHtcclxuICAgIGNvbnN0IG11dGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgbXV0ZS5pbm5lclRleHQgPSBNVVRFX0lOQk9VTkRfQVVESU87XHJcbiAgICBtdXRlLm9uY2xpY2sgPSBtdXRlQXVkaW8obWVtYmVySWQsIG11dGUpO1xyXG5cclxuICAgIGNvbnN0IGhpZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgaGlkZS5pbm5lclRleHQgPSBNVVRFX0lOQk9VTkRfVklERU87XHJcbiAgICBoaWRlLm9uY2xpY2sgPSBtdXRlVmlkZW8obWVtYmVySWQsIGhpZGUpO1xyXG5cclxuICAgIGNvbnN0IGZvY3VzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgIGZvY3VzLmlubmVyVGV4dCA9IEZPQ1VTX09OX01FTUJFUjtcclxuICAgIGZvY3VzLm9uY2xpY2sgPSBmb2N1c09uTWVtYmVyKG1lbWJlcklkKTtcclxuXHJcbiAgICBjb25zdCBmdWxsc2NyZWVuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcclxuICAgIGZ1bGxzY3JlZW4uaW5uZXJUZXh0ID0gU1dJVENIX0ZVTExfU0NSRUVOO1xyXG4gICAgZnVsbHNjcmVlbi5vbmNsaWNrID0gc3dpdGNoRnVsbFNjcmVlbihtZW1iZXJJZCwgdmlkZW8pO1xyXG5cclxuICAgIGNvbnN0IGxlZnRIYWxmID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIGxlZnRIYWxmLmFwcGVuZENoaWxkKG11dGUpO1xyXG4gICAgbGVmdEhhbGYuYXBwZW5kQ2hpbGQoaGlkZSk7XHJcbiAgICBsZWZ0SGFsZi5zdHlsZS5mbG9hdCA9IFwibGVmdFwiO1xyXG5cclxuICAgIGNvbnN0IHJpZ2h0SGFsZiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICByaWdodEhhbGYuYXBwZW5kQ2hpbGQoZm9jdXMpO1xyXG4gICAgcmlnaHRIYWxmLmFwcGVuZENoaWxkKGZ1bGxzY3JlZW4pO1xyXG4gICAgcmlnaHRIYWxmLnN0eWxlLmZsb2F0ID0gXCJyaWdodFwiO1xyXG5cclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsZWZ0SGFsZik7XHJcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQocmlnaHRIYWxmKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZm9jdXNPbk1lbWJlcihtZW1iZXJJZCkge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkZvY3VzaW5nIG9uIG1lbWJlclwiLCBtZW1iZXJJZCk7XHJcbiAgICAgICAgc3Vic2NyaXB0aW9ucy5mb3JFYWNoKChzdWJzY3JpcHRpb24pID0+IHtcclxuICAgICAgICAgICAgaWYgKG1lbWJlcklkID09PSBzdWJzY3JpcHRpb24ucHVibGlzaGVySWQpIHtcclxuICAgICAgICAgICAgICAgIHN1YnNjcmlwdGlvbi5zdGFydFZpZGVvKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb24uc3RvcFZpZGVvKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZW1vdmVGb2N1c0J1dHRvbi5oaWRkZW4gPSBmYWxzZTtcclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUZvY3VzKCkge1xyXG4gICAgY29uc29sZS5sb2coXCJSZW1vdmluZyBmb2N1cyBvbiBhIHBhcnRpY3VsYXIgbWVtYmVyXCIpO1xyXG4gICAgc3Vic2NyaXB0aW9ucy5mb3JFYWNoKChzdWJzY3JpcHRpb24pID0+IHtcclxuICAgICAgICBzdWJzY3JpcHRpb24uc3RhcnRWaWRlbygpO1xyXG4gICAgfSk7XHJcbiAgICByZW1vdmVGb2N1c0J1dHRvbi5oaWRkZW4gPSB0cnVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzd2l0Y2hGdWxsU2NyZWVuKG1lbWJlcklkLCB2aWRlbykge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICBpZiAodmlkZW8ucmVxdWVzdEZ1bGxzY3JlZW4pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHZW5lcmljIGZ1bGxzY3JlZW4gbWV0aG9kIHdvcmtzXCIpO1xyXG4gICAgICAgICAgICB2aWRlby5yZXF1ZXN0RnVsbHNjcmVlbigpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodmlkZW8ubW96UmVxdWVzdEZ1bGxTY3JlZW4pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJGaXJlZm94IGlzIGJlaW5nIHVzZWRcIik7XHJcbiAgICAgICAgICAgIHZpZGVvLm1velJlcXVlc3RGdWxsU2NyZWVuKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh2aWRlby53ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNocm9tZS9TYWZhcmkvT3BlcmEgaXMgYmVpbmcgdXNlZFwiKTtcclxuICAgICAgICAgICAgdmlkZW8ud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4oKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHZpZGVvLm1zUmVxdWVzdEZ1bGxzY3JlZW4pIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBcmUgeW91IHVzaW5nIElFL0VkZ2U/IFNlcmlvdXNseT9cIik7XHJcbiAgICAgICAgICAgIHZpZGVvLm1zUmVxdWVzdEZ1bGxzY3JlZW4oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZpZGVvLm9uZnVsbHNjcmVlbmNoYW5nZSA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRW50ZXJpbmcgZnVsbC1zY3JlZW5cIiwgZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgZm9jdXNPbk1lbWJlcihtZW1iZXJJZCkoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTGVhdmluZyBmdWxsLXNjcmVlblwiLCBldmVudCk7XHJcbiAgICAgICAgICAgICAgICByZW1vdmVGb2N1cygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11dGVBdWRpbyhtZW1iZXJJZCwgYnV0dG9uKSB7XHJcbiAgICByZXR1cm4gKCkgPT4ge1xyXG4gICAgICAgIHN1YnNjcmlwdGlvbnMuZ2V0KG1lbWJlcklkKS5zdG9wQXVkaW8oKTtcclxuICAgICAgICBidXR0b24uaW5uZXJUZXh0ID0gVU5NVVRFX0lOQk9VTkRfQVVESU87XHJcbiAgICAgICAgYnV0dG9uLm9uY2xpY2sgPSB1bm11dGVBdWRpbyhtZW1iZXJJZCwgYnV0dG9uKTtcclxuICAgIH07XHJcbn1cclxuZnVuY3Rpb24gbXV0ZVZpZGVvKG1lbWJlcklkLCBidXR0b24pIHtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgc3Vic2NyaXB0aW9ucy5nZXQobWVtYmVySWQpLnN0b3BWaWRlbygpO1xyXG4gICAgICAgIGJ1dHRvbi5pbm5lclRleHQgPSBVTk1VVEVfSU5CT1VORF9WSURFTztcclxuICAgICAgICBidXR0b24ub25jbGljayA9IHVubXV0ZVZpZGVvKG1lbWJlcklkLCBidXR0b24pO1xyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gdW5tdXRlQXVkaW8obWVtYmVySWQsIGJ1dHRvbikge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICBzdWJzY3JpcHRpb25zLmdldChtZW1iZXJJZCkuc3RhcnRBdWRpbygpO1xyXG4gICAgICAgIGJ1dHRvbi5pbm5lclRleHQgPSBNVVRFX0lOQk9VTkRfQVVESU87XHJcbiAgICAgICAgYnV0dG9uLm9uY2xpY2sgPSBtdXRlQXVkaW8obWVtYmVySWQsIGJ1dHRvbik7XHJcbiAgICB9O1xyXG59XHJcbmZ1bmN0aW9uIHVubXV0ZVZpZGVvKG1lbWJlcklkLCBidXR0b24pIHtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgc3Vic2NyaXB0aW9ucy5nZXQobWVtYmVySWQpLnN0YXJ0VmlkZW8oKTtcclxuICAgICAgICBidXR0b24uaW5uZXJUZXh0ID0gTVVURV9JTkJPVU5EX1ZJREVPO1xyXG4gICAgICAgIGJ1dHRvbi5vbmNsaWNrID0gbXV0ZVZpZGVvKG1lbWJlcklkLCBidXR0b24pO1xyXG4gICAgfTtcclxufVxyXG5cclxuY29uc3QgTVVURV9JTkJPVU5EX0FVRElPID0gXCJNdXRlXCI7XHJcbmNvbnN0IFVOTVVURV9JTkJPVU5EX0FVRElPID0gXCJVbm11dGVcIjtcclxuY29uc3QgTVVURV9JTkJPVU5EX1ZJREVPID0gXCJVbndhdGNoXCI7XHJcbmNvbnN0IFVOTVVURV9JTkJPVU5EX1ZJREVPID0gXCJXYXRjaFwiO1xyXG5cclxuY29uc3QgRk9DVVNfT05fTUVNQkVSID0gXCJGb2N1c1wiO1xyXG5jb25zdCBTV0lUQ0hfRlVMTF9TQ1JFRU4gPSBcIkZ1bGwgc2NyZWVuXCI7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdGlhbGl6ZSxcclxuICAgIGRlaW5pdGlhbGl6ZSxcclxuICAgIGJpbmREZXZpY2VzLFxyXG4gICAgYmluZFNjcmVlbixcclxuICAgIG11dGVEZXZpY2VzLFxyXG4gICAgbXV0ZVNjcmVlbixcclxuICAgIHVubXV0ZVNjcmVlbixcclxuICAgIG91dGJvdW5kVHJhY2tzLFxyXG4gICAgc3RyZWFtVHJhY2tzLFxyXG5cclxuICAgIGxvd0ZQUzogeyBpZGVhbDogNCB9LFxyXG4gICAgaGlnaEZQUzogeyBpZGVhbDogMzAgfSxcclxuICAgIGxvd1Jlc1dpZHRoOiB7IG1heDogNjQwIH0sXHJcbiAgICBsb3dSZXNIZWlnaHQ6IHsgbWF4OiA0ODAgfSxcclxuICAgIGhpZ2hSZXNXaWR0aDogeyBtaW46IDEyODAsIGlkZWFsOiAxOTYwIH0sXHJcbiAgICBoaWdoUmVzSGVpZ2h0OiB7IG1pbjogNzIwLCBpZGVhbDogMTA4MCB9LFxyXG59O1xyXG5cclxubGV0IGF1ZGlvQWN0aXZlID0gZmFsc2U7XHJcbmxldCB2aWRlb0FjdGl2ZSA9IGZhbHNlO1xyXG5sZXQgc2NyZWVuQWN0aXZlID0gZmFsc2U7XHJcblxyXG5sZXQgYXVkaW9TZW5kZXJzID0gW107XHJcbmxldCB2aWRlb1NlbmRlcnMgPSBbXTtcclxuXHJcbmxldCBzY3JlZW5WaWRlb1RyYWNrcyA9IFtdO1xyXG5cclxubGV0IG1vY2tBdWRpbyA9IG51bGw7XHJcbmxldCBtb2NrVmlkZW8gPSBudWxsO1xyXG5cclxubGV0IHN0cmVhbSA9IG5ldyBNZWRpYVN0cmVhbSgpO1xyXG5zdHJlYW0uYWRkVHJhY2sobW9ja01lZGlhU3RyZWFtVHJhY2soXCJhdWRpb1wiKSk7XHJcbnN0cmVhbS5hZGRUcmFjayhtb2NrTWVkaWFTdHJlYW1UcmFjayhcInZpZGVvXCIpKTtcclxuLy8gRm9yIHVua25vd24gcmVhc29uLCBqdXN0IGFkZGluZyBuZXcgdHJhY2tzIHRvIGV4aXN0aW5nIHN0cmVhbVxyXG4vLyBkb2Vzbid0IGZpcmUgXCJzdHJlYW0ub25hZGR0cmFja1wiIG9uIHJlbW90ZSBzaWRlOyB0aGlzIGlzIHdoeVxyXG4vLyB3ZSBjcmVhdGUgZmFrZSB0cmFja3MgaWYgdXNlciBkb2Vzbid0IHdhbnQgdG8gc2hhcmUgYXVkaW8vdmlkZW9cclxuLy8gZnJvbSB0aGUgdmVyeSBiZWdpbm5pbmcsIGFuZCByZXBsYWNlIHRoZW0gbGF0ZXJcclxuLy8gaWYgaGUgZGVjaWRlcyB0byBzaGFyZSB0aGVtXHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplKHBlZXJDb25uZWN0aW9uKSB7XHJcbiAgICBzdHJlYW0uZ2V0VHJhY2tzKCkuZm9yRWFjaCgodHJhY2spID0+IHtcclxuICAgICAgICBwZWVyQ29ubmVjdGlvbi5hZGRUcmFjayh0cmFjayk7XHJcbiAgICB9KTtcclxuICAgIHBlZXJDb25uZWN0aW9uLmdldFNlbmRlcnMoKVxyXG4gICAgICAgIC5mb3JFYWNoKChzZW5kZXIpID0+IHtcclxuICAgICAgICAgICAgaWYgKHNlbmRlci50cmFjay5raW5kID09PSBcImF1ZGlvXCIpIHtcclxuICAgICAgICAgICAgICAgIGF1ZGlvU2VuZGVycy5wdXNoKHNlbmRlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHNlbmRlci50cmFjay5raW5kID09PSBcInZpZGVvXCIpIHtcclxuICAgICAgICAgICAgICAgIHZpZGVvU2VuZGVycy5wdXNoKHNlbmRlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIHJldHVybiBzdHJlYW07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRlaW5pdGlhbGl6ZSgpIHtcclxuICAgIGF1ZGlvU2VuZGVycyA9IFtdO1xyXG4gICAgdmlkZW9TZW5kZXJzID0gW107XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGJpbmREZXZpY2VzKGF1ZGlvLCB2aWRlbykge1xyXG4gICAgY29uc29sZS5sb2coXCJNaWNyb3Bob25lIHJlcXVlc3RlZD9cIiwgYXVkaW8pO1xyXG4gICAgY29uc29sZS5sb2coXCJDYW1lcmEgcmVxdWVzdGVkP1wiLCB2aWRlbyk7XHJcbiAgICBjb25zb2xlLmxvZyhcIk1pY3JvcGhvbmUgYm91bmQ/XCIsIGF1ZGlvQWN0aXZlKTtcclxuICAgIGNvbnNvbGUubG9nKFwiQ2FtZXJhIGJvdW5kP1wiLCB2aWRlb0FjdGl2ZSk7XHJcbiAgICBjb25zdCBjb25zdHJhaW50cyA9IHtcclxuICAgICAgICBhdWRpbzogYXVkaW8gfHwgYXVkaW9BY3RpdmUsXHJcbiAgICAgICAgdmlkZW86IHZpZGVvIHx8IHZpZGVvQWN0aXZlLFxyXG4gICAgfTtcclxuICAgIGlmICghY29uc3RyYWludHMuYXVkaW8gJiYgIWNvbnN0cmFpbnRzLnZpZGVvKSB7XHJcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhcIkJpbmRpbmcgZGV2aWNlc1wiLCBjb25zdHJhaW50cyk7XHJcbiAgICBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzXHJcbiAgICAgICAgLmdldFVzZXJNZWRpYShjb25zdHJhaW50cylcclxuICAgICAgICAuY2F0Y2goKGUpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhdWRpb1RyYWNrcyA9IHN0cmVhbS5nZXRBdWRpb1RyYWNrcygpO1xyXG4gICAgYXVkaW9UcmFja3MuZm9yRWFjaCgodHJhY2spID0+IHtcclxuICAgICAgICBwcmludERlYnVnSW5mbyh0cmFjayk7XHJcblxyXG4gICAgICAgIGNvbnN0IGF1ZGlvU2V0dGluZ3MgPSB0cmFjay5nZXRTZXR0aW5ncygpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiW1sgaXMgZWNobyBjYW5jZWxsYXRpb24gb24/IF1dXCIsIGF1ZGlvU2V0dGluZ3MuZWNob0NhbmNlbGxhdGlvbik7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJbWyBpcyBub2lzZSBzdXBwcmVzc2lvbiBvbj8gXV1cIiwgYXVkaW9TZXR0aW5ncy5ub2lzZVN1cHByZXNzaW9uKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIltbIGlzIGF1dG8gZ2FpbiBjb250cm9sIG9uPyBdXVwiLCBhdWRpb1NldHRpbmdzLmF1dG9HYWluQ29udHJvbCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB2aWRlb1RyYWNrcyA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpO1xyXG4gICAgdmlkZW9UcmFja3MuZm9yRWFjaCgodHJhY2spID0+IHtcclxuICAgICAgICBwcmludERlYnVnSW5mbyh0cmFjayk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiByZXBsYWNlVHJhY2tzKGtpbmQsIG5ld1RyYWNrcykge1xyXG4gICAgICAgIGNvbnNvbGUuYXNzZXJ0KG5ld1RyYWNrcy5sZW5ndGggPCAyKTtcclxuXHJcbiAgICAgICAgaWYgKGtpbmQgPT09IFwiYXVkaW9cIikge1xyXG4gICAgICAgICAgICBhd2FpdCBhdWRpb1NlbmRlcnNbMF0ucmVwbGFjZVRyYWNrKG5ld1RyYWNrc1swXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChraW5kID09PSBcInZpZGVvXCIpIHtcclxuICAgICAgICAgICAgYXdhaXQgdmlkZW9TZW5kZXJzWzBdLnJlcGxhY2VUcmFjayhuZXdUcmFja3NbMF0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoYXVkaW9UcmFja3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGF3YWl0IHJlcGxhY2VUcmFja3MoXCJhdWRpb1wiLCBhdWRpb1RyYWNrcyk7XHJcbiAgICAgICAgYXVkaW9BY3RpdmUgPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgaWYgKHZpZGVvVHJhY2tzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBhd2FpdCByZXBsYWNlVHJhY2tzKFwidmlkZW9cIiwgdmlkZW9UcmFja3MpO1xyXG4gICAgICAgIHZpZGVvQWN0aXZlID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gc3RyZWFtO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtdXRlRGV2aWNlcyhraW5kKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIk11dGluZyBib3VuZCBkZXZpY2VcIiwga2luZCk7XHJcbiAgICBvdXRib3VuZFRyYWNrcyhraW5kKVxyXG4gICAgICAgIC5mb3JFYWNoKCh0cmFjaykgPT4ge1xyXG4gICAgICAgICAgICBwcmludERlYnVnSW5mbyh0cmFjayk7XHJcbiAgICAgICAgICAgIHRyYWNrLmVuYWJsZWQgPSBmYWxzZTtcclxuICAgICAgICB9KTtcclxuICAgIGlmIChraW5kID09PSBcImF1ZGlvXCIpIHtcclxuICAgICAgICBhdWRpb0FjdGl2ZSA9IGZhbHNlO1xyXG4gICAgfVxyXG4gICAgaWYgKGtpbmQgPT09IFwidmlkZW9cIikge1xyXG4gICAgICAgIHZpZGVvQWN0aXZlID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc3RyZWFtO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBiaW5kU2NyZWVuKCkge1xyXG4gICAgY29uc29sZS5hc3NlcnQoIXNjcmVlbkFjdGl2ZSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coXCJCaW5kaW5nIHNjcmVlbiBtZWRpYVwiKTtcclxuICAgIGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0RGlzcGxheU1lZGlhKClcclxuICAgICAgICAudGhlbigoc3RyZWFtKSA9PiB7XHJcbiAgICAgICAgICAgIHNjcmVlbkFjdGl2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgIHNjcmVlblZpZGVvVHJhY2tzID0gc3RyZWFtLmdldFZpZGVvVHJhY2tzKCk7XHJcbiAgICAgICAgICAgIGlmIChzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJUaGVyZSBhcmUgYWxzbyBhdWRpbyB0cmFja3NcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICAgIC5jYXRjaCgoZSkgPT4ge1xyXG4gICAgICAgICAgICBzY3JlZW5BY3RpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgc2NyZWVuVmlkZW9UcmFja3MgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgY29uc29sZS5hc3NlcnQoc2NyZWVuVmlkZW9UcmFja3MubGVuZ3RoID09PSAxKTtcclxuICAgIHJldHVybiBzY3JlZW5WaWRlb1RyYWNrc1swXTtcclxufVxyXG5cclxuZnVuY3Rpb24gbXV0ZVNjcmVlbigpIHtcclxuICAgIHNjcmVlblZpZGVvVHJhY2tzLmZvckVhY2goKHRyYWNrKSA9PiB7XHJcbiAgICAgICAgdHJhY2suZW5hYmxlZCA9IGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgICBzY3JlZW5BY3RpdmUgPSBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gdW5tdXRlU2NyZWVuKCkge1xyXG4gICAgY29uc29sZS5hc3NlcnQoIXNjcmVlbkFjdGl2ZSk7XHJcbiAgICBjb25zb2xlLmFzc2VydChzY3JlZW5WaWRlb1RyYWNrcyk7XHJcbiAgICBzY3JlZW5WaWRlb1RyYWNrcy5mb3JFYWNoKCh0cmFjaykgPT4ge1xyXG4gICAgICAgIHRyYWNrLmVuYWJsZWQgPSB0cnVlO1xyXG4gICAgfSk7XHJcbiAgICBzY3JlZW5BY3RpdmUgPSB0cnVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdHJlYW1UcmFja3Moc3RyZWFtLCBraW5kKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhdWRpb1wiKSB7XHJcbiAgICAgICAgcmV0dXJuIHN0cmVhbVxyXG4gICAgICAgICAgICAuZ2V0QXVkaW9UcmFja3MoKVxyXG4gICAgICAgICAgICAuZmlsdGVyKCh0cmFjaykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcHJpbnREZWJ1Z0luZm8odHJhY2spO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYWNrLmVuYWJsZWQgJiYgdHJhY2suaWQgIT09IG1vY2tBdWRpby5pZDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpZiAoa2luZCA9PT0gXCJ2aWRlb1wiKSB7XHJcbiAgICAgICAgcmV0dXJuIHN0cmVhbVxyXG4gICAgICAgICAgICAuZ2V0VmlkZW9UcmFja3MoKVxyXG4gICAgICAgICAgICAuZmlsdGVyKCh0cmFjaykgPT4ge1xyXG4gICAgICAgICAgICAgICAgcHJpbnREZWJ1Z0luZm8odHJhY2spO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyYWNrLmVuYWJsZWQgJiYgdHJhY2suaWQgIT09IG1vY2tWaWRlby5pZDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG91dGJvdW5kVHJhY2tzKGtpbmQpIHtcclxuICAgIGxldCBzZW5kZXJzO1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYXVkaW9cIikge1xyXG4gICAgICAgIHNlbmRlcnMgPSBhdWRpb1NlbmRlcnM7XHJcbiAgICB9XHJcbiAgICBpZiAoa2luZCA9PT0gXCJ2aWRlb1wiKSB7XHJcbiAgICAgICAgc2VuZGVycyA9IHZpZGVvU2VuZGVycztcclxuICAgIH1cclxuICAgIHJldHVybiBzZW5kZXJzLm1hcCgoc2VuZGVyKSA9PiBzZW5kZXIudHJhY2spO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb2NrTWVkaWFTdHJlYW1UcmFjayhraW5kKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgSW5pdGlhbGl6aW5nIG1vY2sgJHtraW5kfSBzdHJlYW1gKTtcclxuICAgIGlmIChraW5kID09PSBcImF1ZGlvXCIpIHtcclxuICAgICAgICBpZiAobW9ja0F1ZGlvKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBtb2NrQXVkaW87XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc3QgY3R4ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xyXG4gICAgICAgICAgICBjb25zdCBvc2NpbGxhdG9yID0gY3R4LmNyZWF0ZU9zY2lsbGF0b3IoKTtcclxuICAgICAgICAgICAgY29uc3QgZHN0ID0gb3NjaWxsYXRvci5jb25uZWN0KGN0eC5jcmVhdGVNZWRpYVN0cmVhbURlc3RpbmF0aW9uKCkpO1xyXG4gICAgICAgICAgICBvc2NpbGxhdG9yLnN0YXJ0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRyYWNrID0gT2JqZWN0LmFzc2lnbihkc3Quc3RyZWFtLmdldEF1ZGlvVHJhY2tzKClbMF0sIHtlbmFibGVkOiBmYWxzZX0pO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vY2tNZWRpYVN0cmVhbVRyYWNrKCdhdWRpbycpLmlkXCIsIHRyYWNrLmlkKTtcclxuXHJcbiAgICAgICAgICAgIG1vY2tBdWRpbyA9IHRyYWNrO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJhY2s7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGtpbmQgPT09IFwidmlkZW9cIikge1xyXG4gICAgICAgIGlmIChtb2NrVmlkZW8pIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1vY2tWaWRlbztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCB3aWR0aCA9IDY0MDtcclxuICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gNDgwO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgY2FudmFzID0gT2JqZWN0LmFzc2lnbihkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLCB7d2lkdGgsIGhlaWdodH0pO1xyXG4gICAgICAgICAgICBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKS5maWxsUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcclxuICAgICAgICAgICAgY29uc3Qgc3RyZWFtID0gY2FudmFzLmNhcHR1cmVTdHJlYW0oMSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRyYWNrID0gT2JqZWN0LmFzc2lnbihzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKVswXSwge2VuYWJsZWQ6IGZhbHNlfSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW9ja01lZGlhU3RyZWFtVHJhY2soJ3ZpZGVvJykuaWRcIiwgdHJhY2suaWQpO1xyXG5cclxuICAgICAgICAgICAgbW9ja1ZpZGVvID0gdHJhY2s7XHJcbiAgICAgICAgICAgIHJldHVybiB0cmFjaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmVycm9yKGB1bmtub3duIGtpbmQgJHtraW5kfWApO1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuZnVuY3Rpb24gcHJpbnREZWJ1Z0luZm8odHJhY2spIHtcclxuICAgIGxldCBsYWJlbCA9IFwiXCI7XHJcbiAgICBpZiAoIXRyYWNrLmVuYWJsZWQpIHtcclxuICAgICAgICBsYWJlbCArPSBcIiBbIGRpc2FibGVkIF1cIjtcclxuICAgIH1cclxuICAgIGlmICh0cmFjay5pZCA9PT0gbW9ja0F1ZGlvLmlkIHx8IHRyYWNrLmlkID09PSBtb2NrVmlkZW8uaWQpIHtcclxuICAgICAgICBsYWJlbCArPSBcIiBbIG1vY2sgXVwiO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coYFsgJHt0cmFjay5raW5kfSB0cmFjayBdLmlkID0gJHt0cmFjay5pZH0ke2xhYmVsfWApO1xyXG59XHJcbiIsImNvbnN0IGRpc3BsYXkgPSByZXF1aXJlKCcuL2Rpc3BsYXknKTtcclxuY29uc3QgbWVkaWEgPSByZXF1aXJlKCcuL21lZGlhJyk7XHJcbmNvbnN0IHJvb20gPSByZXF1aXJlKCcuL3Jvb20nKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdGlhbGl6ZSxcclxuICAgIGluaXRpYWxpemVTdWJyb29tLFxyXG4gICAgZGVpbml0aWFsaXplLFxyXG5cclxuICAgIG11dGVBdWRpbyxcclxuICAgIHN0b3BWaWRlbyxcclxuICAgIHVubXV0ZUF1ZGlvLFxyXG4gICAgc3RhcnRWaWRlbyxcclxuXHJcbiAgICByZXN0cmljdEF1ZGlvLFxyXG4gICAgcmVzdHJpY3RWaWRlbyxcclxuICAgIHVucmVzdHJpY3RBdWRpbyxcclxuICAgIHVucmVzdHJpY3RWaWRlbyxcclxufTtcclxuXHJcbmxldCBtZW1iZXI7XHJcbmxldCByb29tQXBpO1xyXG5sZXQgcHVibGlzaGVyO1xyXG5cclxubGV0IHNjcmVlblB1Ymxpc2hlcjtcclxuXHJcbmxldCBzdWJyb29tVG9QdWJsaXNoZXIgPSBuZXcgTWFwKCk7XHJcblxyXG5sZXQgc3dpdGNoQXVkaW9CdXR0b247XHJcbmxldCBzd2l0Y2hWaWRlb0J1dHRvbjtcclxubGV0IHN3aXRjaFJlc29sdXRpb25CdXR0b247XHJcbmxldCBzd2l0Y2hGcHNCdXR0b247XHJcbmxldCBzaGFyZVNjcmVlbkJ1dHRvbjtcclxuXHJcbmNvbnN0IHZpZGVvQ29uc3RyYWludHMgPSB7XHJcbiAgICB3aWR0aDogbWVkaWEubG93UmVzV2lkdGgsXHJcbiAgICBoZWlnaHQ6IG1lZGlhLmxvd1Jlc0hlaWdodCxcclxuICAgIGZyYW1lUmF0ZTogbWVkaWEuaGlnaEZQU1xyXG59O1xyXG5cclxubGV0IGF1ZGlvUmVzdHJpY3RlZCA9IGZhbHNlO1xyXG5sZXQgdmlkZW9SZXN0cmljdGVkID0gZmFsc2U7XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplKF9yb29tQXBpLCBvdXRib3VuZFB1Ymxpc2hlciwgYXVkaW9PbiwgdmlkZW9Pbiwgc2NyZWVuT24sIF9tZW1iZXIpIHtcclxuICAgIHJvb21BcGkgPSBfcm9vbUFwaTtcclxuICAgIHB1Ymxpc2hlciA9IG91dGJvdW5kUHVibGlzaGVyO1xyXG4gICAgbWVtYmVyID0gX21lbWJlcjtcclxuXHJcbiAgICBhdWRpb1Jlc3RyaWN0ZWQgPSBmYWxzZTtcclxuICAgIHZpZGVvUmVzdHJpY3RlZCA9IGZhbHNlO1xyXG5cclxuICAgIHN3aXRjaEF1ZGlvQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzd2l0Y2hBdWRpb1wiKTtcclxuICAgIHN3aXRjaFZpZGVvQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzd2l0Y2hWaWRlb1wiKTtcclxuICAgIHN3aXRjaFJlc29sdXRpb25CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN3aXRjaFJlc29sdXRpb25cIik7XHJcbiAgICBzd2l0Y2hGcHNCdXR0b24gICAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzd2l0Y2hGcHNcIik7XHJcbiAgICBzaGFyZVNjcmVlbkJ1dHRvbiAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaGFyZVNjcmVlblwiKTtcclxuXHJcbiAgICBzd2l0Y2hBdWRpb0J1dHRvbi5pbm5lclRleHQgPSBhdWRpb09uID8gTVVURV9PVVRCT1VORF9BVURJTyA6IFVOTVVURV9PVVRCT1VORF9BVURJTztcclxuICAgIHN3aXRjaEF1ZGlvQnV0dG9uLm9uY2xpY2sgICA9IGF1ZGlvT24gPyBtdXRlQXVkaW8gOiB1bm11dGVBdWRpbztcclxuXHJcbiAgICBzd2l0Y2hWaWRlb0J1dHRvbi5pbm5lclRleHQgPSB2aWRlb09uID8gTVVURV9PVVRCT1VORF9WSURFTyA6IFVOTVVURV9PVVRCT1VORF9WSURFTztcclxuICAgIHN3aXRjaFZpZGVvQnV0dG9uLm9uY2xpY2sgICA9IHZpZGVvT24gPyBzdG9wVmlkZW8gOiBzdGFydFZpZGVvO1xyXG5cclxuICAgIHNoYXJlU2NyZWVuQnV0dG9uLmlubmVyVGV4dCA9IHNjcmVlbk9uID8gVU5TSEFSRV9TQ1JFRU4gOiBTSEFSRV9TQ1JFRU47XHJcbiAgICBzaGFyZVNjcmVlbkJ1dHRvbi5vbmNsaWNrID0gc2NyZWVuT24gPyB1bnNoYXJlU2NyZWVuIDogc2hhcmVTY3JlZW47XHJcblxyXG4gICAgc3dpdGNoUmVzb2x1dGlvbkJ1dHRvbi5pbm5lclRleHQgPSBJTkNSRUFTRV9SRVNPTFVUSU9OO1xyXG4gICAgc3dpdGNoUmVzb2x1dGlvbkJ1dHRvbi5vbmNsaWNrID0gaW5jcmVhc2VSZXNvbHV0aW9uO1xyXG5cclxuICAgIHN3aXRjaEZwc0J1dHRvbi5pbm5lclRleHQgPSBSRURVQ0VfRlBTO1xyXG4gICAgc3dpdGNoRnBzQnV0dG9uLm9uY2xpY2sgPSByZWR1Y2VGcHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVTdWJyb29tKHN1YnJvb21JZCwgb3V0Ym91bmRQdWJsaXNoZXIpIHtcclxuICAgIHN1YnJvb21Ub1B1Ymxpc2hlci5zZXQoc3Vicm9vbUlkLCBvdXRib3VuZFB1Ymxpc2hlcik7XHJcblxyXG4gICAgY29uc3Qgc3BlYWtCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgc3BlYWstJHtzdWJyb29tSWR9YCk7XHJcbiAgICBpZiAoc3BlYWtCdXR0b24pIHtcclxuICAgICAgICBzcGVha0J1dHRvbi5vbmNsaWNrID0gc3BlYWtUb1N1YnJvb20oc3BlYWtCdXR0b24sIG91dGJvdW5kUHVibGlzaGVyKTtcclxuICAgICAgICBzcGVha0J1dHRvbi5pbm5lclRleHQgPSBTUEVBS19UT19TVUJST09NO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkZWluaXRpYWxpemUoKSB7XHJcbiAgICBpZiAoc2NyZWVuUHVibGlzaGVyKSB7XHJcbiAgICAgICAgdW5zaGFyZVNjcmVlbigpO1xyXG4gICAgfVxyXG5cclxuICAgIG11dGVBdWRpbygpO1xyXG4gICAgc3RvcFZpZGVvKCk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHNoYXJlU2NyZWVuKCkge1xyXG4gICAgY29uc29sZS5sb2coXCJTaGFyaW5nIHNjcmVlblwiKTtcclxuXHJcbiAgICBpZiAoc2NyZWVuUHVibGlzaGVyKSB7XHJcbiAgICAgICAgbWVkaWEudW5tdXRlU2NyZWVuKCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHNjcmVlblB1Ymxpc2hlciA9IGF3YWl0IHJvb21BcGkuY3JlYXRlUHVibGlzaGVyKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJBZGRpdGlvbmFsIHB1Ymxpc2hlciBjcmVhdGVkOlwiLCBzY3JlZW5QdWJsaXNoZXIpO1xyXG5cclxuICAgICAgICBjb25zdCBzY3JlZW4gPSBhd2FpdCBtZWRpYS5iaW5kU2NyZWVuKHsgYXVkaW86IHRydWUgfSk7XHJcbiAgICAgICAgc2NyZWVuUHVibGlzaGVyLnBlZXJDb25uZWN0aW9uLmFkZFRyYWNrKHNjcmVlbik7XHJcblxyXG4gICAgICAgIGF3YWl0IHNjcmVlblB1Ymxpc2hlci5qb2luUm9vbUFuZFB1Ymxpc2gobWVtYmVyLnJvb21JZCxcclxuICAgICAgICAgICAgICAgIG1lbWJlci5kaXNwbGF5TmFtZSArIFwiIChzY3JlZW4pXCIsXHJcbiAgICAgICAgICAgICAgICBtZW1iZXIucm9vbVBpbiwgZmFsc2UsIHRydWUsIGZhbHNlKVxyXG4gICAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNjcmVlbiBzaGFyZWRcIik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHNoYXJlU2NyZWVuQnV0dG9uLmlubmVyVGV4dCA9IFVOU0hBUkVfU0NSRUVOO1xyXG4gICAgc2hhcmVTY3JlZW5CdXR0b24ub25jbGljayA9IHVuc2hhcmVTY3JlZW47XHJcbn1cclxuZnVuY3Rpb24gdW5zaGFyZVNjcmVlbigpIHtcclxuICAgIG1lZGlhLm11dGVTY3JlZW4oKTtcclxuXHJcbiAgICBzY3JlZW5QdWJsaXNoZXIuZGVzdHJveSgpO1xyXG4gICAgc2NyZWVuUHVibGlzaGVyID0gdW5kZWZpbmVkO1xyXG5cclxuICAgIHNoYXJlU2NyZWVuQnV0dG9uLmlubmVyVGV4dCA9IFNIQVJFX1NDUkVFTjtcclxuICAgIHNoYXJlU2NyZWVuQnV0dG9uLm9uY2xpY2sgPSBzaGFyZVNjcmVlbjtcclxufVxyXG5cclxuZnVuY3Rpb24gbXV0ZUF1ZGlvKCkge1xyXG4gICAgZGlzcGxheS51cGRhdGVPdXRib3VuZChtZWRpYS5tdXRlRGV2aWNlcyhcImF1ZGlvXCIpKTtcclxuICAgIHB1Ymxpc2hlci5zdG9wQXVkaW8oKTtcclxuXHJcbiAgICBzd2l0Y2hBdWRpb0J1dHRvbi5pbm5lclRleHQgPSBVTk1VVEVfT1VUQk9VTkRfQVVESU87XHJcbiAgICBzd2l0Y2hBdWRpb0J1dHRvbi5vbmNsaWNrID0gdW5tdXRlQXVkaW87XHJcbn1cclxuZnVuY3Rpb24gc3RvcFZpZGVvKCkge1xyXG4gICAgZGlzcGxheS51cGRhdGVPdXRib3VuZChtZWRpYS5tdXRlRGV2aWNlcyhcInZpZGVvXCIpKTtcclxuICAgIHB1Ymxpc2hlci5zdG9wVmlkZW8oKTtcclxuXHJcbiAgICBzd2l0Y2hWaWRlb0J1dHRvbi5pbm5lclRleHQgPSBVTk1VVEVfT1VUQk9VTkRfVklERU87XHJcbiAgICBzd2l0Y2hWaWRlb0J1dHRvbi5vbmNsaWNrID0gc3RhcnRWaWRlbztcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdW5tdXRlQXVkaW8oKSB7XHJcbiAgICBpZiAoYXVkaW9SZXN0cmljdGVkKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG1lZGlhLmJpbmREZXZpY2VzKHRydWUsIGZhbHNlKTtcclxuICAgIGlmIChzdHJlYW0pIHtcclxuICAgICAgICBhd2FpdCBkaXNwbGF5LnVwZGF0ZU91dGJvdW5kKHN0cmVhbSwgcHVibGlzaGVyLm1lbWJlcklkLCBwdWJsaXNoZXIuZGlzcGxheU5hbWUsIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG91dGJvdW5kQXVkaW8gPSBtZWRpYS5vdXRib3VuZFRyYWNrcyhcImF1ZGlvXCIpO1xyXG4gICAgb3V0Ym91bmRBdWRpby5mb3JFYWNoKCh0cmFjaykgPT4ge1xyXG4gICAgICAgIHRyYWNrLmVuYWJsZWQgPSB0cnVlO1xyXG4gICAgfSk7XHJcbiAgICBwdWJsaXNoZXIuc3RhcnRBdWRpbygpO1xyXG5cclxuICAgIHN3aXRjaEF1ZGlvQnV0dG9uLmlubmVyVGV4dCA9IE1VVEVfT1VUQk9VTkRfQVVESU87XHJcbiAgICBzd2l0Y2hBdWRpb0J1dHRvbi5vbmNsaWNrID0gbXV0ZUF1ZGlvO1xyXG59XHJcbmFzeW5jIGZ1bmN0aW9uIHN0YXJ0VmlkZW8oKSB7XHJcbiAgICBpZiAodmlkZW9SZXN0cmljdGVkKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG1lZGlhLmJpbmREZXZpY2VzKGZhbHNlLCB0cnVlKTtcclxuICAgIGlmIChzdHJlYW0pIHtcclxuICAgICAgICBhd2FpdCBkaXNwbGF5LnVwZGF0ZU91dGJvdW5kKHN0cmVhbSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgb3V0Ym91bmRWaWRlbyA9IG1lZGlhLm91dGJvdW5kVHJhY2tzKFwidmlkZW9cIik7XHJcbiAgICBvdXRib3VuZFZpZGVvLmZvckVhY2goKHRyYWNrKSA9PiB7XHJcbiAgICAgICAgdHJhY2suZW5hYmxlZCA9IHRydWU7XHJcbiAgICB9KTtcclxuICAgIHB1Ymxpc2hlci5zdGFydFZpZGVvKCk7XHJcblxyXG4gICAgc3dpdGNoVmlkZW9CdXR0b24uaW5uZXJUZXh0ID0gTVVURV9PVVRCT1VORF9WSURFTztcclxuICAgIHN3aXRjaFZpZGVvQnV0dG9uLm9uY2xpY2sgPSBzdG9wVmlkZW87XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNwZWFrVG9TdWJyb29tKGJ1dHRvbiwgcHVibGlzaGVyKSB7XHJcbiAgICByZXR1cm4gKCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiUHVibGlzaGluZyBob3N0IHN0cmVhbSBpbnRvIGEgc3Vicm9vbVwiKTtcclxuICAgICAgICBwdWJsaXNoZXIuc3RhcnRBdWRpbygpO1xyXG4gICAgICAgIHB1Ymxpc2hlci5zdGFydFZpZGVvKCk7XHJcblxyXG4gICAgICAgIGJ1dHRvbi5pbm5lclRleHQgPSBVTlNQRUFLX1RPX1NVQlJPT007XHJcbiAgICAgICAgYnV0dG9uLm9uY2xpY2sgPSB1bnNwZWFrVG9TdWJyb29tKGJ1dHRvbiwgcHVibGlzaGVyKTtcclxuICAgIH07XHJcbn1cclxuZnVuY3Rpb24gdW5zcGVha1RvU3Vicm9vbShidXR0b24sIHB1Ymxpc2hlcikge1xyXG4gICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlVucHVibGlzaGluZyBob3N0IHN0cmVhbSBpbnRvIGEgc3Vicm9vbVwiKTtcclxuICAgICAgICBwdWJsaXNoZXIuc3RvcEF1ZGlvKCk7XHJcbiAgICAgICAgcHVibGlzaGVyLnN0b3BWaWRlbygpO1xyXG5cclxuICAgICAgICBidXR0b24uaW5uZXJUZXh0ID0gU1BFQUtfVE9fU1VCUk9PTTtcclxuICAgICAgICBidXR0b24ub25jbGljayA9IHNwZWFrVG9TdWJyb29tKGJ1dHRvbiwgcHVibGlzaGVyKTtcclxuICAgIH07XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHJlc3RyaWN0QXVkaW8oKSB7XHJcbiAgICBhdWRpb1Jlc3RyaWN0ZWQgPSB0cnVlO1xyXG4gICAgbXV0ZUF1ZGlvKCk7XHJcbn1cclxuYXN5bmMgZnVuY3Rpb24gcmVzdHJpY3RWaWRlbygpIHtcclxuICAgIHZpZGVvUmVzdHJpY3RlZCA9IHRydWU7XHJcbiAgICBzdG9wVmlkZW8oKTtcclxufVxyXG5hc3luYyBmdW5jdGlvbiB1bnJlc3RyaWN0QXVkaW8oKSB7XHJcbiAgICBhdWRpb1Jlc3RyaWN0ZWQgPSBmYWxzZTtcclxuICAgIHVubXV0ZUF1ZGlvKCk7XHJcbn1cclxuYXN5bmMgZnVuY3Rpb24gdW5yZXN0cmljdFZpZGVvKCkge1xyXG4gICAgdmlkZW9SZXN0cmljdGVkID0gZmFsc2U7XHJcbiAgICBzdGFydFZpZGVvKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlZHVjZVJlc29sdXRpb24oKSB7XHJcbiAgICB2aWRlb0NvbnN0cmFpbnRzLndpZHRoID0gbWVkaWEubG93UmVzV2lkdGg7XHJcbiAgICB2aWRlb0NvbnN0cmFpbnRzLmhlaWdodCA9IG1lZGlhLmxvd1Jlc0hlaWdodDtcclxuXHJcbiAgICBtZWRpYS5vdXRib3VuZFRyYWNrcyhcInZpZGVvXCIpXHJcbiAgICAgICAgLmZvckVhY2goKHRyYWNrKSA9PiB7XHJcbiAgICAgICAgICAgIHRyYWNrLmFwcGx5Q29uc3RyYWludHModmlkZW9Db25zdHJhaW50cyk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT3V0Ym91bmQgdmlkZW8gcmVzb2x1dGlvbiByZWR1Y2VkXCIsIHRyYWNrLmdldFNldHRpbmdzKCkpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIHN3aXRjaFJlc29sdXRpb25CdXR0b24uaW5uZXJUZXh0ID0gSU5DUkVBU0VfUkVTT0xVVElPTjtcclxuICAgIHN3aXRjaFJlc29sdXRpb25CdXR0b24ub25jbGljayA9IGluY3JlYXNlUmVzb2x1dGlvbjtcclxufVxyXG5mdW5jdGlvbiBpbmNyZWFzZVJlc29sdXRpb24oKSB7XHJcbiAgICB2aWRlb0NvbnN0cmFpbnRzLndpZHRoID0gbWVkaWEuaGlnaFJlc1dpZHRoO1xyXG4gICAgdmlkZW9Db25zdHJhaW50cy5oZWlnaHQgPSBtZWRpYS5oaWdoUmVzSGVpZ2h0O1xyXG5cclxuICAgIG1lZGlhLm91dGJvdW5kVHJhY2tzKFwidmlkZW9cIilcclxuICAgICAgICAuZm9yRWFjaCgodHJhY2spID0+IHtcclxuICAgICAgICAgICAgdHJhY2suYXBwbHlDb25zdHJhaW50cyh2aWRlb0NvbnN0cmFpbnRzKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJPdXRib3VuZCB2aWRlbyByZXNvbHV0aW9uIGluY3JlYXNlZFwiLCB0cmFjay5nZXRTZXR0aW5ncygpKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBzd2l0Y2hSZXNvbHV0aW9uQnV0dG9uLmlubmVyVGV4dCA9IFJFRFVDRV9SRVNPTFVUSU9OO1xyXG4gICAgc3dpdGNoUmVzb2x1dGlvbkJ1dHRvbi5vbmNsaWNrID0gcmVkdWNlUmVzb2x1dGlvbjtcclxufVxyXG5mdW5jdGlvbiByZWR1Y2VGcHMoKSB7XHJcbiAgICB2aWRlb0NvbnN0cmFpbnRzLmZyYW1lUmF0ZSA9IG1lZGlhLmxvd0ZQUztcclxuXHJcbiAgICBtZWRpYS5vdXRib3VuZFRyYWNrcyhcInZpZGVvXCIpXHJcbiAgICAgICAgLmZvckVhY2goKHRyYWNrKSA9PiB7XHJcbiAgICAgICAgICAgIHRyYWNrLmFwcGx5Q29uc3RyYWludHModmlkZW9Db25zdHJhaW50cyk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiT3V0Ym91bmQgdmlkZW8gRlBTIHJlZHVjZWRcIiwgdHJhY2suZ2V0U2V0dGluZ3MoKSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgc3dpdGNoRnBzQnV0dG9uLmlubmVyVGV4dCA9IElOQ1JFQVNFX0ZQUztcclxuICAgIHN3aXRjaEZwc0J1dHRvbi5vbmNsaWNrID0gaW5jcmVhc2VGcHM7XHJcbn1cclxuZnVuY3Rpb24gaW5jcmVhc2VGcHMoKSB7XHJcbiAgICB2aWRlb0NvbnN0cmFpbnRzLmZyYW1lUmF0ZSA9IG1lZGlhLmhpZ2hGUFM7XHJcblxyXG4gICAgbWVkaWEub3V0Ym91bmRUcmFja3MoXCJ2aWRlb1wiKVxyXG4gICAgICAgIC5mb3JFYWNoKCh0cmFjaykgPT4ge1xyXG4gICAgICAgICAgICB0cmFjay5hcHBseUNvbnN0cmFpbnRzKHZpZGVvQ29uc3RyYWludHMpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk91dGJvdW5kIHZpZGVvIEZQUyBpbmNyZWFzZWRcIiwgdHJhY2suZ2V0U2V0dGluZ3MoKSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgc3dpdGNoRnBzQnV0dG9uLmlubmVyVGV4dCA9IFJFRFVDRV9GUFM7XHJcbiAgICBzd2l0Y2hGcHNCdXR0b24ub25jbGljayA9IHJlZHVjZUZwcztcclxufVxyXG5cclxuY29uc3QgTVVURV9PVVRCT1VORF9BVURJTyA9IFwiTXV0ZVwiO1xyXG5jb25zdCBVTk1VVEVfT1VUQk9VTkRfQVVESU8gPSBcIlVubXV0ZVwiO1xyXG5jb25zdCBNVVRFX09VVEJPVU5EX1ZJREVPID0gXCJVbnNoYXJlIHZpZGVvXCI7XHJcbmNvbnN0IFVOTVVURV9PVVRCT1VORF9WSURFTyA9IFwiU2hhcmUgdmlkZW9cIjtcclxuY29uc3QgU0hBUkVfU0NSRUVOID0gXCJTaGFyZSBzY3JlZW5cIjtcclxuY29uc3QgVU5TSEFSRV9TQ1JFRU4gPSBcIlVuc2hhcmUgc2NyZWVuXCI7XHJcblxyXG5jb25zdCBTUEVBS19UT19TVUJST09NID0gXCJTcGVhayB0byB0aGUgcm9vbVwiO1xyXG5jb25zdCBVTlNQRUFLX1RPX1NVQlJPT00gPSBcIlN0b3Agc3BlYWtpbmdcIjtcclxuXHJcbmNvbnN0IElOQ1JFQVNFX1JFU09MVVRJT04gPSBcIkhEXCI7XHJcbmNvbnN0IFJFRFVDRV9SRVNPTFVUSU9OID0gXCJMUVwiO1xyXG5jb25zdCBJTkNSRUFTRV9GUFMgPSBcIkZQUytcIjtcclxuY29uc3QgUkVEVUNFX0ZQUyA9IFwiRlBTLVwiO1xyXG4iLCJjb25zdCBhZGFwdGVyID0gcmVxdWlyZSgnd2VicnRjLWFkYXB0ZXInKTtcclxuXHJcbmNvbnN0IG1ldHJpY3MgPSByZXF1aXJlKCcuLi9zZXJ2aWNlL21ldHJpY3MnKTtcclxuY29uc3QgbW9kZXJhdG9yID0gcmVxdWlyZSgnLi4vc2VydmljZS9tb2RlcmF0b3InKTtcclxuY29uc3QgZXhlY3V0b3IgPSByZXF1aXJlKCcuLi9zZXJ2aWNlL2V4ZWN1dG9yJyk7XHJcbmNvbnN0IG91dGJvdW5kID0gcmVxdWlyZSgnLi9vdXRib3VuZCcpO1xyXG5jb25zdCBpbmJvdW5kID0gcmVxdWlyZSgnLi9pbmJvdW5kJyk7XHJcbmNvbnN0IGNoYXQgPSByZXF1aXJlKCcuL2NoYXQnKTtcclxuY29uc3QgaG9zdCA9IHJlcXVpcmUoJy4vaG9zdC9ob3N0Jyk7XHJcbmNvbnN0IGRpc3BsYXkgPSByZXF1aXJlKCcuL2Rpc3BsYXknKTtcclxuY29uc3QgbWVkaWEgPSByZXF1aXJlKCcuL21lZGlhJyk7XHJcbmNvbnN0IHN1YnJvb20gPSByZXF1aXJlKCcuL3N1YnJvb20nKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdGlhbGl6ZSxcclxuICAgIGpvaW4sXHJcbn07XHJcblxyXG5sZXQgamFudXNBcGkgPSB1bmRlZmluZWQ7XHJcbmxldCByb29tQXBpID0gdW5kZWZpbmVkO1xyXG5cclxubGV0IHB1Ymxpc2hlciA9IHVuZGVmaW5lZDtcclxuXHJcbmxldCBzdWJzY3JpcHRpb25zID0gbmV3IE1hcCgpO1xyXG4vLyBNYXBbTWVtYmVySWQsIFN1YnNjcmliZXJdXHJcblxyXG5sZXQgc3Vicm9vbVN1YnNjcmlwdGlvbnMgPSBuZXcgTWFwKCk7XHJcbi8vIE1hcFtSb29tSWQsIE1hcFtNZW1iZXJJZCwgU3Vic2NyaWJlcl1dXHJcblxyXG5sZXQgbWVtYmVyID0ge307XHJcblxyXG5sZXQgdmlld0pvaW5Gb3JtO1xyXG5sZXQgdmlld0luQ2FsbENvbnRhaW5lcjtcclxubGV0IHZpZXdKb2luQXVkaW9JbnB1dDtcclxubGV0IHZpZXdKb2luVmlkZW9JbnB1dDtcclxubGV0IHZpZXdKb2luVGV4dElucHV0O1xyXG5sZXQgdmlld0pvaW5TY3JlZW5JbnB1dDtcclxuXHJcbmxldCBtZXRyaWNzRW5hYmxlZDtcclxubGV0IG1vZGVyYXRpb25FbmFibGVkO1xyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZShfamFudXNBcGksIF9yb29tQXBpKSB7XHJcbiAgICBjb25zb2xlLmFzc2VydCghcm9vbUFwaSwgXCJSb29tQVBJIGlzIGFscmVhZHkgaW5pdGlhbGl6ZWRcIik7XHJcbiAgICByb29tQXBpID0gX3Jvb21BcGk7XHJcbiAgICBqYW51c0FwaSA9IF9qYW51c0FwaTtcclxuXHJcbiAgICB2aWV3Sm9pbkZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImpvaW5Gb3JtXCIpO1xyXG4gICAgdmlld0luQ2FsbENvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW4tY2FsbFwiKTtcclxuICAgIHZpZXdKb2luQXVkaW9JbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiam9pbkF1ZGlvXCIpO1xyXG4gICAgdmlld0pvaW5WaWRlb0lucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJqb2luVmlkZW9cIik7XHJcbiAgICB2aWV3Sm9pblRleHRJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiam9pblRleHRcIik7XHJcbiAgICB2aWV3Sm9pblNjcmVlbklucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJqb2luU2NyZWVuXCIpO1xyXG5cclxuICAgIGV4ZWN1dG9yLmluaXRpYWxpemUoY2hhbmdlLCBtb25pdG9yLCB1bm1vbml0b3IpO1xyXG4gICAgc3Vicm9vbS5pbml0aWFsaXplKCk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGpvaW4ocm9vbUlkLCByb29tUGluLCByb29tU2VjcmV0LCBkaXNwbGF5TmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNzT24gPSBmYWxzZSwgbW9kZXJhdGlvbk9uID0gZmFsc2UpIHtcclxuICAgIGlmICghcm9vbUFwaSkge1xyXG4gICAgICAgIHdpbmRvdy5hbGVydChcIlJvb21BUEkgaGFzbid0IGJlZW4gYXR0YWNoZWQsIHdhaXQgdW50aWwgdGhlIHBsdWdpbiBjb25uZWN0c1wiKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5hc3NlcnQocm9vbUlkKTtcclxuICAgIGNvbnNvbGUuYXNzZXJ0KGRpc3BsYXlOYW1lICYmIGRpc3BsYXlOYW1lICE9PSBcIlwiKTtcclxuICAgIGNvbnNvbGUubG9nKGBKb2luaW5nIHRoZSByb29tICR7cm9vbUlkfSB3aXRoIHBpbiAke3Jvb21QaW59YCk7XHJcblxyXG4gICAgbWV0cmljc0VuYWJsZWQgPSBtZXRyaWNzT247XHJcbiAgICBtb2RlcmF0aW9uRW5hYmxlZCA9IG1vZGVyYXRpb25PbjtcclxuXHJcbiAgICBtZW1iZXIucm9vbUlkID0gcm9vbUlkO1xyXG4gICAgbWVtYmVyLnJvb21QaW4gPSByb29tUGluO1xyXG4gICAgbWVtYmVyLmRpc3BsYXlOYW1lID0gZGlzcGxheU5hbWU7XHJcblxyXG4gICAgcHVibGlzaGVyID0gYXdhaXQgcm9vbUFwaS5jcmVhdGVQdWJsaXNoZXIoKTtcclxuICAgIGNvbnNvbGUubG9nKFwiUHVibGlzaGVyIGNyZWF0ZWQ6XCIsIHB1Ymxpc2hlcik7XHJcbiAgICBkaXNwbGF5LmluaXRpYWxpemUocHVibGlzaGVyKTtcclxuXHJcbiAgICBwdWJsaXNoZXIub24oXCJyZW1vdGVNZW1iZXJKb2luZWRcIiwgYXN5bmMgKGpvaW5lZCkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTmV3IHJlbW90ZSBtZW1iZXIgam9pbmVkOlwiLCBqb2luZWQpO1xyXG4gICAgICAgIC8vd2FpdGluZyBmb3Igam9pbmVkIG1lbWJlciB0byBzdGFydCBwdWJsaXNoaW5nXHJcbiAgICB9KTtcclxuICAgIHB1Ymxpc2hlci5vbihcInJlbW90ZU1lbWJlckxlYXZpbmdcIiwgYXN5bmMgKGxlYXZpbmcpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlJlbW90ZSBtZW1iZXIgaXMgbGVhdmluZzpcIiwgbGVhdmluZyk7XHJcbiAgICAgICAgZGlzcGxheS5yZW1vdmVJbmJvdW5kKGxlYXZpbmcpO1xyXG4gICAgICAgIHN1YnNjcmlwdGlvbnMuZGVsZXRlKGxlYXZpbmcpO1xyXG4gICAgfSk7XHJcbiAgICBwdWJsaXNoZXIub24oXCJwdWJsaXNoZXJzVXBkYXRlZFwiLCBzdWJzY3JpYmUpO1xyXG5cclxuICAgIGNvbnN0IGF1ZGlvT24gPSB2aWV3Sm9pbkF1ZGlvSW5wdXQuY2hlY2tlZDtcclxuICAgIGNvbnN0IHZpZGVvT24gPSB2aWV3Sm9pblZpZGVvSW5wdXQuY2hlY2tlZDtcclxuICAgIGNvbnN0IHNjcmVlbk9uID0gdmlld0pvaW5TY3JlZW5JbnB1dC5jaGVja2VkO1xyXG5cclxuICAgIGNoYXQuaW5pdGlhbGl6ZShwdWJsaXNoZXIpO1xyXG4gICAgaW5ib3VuZC5pbml0aWFsaXplKHN1YnNjcmlwdGlvbnMsIHN1YnJvb21TdWJzY3JpcHRpb25zKTtcclxuICAgIG91dGJvdW5kLmluaXRpYWxpemUocm9vbUFwaSwgcHVibGlzaGVyLCBhdWRpb09uLCB2aWRlb09uLCBzY3JlZW5PbiwgbWVtYmVyKTtcclxuICAgIG1lZGlhLmluaXRpYWxpemUocHVibGlzaGVyLnBlZXJDb25uZWN0aW9uKTtcclxuXHJcbiAgICBpZiAobWV0cmljc0VuYWJsZWQpIHtcclxuICAgICAgICBtZXRyaWNzLnNjaGVkdWxlKHB1Ymxpc2hlciwgc3Vic2NyaXB0aW9ucyk7XHJcbiAgICB9XHJcblxyXG4gICAgYXdhaXQgcHVibGlzaGVyLmpvaW5Sb29tQW5kUHVibGlzaChyb29tSWQsIGRpc3BsYXlOYW1lLCByb29tUGluKVxyXG4gICAgICAgIC50aGVuKGFzeW5jIChyZW1vdGVQdWJsaXNoZXJzKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSm9pbmVkIHRoZSByb29tOlwiLCByb29tSWQpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxvY2FsIG1lbWJlciBJRDpcIiwgcHVibGlzaGVyLm1lbWJlcklkKTtcclxuICAgICAgICAgICAgaWYgKG1vZGVyYXRpb25FbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtZW1iZXJJZCA9IHB1Ymxpc2hlci5tZW1iZXJJZDsgLy9zYXZpbmcgdGhlIGlkIG91dHNpZGUgb2YgbGFtYmRhXHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGludHJvZHVjdGlvbiA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5vdGlmeWluZyBtb2RlcmF0aW9uIHNlcnZpY2UgYWJvdXQgdXNcIiwgcm9vbUlkLCBtZW1iZXJJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kZXJhdG9yLnNlbmRSZXF1ZXN0KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJyb29tSWRcIjogcm9vbUlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm9wZXJhdGlvblwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInJlZ2lzdGVyUGFydGljaXBhbnRcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWVtYmVyX2lkXCI6IG1lbWJlcklkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJvb21TZWNyZXQgIT09IG51bGwgJiYgcm9vbVNlY3JldCAhPT0gXCJcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlZ2lzdGVyaW5nIG91cnNlbHZlcyBhcyBhIG1vZGVyYXRvclwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZXJhdG9yLnNlbmRSZXF1ZXN0KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicm9vbUlkXCI6IHJvb21JZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3BlcmF0aW9uXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInNldE1vZGVyYXRvclwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWVtYmVyX2lkXCI6IG1lbWJlcklkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInNlY3JldFwiOiByb29tU2VjcmV0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInBpblwiOiByb29tUGluXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB3YXNfbm90X2Nvbm5lY3RlZCA9IGF3YWl0IG1vZGVyYXRvci5jb25uZWN0KFxyXG4gICAgICAgICAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb25uZWN0aW9uIHRvIG1vZGVyYXRpb24gc2VydmljZSBlc3RhYmxpc2hlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW50cm9kdWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiV2l0aCB0aGUgZ3JlYXQgcG93ZXIgY29tZXMgdGhlIGdyZWF0IHJlc3BvbnNpYmlsaXR5IVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9zdC5pbml0aWFsaXplKG1vZGVyYXRvciwgamFudXNBcGksIHJvb21JZCwgcm9vbVNlY3JldCwgbW9uaXRvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXdhc19ub3RfY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW50cm9kdWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZpZXdKb2luRm9ybS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcbiAgICAgICAgICAgIHZpZXdJbkNhbGxDb250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVtb3RlIHB1Ymxpc2hlcnM6XCIsIHJlbW90ZVB1Ymxpc2hlcnMpO1xyXG4gICAgICAgICAgICBzdWJzY3JpYmUocmVtb3RlUHVibGlzaGVycyk7XHJcblxyXG4gICAgICAgICAgICBhd2FpdCBkaXNwbGF5LnVwZGF0ZU91dGJvdW5kKGF3YWl0IG1lZGlhLmJpbmREZXZpY2VzKGF1ZGlvT24sIHZpZGVvT24pKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5jYXRjaCgoZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xyXG4gICAgICAgICAgICB3aW5kb3cuYWxlcnQoXCJDb3VsZG4ndCBjb25uZWN0LiBJcyBQSU4gY29ycmVjdD9cIik7XHJcbiAgICAgICAgICAgIHB1Ymxpc2hlci5wZWVyQ29ubmVjdGlvbi5jbG9zZSgpO1xyXG4gICAgICAgICAgICBwdWJsaXNoZXIuZGVzdHJveSgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIHN1YnNjcmliZShfcHVibGlzaGVycykge1xyXG4gICAgICAgIGNvbnN0IHB1Ymxpc2hlcnMgPSBmaWx0ZXJQdWJsaXNoZXJzKF9wdWJsaXNoZXJzLCBmYWxzZSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJTdWJzY3JpYmluZyB0b1wiLCBwdWJsaXNoZXJzKTtcclxuICAgICAgICBwdWJsaXNoZXJzLmZvckVhY2goKHJlbW90ZVB1Ymxpc2hlcikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIWRpc3BsYXkubWVtYmVyRGlzcGxheWVkKHJlbW90ZVB1Ymxpc2hlci5pZCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU3Vic2NyaWJpbmcgdG9cIiwgcmVtb3RlUHVibGlzaGVyLmlkKTtcclxuICAgICAgICAgICAgICAgIHJvb21BcGkuY3JlYXRlU3Vic2NyaWJlcigpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oKHN1YnNjcmliZXIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3Vic2NyaXB0aW9ucy5zZXQocmVtb3RlUHVibGlzaGVyLmlkLCBzdWJzY3JpYmVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlci5wZWVyQ29ubmVjdGlvbi5vbmFkZHN0cmVhbSA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheS51cGRhdGVJbmJvdW5kKGV2ZW50LnN0cmVhbSwgcmVtb3RlUHVibGlzaGVyLmlkLCByZW1vdGVQdWJsaXNoZXIuZGlzcGxheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXIub24oJ2RhdGFNZXNzYWdlJywobWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJNZXNzYWdlIHJlY2VpdmVkXCIsIG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhdC5hcHBlbmRNZXNzYWdlKG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuam9pblJvb21BbmRTdWJzY3JpYmUocm9vbUlkLCByZW1vdGVQdWJsaXNoZXIuaWQsIHJvb21QaW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiQWxyZWFkeSBzdWJzY3JpYmVkXCIsIHJlbW90ZVB1Ymxpc2hlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuLy90b2RvOiByZWZhY3RvciBgam9pbmAgbWV0aG9kIHRvIGNhbGwgYG1vbml0b3JgLCBzbyB0aGVyZSB3aWxsIGJlIG5vIGNvcHktcGFzdGVcclxuYXN5bmMgZnVuY3Rpb24gbW9uaXRvcihyb29tSWQsIHJvb21QaW4sIGNvbnRhaW5lciwgaG9zdCA9IGZhbHNlKSB7XHJcbiAgICBpZiAoIXJvb21BcGkpIHtcclxuICAgICAgICB3aW5kb3cuYWxlcnQoXCJSb29tQVBJIGhhc24ndCBiZWVuIGF0dGFjaGVkLCB3YWl0IHVudGlsIHRoZSBwbHVnaW4gY29ubmVjdHNcIik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUuYXNzZXJ0KHJvb21JZCk7XHJcblxyXG4gICAgaWYgKHN1YnJvb21TdWJzY3JpcHRpb25zLmdldChyb29tSWQpKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJBbHJlYWR5IG1vbml0b3JpbmdcIiwgcm9vbUlkKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IHN1YnNjcmlwdGlvbnMgPSBuZXcgTWFwKCk7XHJcbiAgICBzdWJyb29tU3Vic2NyaXB0aW9ucy5zZXQocm9vbUlkLCBzdWJzY3JpcHRpb25zKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhcIlN0YXJ0aW5nIG1vbml0b3JpbmcgdGhlIHJvb21cIiwgcm9vbUlkKTtcclxuXHJcbiAgICBwdWJsaXNoZXIgPSBhd2FpdCByb29tQXBpLmNyZWF0ZVB1Ymxpc2hlcigpO1xyXG4gICAgY29uc29sZS5sb2coXCJQdWJsaXNoZXIgZm9yIGEgc3ViLXJvb20gbW9uaXRvciBjcmVhdGVkOlwiLCBwdWJsaXNoZXIpO1xyXG5cclxuICAgIHB1Ymxpc2hlci5vbihcInJlbW90ZU1lbWJlckpvaW5lZFwiLCBhc3luYyAoam9pbmVkKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJOZXcgcmVtb3RlIG1lbWJlciBqb2luZWQgdG8gdGhlIHN1Yi1yb29tOlwiLCBqb2luZWQpO1xyXG4gICAgICAgIC8vd2FpdGluZyBmb3Igam9pbmVkIG1lbWJlciB0byBzdGFydCBwdWJsaXNoaW5nXHJcbiAgICB9KTtcclxuICAgIHB1Ymxpc2hlci5vbihcInJlbW90ZU1lbWJlckxlYXZpbmdcIiwgYXN5bmMgKGxlYXZpbmcpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlJlbW90ZSBtZW1iZXIgaXMgbGVhdmluZyB0aGUgc3ViLXJvb206XCIsIGxlYXZpbmcpO1xyXG4gICAgICAgIGRpc3BsYXkucmVtb3ZlSW5ib3VuZChsZWF2aW5nKTtcclxuICAgICAgICBzdWJzY3JpcHRpb25zLmRlbGV0ZShsZWF2aW5nKTtcclxuICAgIH0pO1xyXG4gICAgcHVibGlzaGVyLm9uKFwicHVibGlzaGVyc1VwZGF0ZWRcIiwgc3Vic2NyaWJlKTtcclxuXHJcbiAgICBvdXRib3VuZC5pbml0aWFsaXplU3Vicm9vbShyb29tSWQsIHB1Ymxpc2hlcik7XHJcbiAgICBtZWRpYS5pbml0aWFsaXplKHB1Ymxpc2hlci5wZWVyQ29ubmVjdGlvbik7XHJcblxyXG4gICAgaWYgKG1ldHJpY3NFbmFibGVkKSB7XHJcbiAgICAgICAgbWV0cmljcy5zY2hlZHVsZShwdWJsaXNoZXIsIHN1YnNjcmlwdGlvbnMpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBzdWZmaXggPSBob3N0ID8gSE9TVF9TVUZGSVggOiBXQVRDSEVSX1NVRkZJWDtcclxuICAgIGF3YWl0IHB1Ymxpc2hlci5qb2luUm9vbUFuZFB1Ymxpc2gocm9vbUlkLCBgJHttZW1iZXIuZGlzcGxheU5hbWV9ICR7c3VmZml4fWAsIHJvb21QaW4pXHJcbiAgICAgICAgLnRoZW4oYXN5bmMgKHJlbW90ZVB1Ymxpc2hlcnMpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJKb2luZWQgdGhlIHN1Yi1yb29tIGZvciBtb25pdG9yaW5nOlwiLCByb29tSWQpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlbW90ZSBwdWJsaXNoZXJzIGluIHRoZSBzdWItcm9vbTpcIiwgcmVtb3RlUHVibGlzaGVycyk7XHJcbiAgICAgICAgICAgIHN1YnNjcmliZShyZW1vdGVQdWJsaXNoZXJzKTtcclxuICAgICAgICAgICAgcHVibGlzaGVyLnN0b3BBdWRpbygpO1xyXG4gICAgICAgICAgICBwdWJsaXNoZXIuc3RvcFZpZGVvKCk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuY2F0Y2goKGUpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcclxuICAgICAgICAgICAgcHVibGlzaGVyLnBlZXJDb25uZWN0aW9uLmNsb3NlKCk7XHJcbiAgICAgICAgICAgIHB1Ymxpc2hlci5kZXN0cm95KCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgZnVuY3Rpb24gc3Vic2NyaWJlKF9wdWJsaXNoZXJzKSB7XHJcbiAgICAgICAgY29uc3QgcHVibGlzaGVycyA9IGZpbHRlclB1Ymxpc2hlcnMoX3B1Ymxpc2hlcnMsIHRydWUpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU3Vic2NyaWJpbmcgdG9cIiwgcHVibGlzaGVycyk7XHJcbiAgICAgICAgcHVibGlzaGVycy5mb3JFYWNoKChyZW1vdGVQdWJsaXNoZXIpID0+IHtcclxuICAgICAgICAgICAgaWYgKCFkaXNwbGF5Lm1lbWJlckRpc3BsYXllZChyZW1vdGVQdWJsaXNoZXIuaWQpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN1YnNjcmliaW5nIHRvXCIsIHJlbW90ZVB1Ymxpc2hlci5pZCk7XHJcbiAgICAgICAgICAgICAgICByb29tQXBpLmNyZWF0ZVN1YnNjcmliZXIoKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKChzdWJzY3JpYmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmlwdGlvbnMuc2V0KHJlbW90ZVB1Ymxpc2hlci5pZCwgc3Vic2NyaWJlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZXIucGVlckNvbm5lY3Rpb24ub25hZGRzdHJlYW0gPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTW9uaXRvcmluZyBhIHN0cmVhbSBmcm9tIHN1YnJvb21cIiwgcm9vbUlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXkudXBkYXRlSW5ib3VuZChldmVudC5zdHJlYW0sIHJlbW90ZVB1Ymxpc2hlci5pZCwgcmVtb3RlUHVibGlzaGVyLmRpc3BsYXksIGNvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3Vic2NyaWJlci5qb2luUm9vbUFuZFN1YnNjcmliZShyb29tSWQsIHJlbW90ZVB1Ymxpc2hlci5pZCwgcm9vbVBpbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJBbHJlYWR5IHN1YnNjcmliZWRcIiwgcmVtb3RlUHVibGlzaGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1bm1vbml0b3Iocm9vbUlkKSB7XHJcbiAgICBjb25zdCBzdWJzY3JpcHRpb25zID0gc3Vicm9vbVN1YnNjcmlwdGlvbnMuZ2V0KHJvb21JZCk7XHJcbiAgICBpZiAoIXN1YnNjcmlwdGlvbnMpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKFwiV2UgYXJlIG5vdCBtb25pdG9yaW5nIHRoZSByb29tXCIsIHJvb21JZCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHN1YnNjcmlwdGlvbnMuZm9yRWFjaCgoc3Vic2NyaWJlcikgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVW5zdWJzY3JpYmluZyBmcm9tIFwiLCBzdWJzY3JpYmVyLmRpc3BsYXlOYW1lKTtcclxuICAgICAgICBzdWJzY3JpYmVyLmRlc3Ryb3koKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHN1YnJvb21TdWJzY3JpcHRpb25zLmRlbGV0ZShyb29tSWQpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBjaGFuZ2Uocm9vbUlkLCByb29tUGluKSB7XHJcbiAgICBjb25zdCBwcm9taXNlcyA9IEFycmF5LmZyb20oc3Vic2NyaXB0aW9ucy52YWx1ZXMoKSlcclxuICAgICAgICAubWFwKChzdWJzY3JpYmVyKSA9PiBzdWJzY3JpYmVyLmxlYXZlUm9vbSgpKTtcclxuICAgIHByb21pc2VzLnB1c2gocHVibGlzaGVyLmxlYXZlUm9vbSgpKTtcclxuICAgIGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChwcm9taXNlcyk7XHJcbiAgICBjb25zb2xlLmxvZyhcIkxlZnQgdGhlIHJvb21cIiwgbWVtYmVyLnJvb21JZCk7XHJcblxyXG4gICAgbGV0IHJvb21TZWNyZXQgPSBudWxsOyAvL3dlIGRvbid0IGNoYW5nZSByb29tIGF1dG9tYXRpY2FsbHkgZm9yIG1vZGVyYXRvcnMgKHlldClcclxuICAgIGF3YWl0IGpvaW4ocm9vbUlkLCByb29tUGluLCByb29tU2VjcmV0LCBtZW1iZXIuZGlzcGxheU5hbWUsIG1ldHJpY3NFbmFibGVkLCBtb2RlcmF0aW9uRW5hYmxlZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbHRlclB1Ymxpc2hlcnMocHVibGlzaGVycywgd2VBcmVNb25pdG9yaW5nKSB7XHJcbiAgICByZXR1cm4gcHVibGlzaGVycy5maWx0ZXIoKHB1Ymxpc2hlcikgPT4ge1xyXG4gICAgICAgIGNvbnN0IG5hbWUgPSBwdWJsaXNoZXIuZGlzcGxheTtcclxuICAgICAgICBpZiAobmFtZS5pbmNsdWRlcyhXQVRDSEVSX1NVRkZJWClcclxuICAgICAgICAgICB8fCAod2VBcmVNb25pdG9yaW5nICYmIG5hbWUuaW5jbHVkZXMoSE9TVF9TVUZGSVgpKSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZpbHRlcmluZyBvdXQgcHVibGlzaGVyXCIsIHB1Ymxpc2hlcik7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxufVxyXG5cclxuY29uc3QgSE9TVF9TVUZGSVggPSBcIihob3N0KVwiO1xyXG5jb25zdCBXQVRDSEVSX1NVRkZJWCA9IFwiKHdhdGNoaW5nKVwiOyIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdGlhbGl6ZSxcclxuICAgIGNyZWF0ZU1vbml0b3IsXHJcbiAgICByZW1vdmVNb25pdG9yXHJcbn07XHJcblxyXG5sZXQgdmlld1N1YnJvb21Nb25pdG9ycztcclxuY29uc3QgbW9uaXRvckJ5U3Vicm9vbSA9IG5ldyBNYXAoKTtcclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemUoKSB7XHJcbiAgICB2aWV3U3Vicm9vbU1vbml0b3JzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdWJyb29tTW9uaXRvcnNcIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU1vbml0b3Ioc3Vicm9vbUlkLCBzdWJyb29tUGluLCBob3N0Q2FsbGJhY2tzID0gbnVsbCkge1xyXG4gICAgaWYgKG1vbml0b3JCeVN1YnJvb20uZ2V0KHN1YnJvb21JZCkpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk1vbml0b3IgZm9yIHRoZSByb29tIGlzIGFscmVhZHkgY3JlYXRlZFwiLCBzdWJyb29tSWQpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgY29udGFpbmVyLnN0eWxlLmJvcmRlciA9IFwidGhpY2sgc29saWQgIzAwMDBGRlwiO1xyXG5cclxuICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInBcIik7XHJcbiAgICBsYWJlbC5pbm5lclRleHQgPSBgU3Vicm9vbSAke3N1YnJvb21JZH1gO1xyXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGxhYmVsKTtcclxuXHJcbiAgICBpZiAoaG9zdENhbGxiYWNrcykge1xyXG4gICAgICAgIGNvbnN0IFttZXJnZVJvb21GbiwgcHJlc2VudFJvb21Gbl0gPSBob3N0Q2FsbGJhY2tzO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXBwZW5kaW5nIGhvc3QgY29udHJvbHMgdG8gdGhlIHN1YnJvb20gbW9uaXRvclwiLCBtZXJnZVJvb21Gbik7XHJcbiAgICAgICAgY29uc3QgbWVyZ2VCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xyXG4gICAgICAgIG1lcmdlQnV0dG9uLmlubmVyVGV4dCA9IFwiTWVyZ2UgdGhlbSBiYWNrXCI7XHJcbiAgICAgICAgbWVyZ2VCdXR0b24ub25jbGljayA9IG1lcmdlUm9vbUZuO1xyXG5cclxuICAgICAgICBjb25zdCBzcGVha0J1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICAgICAgc3BlYWtCdXR0b24uaWQgPSBgc3BlYWstJHtzdWJyb29tSWR9YDtcclxuXHJcbiAgICAgICAgY29uc3QgcHJlc2VudEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbiAgICAgICAgcHJlc2VudEJ1dHRvbi5pbm5lclRleHQgPSBcIlByZXNlbnQgdG8gdGhlIGNsYXNzXCI7XHJcbiAgICAgICAgcHJlc2VudEJ1dHRvbi5vbmNsaWNrID0gcHJlc2VudFJvb21GbjtcclxuXHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG1lcmdlQnV0dG9uKTtcclxuICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQocHJlc2VudEJ1dHRvbik7XHJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHNwZWFrQnV0dG9uKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBtb25pdG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgIG1vbml0b3JCeVN1YnJvb20uc2V0KHN1YnJvb21JZCwgY29udGFpbmVyKTtcclxuICAgIG1vbml0b3IuY2xhc3NOYW1lID0gXCJncmlkLWNvbnRhaW5lclwiO1xyXG5cclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChtb25pdG9yKTtcclxuICAgIHZpZXdTdWJyb29tTW9uaXRvcnMuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhcIk1vbml0b3IgY3JlYXRlZFwiLCBzdWJyb29tSWQpO1xyXG4gICAgcmV0dXJuIG1vbml0b3I7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZU1vbml0b3Ioc3Vicm9vbUlkKSB7XHJcbiAgICBjb25zdCBtb25pdG9yID0gbW9uaXRvckJ5U3Vicm9vbS5nZXQoc3Vicm9vbUlkKTtcclxuICAgIGNvbnNvbGUuYXNzZXJ0KG1vbml0b3IsIGBNb25pdG9yIGZvciByb29tICR7c3Vicm9vbUlkfSBkb2Vzbid0IGV4aXN0YCk7XHJcbiAgICBtb25pdG9yQnlTdWJyb29tLmRlbGV0ZShzdWJyb29tSWQpO1xyXG4gICAgbW9uaXRvci5yZW1vdmUoKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhcIk1vbml0b3IgcmVtb3ZlZFwiLCBzdWJyb29tSWQpO1xyXG59IiwiY29uc3Qgc3Vicm9vbSA9IHJlcXVpcmUoJy4uL3Jvb20vc3Vicm9vbScpO1xyXG5jb25zdCBvdXRib3VuZCA9IHJlcXVpcmUoJy4uL3Jvb20vb3V0Ym91bmQnKTtcclxuY29uc3QgZGlzcGxheSA9IHJlcXVpcmUoJy4uL3Jvb20vZGlzcGxheScpO1xyXG5jb25zdCBtZWRpYSA9IHJlcXVpcmUoJy4uL3Jvb20vbWVkaWEnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgaW5pdGlhbGl6ZSxcclxuICAgIGV4ZWN1dGVcclxufTtcclxuXHJcbmxldCBjaGFuZ2VSb29tRm4gPSB1bmRlZmluZWQ7XHJcbmxldCBtb25pdG9yRm4gPSB1bmRlZmluZWQ7XHJcbmxldCB1bm1vbml0b3JGbiA9IHVuZGVmaW5lZDtcclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemUoX2NoYW5nZVJvb21GbiwgX21vbml0b3JGbiwgX3VubW9uaXRvckZuKSB7XHJcbiAgICBjb25zb2xlLmFzc2VydCghY2hhbmdlUm9vbUZuLCBcIkFscmVhZHkgaW5pdGlhbGl6ZWRcIik7XHJcbiAgICBjb25zb2xlLmFzc2VydCghbW9uaXRvckZuLCBcIkFscmVhZHkgaW5pdGlhbGl6ZWRcIik7XHJcbiAgICBjaGFuZ2VSb29tRm4gPSBfY2hhbmdlUm9vbUZuO1xyXG4gICAgbW9uaXRvckZuID0gX21vbml0b3JGbjtcclxuICAgIHVubW9uaXRvckZuID0gX3VubW9uaXRvckZuO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBleGVjdXRlKGNvbW1hbmQpIHtcclxuICAgIGlmIChjb21tYW5kID09PSBcIlJlc3RyaWN0QXVkaW9cIikge1xyXG4gICAgICAgIG91dGJvdW5kLnJlc3RyaWN0QXVkaW8oKTtcclxuICAgIH1cclxuICAgIGlmIChjb21tYW5kID09PSBcIlJlc3RyaWN0VmlkZW9cIikge1xyXG4gICAgICAgIG91dGJvdW5kLnJlc3RyaWN0VmlkZW8oKTtcclxuICAgIH1cclxuICAgIGlmIChjb21tYW5kID09PSBcIlVucmVzdHJpY3RBdWRpb1wiKSB7XHJcbiAgICAgICAgb3V0Ym91bmQudW5yZXN0cmljdEF1ZGlvKCk7XHJcbiAgICB9XHJcbiAgICBpZiAoY29tbWFuZCA9PT0gXCJVbnJlc3RyaWN0VmlkZW9cIikge1xyXG4gICAgICAgIG91dGJvdW5kLnVucmVzdHJpY3RWaWRlbygpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjb21tYW5kW1wiQ2hhbmdlUm9vbVwiXSkge1xyXG4gICAgICAgIGxldCBbdGFyZ2V0SWQsIHRhcmdldFBpbl0gPSBjb21tYW5kW1wiQ2hhbmdlUm9vbVwiXTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkNoYW5naW5nIHJvb20gdG9cIiwgdGFyZ2V0SWQpO1xyXG5cclxuICAgICAgICBkaXNwbGF5LmNsZWFySW5ib3VuZCgpO1xyXG4gICAgICAgIG91dGJvdW5kLmRlaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIG1lZGlhLmRlaW5pdGlhbGl6ZSgpO1xyXG4gICAgICAgIGF3YWl0IGNoYW5nZVJvb21Gbih0YXJnZXRJZCwgdGFyZ2V0UGluKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoY29tbWFuZFtcIldhdGNoUm9vbVwiXSkge1xyXG4gICAgICAgIGxldCBbc3Vicm9vbUlkLCBzdWJyb29tUGluXSA9IGNvbW1hbmRbXCJXYXRjaFJvb21cIl07XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJXYXRjaGluZyByb29tXCIsIHN1YnJvb21JZCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGRpc3BsYXkgPSBzdWJyb29tLmNyZWF0ZU1vbml0b3Ioc3Vicm9vbUlkLCBzdWJyb29tUGluKTtcclxuICAgICAgICBtb25pdG9yRm4oc3Vicm9vbUlkLCBzdWJyb29tUGluLCBkaXNwbGF5KTtcclxuICAgIH1cclxuICAgIGlmIChjb21tYW5kW1wiVW53YXRjaFJvb21cIl0pIHtcclxuICAgICAgICBsZXQgc3Vicm9vbUlkID0gY29tbWFuZFtcIlVud2F0Y2hSb29tXCJdO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVW53YXRjaGluZyByb29tXCIsIHN1YnJvb21JZCk7XHJcblxyXG4gICAgICAgIHN1YnJvb20ucmVtb3ZlTW9uaXRvcihzdWJyb29tSWQpO1xyXG4gICAgICAgIHVubW9uaXRvckZuKHN1YnJvb21JZCk7XHJcbiAgICB9XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBzY2hlZHVsZSxcclxufTtcclxuXHJcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xyXG5jb25zdCB3ZWJzb2NrZXQgPSByZXF1aXJlKCcuL3dlYnNvY2tldCcpO1xyXG5cclxuY29uc3QgYWRhcHRlciA9IHJlcXVpcmUoJ3dlYnJ0Yy1hZGFwdGVyJyk7XHJcblxyXG5sZXQgZ2F0aGVyZXIgPSB1bmRlZmluZWQ7XHJcblxyXG5mdW5jdGlvbiBjb25uZWN0KCkge1xyXG4gICAgaWYgKCFnYXRoZXJlcikge1xyXG4gICAgICAgIGdhdGhlcmVyID0gd2Vic29ja2V0LmNvbm5lY3QoXHJcbiAgICAgICAgICAgIGNvbmZpZy5nYXRoZXJlci51cmwsXHJcbiAgICAgICAgICAgIFwibWV0cmljcyBnYXRoZXJlclwiLFxyXG4gICAgICAgICAgICAoKSA9PiB7fSxcclxuICAgICAgICAgICAgKCkgPT4ge30sXHJcbiAgICAgICAgICAgICgpID0+IHsgZ2F0aGVyZXIgPSB1bmRlZmluZWQ7IH0sXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2NoZWR1bGUocHVibGlzaGVyLCBzdWJzY3JpcHRpb25zKSB7XHJcbiAgICBjb25uZWN0KCk7XHJcbiAgICB3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4gY29ubmVjdCgpLFxyXG4gICAgICAgIGNvbmZpZy5nYXRoZXJlci5jb25uZWN0aW9uSW50ZXJ2YWwgKiAxMDAwKTtcclxuXHJcbiAgICB3aW5kb3cuc2V0SW50ZXJ2YWwoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGlmICghZ2F0aGVyZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG1ldHJpY3MgPSB7XHJcbiAgICAgICAgICAgIFwicm9vbUlkXCI6IHB1Ymxpc2hlci5yb29tSWQsXHJcbiAgICAgICAgICAgIFwibWVtYmVySWRcIjogcHVibGlzaGVyLm1lbWJlcklkLFxyXG4gICAgICAgICAgICBcIm91dGJvdW5kXCI6IGF3YWl0IGdhdGhlck91dGJvdW5kKHB1Ymxpc2hlciksXHJcbiAgICAgICAgICAgIFwiaW5ib3VuZFwiOiBhd2FpdCBnYXRoZXJJbmJvdW5kKHN1YnNjcmlwdGlvbnMpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZ2F0aGVyZXIuc2VuZChKU09OLnN0cmluZ2lmeShtZXRyaWNzKSk7XHJcbiAgICB9LCBjb25maWcuZ2F0aGVyZXIucmVwb3J0aW5nSW50ZXJ2YWwgKiAxMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnYXRoZXJPdXRib3VuZChwdWJsaXNoZXIpIHtcclxuICAgIHJldHVybiBwdWJsaXNoZXIucGVlckNvbm5lY3Rpb24uZ2V0U3RhdHMoKS50aGVuKChyZXBvcnQpID0+IHtcclxuICAgICAgICBjb25zdCBtZXRyaWNzID0geyBhdWRpbzoge30sIHZpZGVvOiB7fSB9O1xyXG5cclxuICAgICAgICByZXBvcnQuZm9yRWFjaCgoZW50cnkpID0+IHtcclxuICAgICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09IFwib3V0Ym91bmQtcnRwXCIpIHtcclxuICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0uYnl0ZXNTZW50ID0gZW50cnkuYnl0ZXNTZW50O1xyXG4gICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS5oZWFkZXJCeXRlc1NlbnQgPSBlbnRyeS5oZWFkZXJCeXRlc1NlbnQ7XHJcbiAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLnJldHJhbnNtaXR0ZWRCeXRlc1NlbnQgPSBlbnRyeS5yZXRyYW5zbWl0dGVkQnl0ZXNTZW50O1xyXG4gICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS50aW1lc3RhbXAgPSBlbnRyeS50aW1lc3RhbXA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09IFwicmVtb3RlLWluYm91bmQtcnRwXCIpIHtcclxuICAgICAgICAgICAgICAgIC8vbG9va3MgbGlrZSBvbmx5IENocm9tZSBwcm92aWRlcyB0aGVzZSBtZXRyaWNzIHR5cGVcclxuICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0ucm91bmRUcmlwVGltZSA9IGVudHJ5LnJvdW5kVHJpcFRpbWU7XHJcblxyXG4gICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS5qaXR0ZXIgPSBlbnRyeS5qaXR0ZXI7XHJcbiAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLnBhY2tldHNMb3N0ID0gZW50cnkucGFja2V0c0xvc3Q7XHJcbiAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLnBhY2tldHNSZWNlaXZlZCA9IGVudHJ5LnBhY2tldHNSZWNlaXZlZDtcclxuICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0uYnl0ZXNSZWNlaXZlZCA9IGVudHJ5LmJ5dGVzUmVjZWl2ZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGVudHJ5LmtpbmQgPT09IFwidmlkZW9cIiAmJiBlbnRyeS50eXBlID09PSBcIm1lZGlhLXNvdXJjZVwiKSB7XHJcbiAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLmZyYW1lc1BlclNlY29uZCA9IGVudHJ5LmZyYW1lc1BlclNlY29uZDtcclxuICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0uZnJhbWVSZXNvbHV0aW9uID0geyBcImhlaWdodFwiOiBlbnRyeS5oZWlnaHQsIFwid2lkdGhcIjogZW50cnkud2lkdGggfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBtZXRyaWNzO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdhdGhlckluYm91bmQoc3Vic2NyaXB0aW9ucykge1xyXG4gICAgcmV0dXJuIFByb21pc2UuYWxsU2V0dGxlZChBcnJheS5mcm9tKHN1YnNjcmlwdGlvbnMsIGFzeW5jIChbbWVtYmVySWQsIHN1YnNjcmliZXJdKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIucGVlckNvbm5lY3Rpb24uZ2V0U3RhdHMoKS50aGVuKChyZXBvcnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgbWV0cmljcyA9IHsgYXVkaW86IHt9LCB2aWRlbzoge30gfTtcclxuXHJcbiAgICAgICAgICAgIHJlcG9ydC5mb3JFYWNoKChlbnRyeSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09IFwicmVtb3RlLW91dGJvdW5kLXJ0cFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9sb29rcyBsaWtlIG9ubHkgQ2hyb21lIHByb3ZpZGVzIHRoZXNlIG1ldHJpY3MgdHlwZVxyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0uYnl0ZXNTZW50ID0gZW50cnkuYnl0ZXNTZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0ucGFja2V0c1NlbnQgPSBlbnRyeS5wYWNrZXRzU2VudDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSBcImluYm91bmQtcnRwXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL2ZvciB2aWRlbyBzdHJlYW1zLCBpdCBpcyBwb3NzaWJsZSB0byBncmFiIFwiZnJhbWVyYXRlTWVhblwiXHJcbiAgICAgICAgICAgICAgICAgICAgLy9idXQgYWRlcXVhdGUgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBkYXRhIHdvdWxkIHJlcXVpcmUgbW9yZSBlZmZvcnQsXHJcbiAgICAgICAgICAgICAgICAgICAgLy9pbmNsdWRpbmcgZ3JvdXBpbmcgYnkgcHVibGlzaGVyIGFuZCBhdmVyYWdpbmcgb24gdGhlIHNlcnZlciBzaWRlXHJcbiAgICAgICAgICAgICAgICAgICAgLy9pbiBvcmRlciB0byBzZWUgaG93IG11Y2ggRlBTIHdlIGxvc2UgcGVyIGV2ZXJ5IHB1Ymxpc2hlclxyXG5cclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLnRpbWVzdGFtcCA9IGVudHJ5LnRpbWVzdGFtcDtcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLmppdHRlciA9IGVudHJ5LmppdHRlcjtcclxuICAgICAgICAgICAgICAgICAgICBtZXRyaWNzW2VudHJ5LmtpbmRdLmJ5dGVzUmVjZWl2ZWQgPSBlbnRyeS5ieXRlc1JlY2VpdmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldHJpY3NbZW50cnkua2luZF0uaGVhZGVyQnl0ZXNSZWNlaXZlZCA9IGVudHJ5LmhlYWRlckJ5dGVzUmVjZWl2ZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS5wYWNrZXRzUmVjZWl2ZWQgPSBlbnRyeS5wYWNrZXRzUmVjZWl2ZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0cmljc1tlbnRyeS5raW5kXS5wYWNrZXRzTG9zdCA9IGVudHJ5LnBhY2tldHNMb3N0O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vdGhlc2UgbWV0cmljcyBhcmUgcG9zc2libGUgdG8gYWdncmVnYXRlIGJ5IHB1Ymxpc2hlciBhcyB3ZWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vYnV0IGluIGNvbnRyYXN0IHRvIFwiZnJhbWVyYXRlTWVhblwiIHRoZXkgYXJlIGFsc28gdXNlZnVsXHJcbiAgICAgICAgICAgICAgICAgICAgLy9pZiB3ZSBhZ2dyZWdhdGUgdGhlbSBieSBzdWJzY3JpYmVyOyBpbiB0aGlzIGNhc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgLy90aGV5IGFyZSBkaXNwbGF5IGZpdG5lc3Mgb2YgbmV0d29yayBjb25kaXRpb25zXHJcbiAgICAgICAgICAgICAgICAgICAgLy90byB0aGUgY3VycmVudCBsb2FkXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gbWV0cmljcztcclxuICAgICAgICB9KTtcclxuICAgIH0pKS50aGVuKChyZXN1bHRzKSA9PiB7XHJcbiAgICAgICAgY29uc3QgemVyb3MgPSB7XHJcbiAgICAgICAgICAgIFwiY291bnRcIjogMCxcclxuICAgICAgICAgICAgXCJ0aW1lc3RhbXBcIjogMCxcclxuICAgICAgICAgICAgXCJqaXR0ZXJcIjogMCxcclxuICAgICAgICAgICAgXCJieXRlc1NlbnRcIjogMCxcclxuICAgICAgICAgICAgXCJieXRlc1JlY2VpdmVkXCI6IDAsXHJcbiAgICAgICAgICAgIFwicGFja2V0c1JlY2VpdmVkXCI6IDAsXHJcbiAgICAgICAgICAgIFwicGFja2V0c0xvc3RcIjogMCxcclxuICAgICAgICB9O1xyXG4gICAgICAgIGNvbnN0IHRvdGFsID0ge1xyXG4gICAgICAgICAgICBcImF1ZGlvXCI6IE9iamVjdC5hc3NpZ24oe30sIHplcm9zKSxcclxuICAgICAgICAgICAgXCJ2aWRlb1wiOiB6ZXJvc1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHJlc3VsdHNcclxuICAgICAgICAgICAgLmZpbHRlcigocmVzdWx0KSA9PiByZXN1bHQuc3RhdHVzID09PSBcImZ1bGZpbGxlZFwiKVxyXG4gICAgICAgICAgICAubWFwKChyZXN1bHQpID0+IHJlc3VsdC52YWx1ZSlcclxuICAgICAgICAgICAgLmZvckVhY2goKHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQga2luZCBvZiBbXCJhdWRpb1wiLCBcInZpZGVvXCJdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxba2luZF0uY291bnQgKz0gMTtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFtraW5kXS50aW1lc3RhbXAgKz0gcmVzdWx0W2tpbmRdLnRpbWVzdGFtcDtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFtraW5kXS5qaXR0ZXIgKz0gcmVzdWx0W2tpbmRdLmppdHRlcjtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFtraW5kXS5ieXRlc1NlbnQgKz0gcmVzdWx0W2tpbmRdLmJ5dGVzU2VudDtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFtraW5kXS5ieXRlc1JlY2VpdmVkICs9IHJlc3VsdFtraW5kXS5ieXRlc1JlY2VpdmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsW2tpbmRdLnBhY2tldHNSZWNlaXZlZCArPSByZXN1bHRba2luZF0ucGFja2V0c1JlY2VpdmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsW2tpbmRdLnBhY2tldHNMb3N0ICs9IHJlc3VsdFtraW5kXS5wYWNrZXRzTG9zdDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IG1ldHJpY3MgPSB7IGF1ZGlvOiB7fSwgdmlkZW86IHt9IH07XHJcblxyXG4gICAgICAgIGZvciAobGV0IGtpbmQgb2YgW1wiYXVkaW9cIiwgXCJ2aWRlb1wiXSkge1xyXG4gICAgICAgICAgICBtZXRyaWNzW2tpbmRdLnRpbWVzdGFtcCA9IHRvdGFsW2tpbmRdLnRpbWVzdGFtcCAvIHRvdGFsW2tpbmRdLmNvdW50O1xyXG4gICAgICAgICAgICBtZXRyaWNzW2tpbmRdLmppdHRlciA9IHRvdGFsW2tpbmRdLmppdHRlciAvIHRvdGFsW2tpbmRdLmNvdW50O1xyXG4gICAgICAgICAgICBtZXRyaWNzW2tpbmRdLmJ5dGVzU2VudCA9IHRvdGFsW2tpbmRdLmJ5dGVzU2VudDtcclxuICAgICAgICAgICAgbWV0cmljc1traW5kXS5ieXRlc1JlY2VpdmVkID0gdG90YWxba2luZF0uYnl0ZXNSZWNlaXZlZDtcclxuICAgICAgICAgICAgbWV0cmljc1traW5kXS5wYWNrZXRzUmVjZWl2ZWQgPSB0b3RhbFtraW5kXS5wYWNrZXRzUmVjZWl2ZWQ7XHJcbiAgICAgICAgICAgIG1ldHJpY3Nba2luZF0ucGFja2V0c0xvc3QgPSB0b3RhbFtraW5kXS5wYWNrZXRzTG9zdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtZXRyaWNzO1xyXG4gICAgfSk7XHJcbn1cclxuIiwiY29uc3QgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XHJcbmNvbnN0IHdlYnNvY2tldCA9IHJlcXVpcmUoJy4vd2Vic29ja2V0Jyk7XHJcbmNvbnN0IGV4ZWN1dG9yID0gcmVxdWlyZSgnLi9leGVjdXRvcicpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBjb25uZWN0LFxyXG4gICAgc2VuZFJlcXVlc3QsXHJcblxyXG4gICAgb25lc2hvdCxcclxufTtcclxuXHJcbmxldCBpbnN0YW5jZSA9IHVuZGVmaW5lZDtcclxuXHJcbmZ1bmN0aW9uIGNvbm5lY3Qob25PcGVuLCB3aGVuTW9kZXJhdGlvbkFsbG93ZWQpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgXykgPT4ge1xyXG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xyXG4gICAgICAgICAgICByZXNvbHZlKGZhbHNlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgdGltZXJJZCA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICBsZXQgZXN0YWJsaXNoaW5nID0gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gd2Vic29ja2V0LmNvbm5lY3QoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy5tb2RlcmF0b3IudXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1vZGVyYXRvciBzZXJ2aWNlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uT3BlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmMgKG1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihtZXNzYWdlLmVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDb21tYW5kIHJlY2VpdmVkXCIsIG1lc3NhZ2UuY29tbWFuZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbW1hbmQgPT09IFwiQWxsb3dNb2RlcmF0aW9uXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hlbk1vZGVyYXRpb25BbGxvd2VkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbW1hbmRbXCJDaGFuZ2VSb29tXCJdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ2xvc2luZyBleGlzdGluZyBtb2RlcmF0b3IgY29ubmVjdGlvbiBkdWUgdG8gdGhlIGNoYW5nZSBvZiByb29tXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2FsbG93aW5nIHRvIHVwZGF0ZSB0aGlzIGxhbWJkYSB3aXRoIG5ldyBkYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KHRpbWVySWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbCh0aW1lcklkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBleGVjdXRvci5leGVjdXRlKG1lc3NhZ2UuY29tbWFuZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIlVuZXhwZWN0ZWQgcmVzcG9uc2VcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGVzdGFibGlzaGluZygpO1xyXG4gICAgICAgICAgICB0aW1lcklkID0gd2luZG93LnNldEludGVydmFsKCgpID0+IGVzdGFibGlzaGluZygpLFxyXG4gICAgICAgICAgICAgICAgY29uZmlnLm1vZGVyYXRvci5jb25uZWN0aW9uSW50ZXJ2YWwgKiAxMDAwKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gb25lc2hvdChhY3Rpb24pIHtcclxuICAgIGNvbnNvbGUuYXNzZXJ0KCFpbnN0YW5jZSk7XHJcblxyXG4gICAgd2Vic29ja2V0LmNvbm5lY3QoXHJcbiAgICAgICAgY29uZmlnLm1vZGVyYXRvci51cmwsXHJcbiAgICAgICAgXCJtb2RlcmF0b3Igc2VydmljZVwiLFxyXG4gICAgICAgIChzb2NrZXQpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJNYWRlIGEgb25lLXNob3QgY29ubmVjdGlvbiB0byBtb2RlcmF0aW5nIHNlcnZpY2VcIik7XHJcbiAgICAgICAgICAgIGFjdGlvbihzb2NrZXQpO1xyXG4gICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChzb2NrZXQuY2xvc2UuYmluZChzb2NrZXQpLCAzMDAwKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgICgpID0+IHt9LFxyXG4gICAgICAgICgpID0+IHt9XHJcbiAgICApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZW5kUmVxdWVzdChyZXF1ZXN0KSB7XHJcbiAgICBjb25zb2xlLmFzc2VydChpbnN0YW5jZSwgXCJNb2RlcmF0b3Igc2VydmljZSBpcyBub3QgY29ubmVjdGVkXCIpO1xyXG4gICAgaW5zdGFuY2Uuc2VuZChKU09OLnN0cmluZ2lmeShyZXF1ZXN0KSk7XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBjb25uZWN0LFxyXG59O1xyXG5cclxuY29uc3QgV2ViU29ja2V0ID0gcmVxdWlyZSgnaXNvbW9ycGhpYy13cycpO1xyXG5cclxuZnVuY3Rpb24gY29ubmVjdCh1cmwsIGxhYmVsLCBvbm9wZW4sIG9ubWVzc2FnZSwgb25jbG9zZSkge1xyXG4gICAgbGV0IHNvY2tldDtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIHNvY2tldCA9IG5ldyBXZWJTb2NrZXQodXJsKTtcclxuXHJcbiAgICAgICAgc29ja2V0Lm9uZXJyb3IgPSAoZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZSk7XHJcbiAgICAgICAgICAgIG9uY2xvc2UoKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHNvY2tldC5vbm9wZW4gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBDb25uZWN0ZWQgdG8gJHtsYWJlbH1gKTtcclxuICAgICAgICAgICAgb25vcGVuKHNvY2tldCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBzb2NrZXQub25tZXNzYWdlID0gKG1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJNZXNzYWdlIHJlY2VpdmVkXCIsIG1lc3NhZ2UuZGF0YSk7XHJcbiAgICAgICAgICAgIG9ubWVzc2FnZShKU09OLnBhcnNlKG1lc3NhZ2UuZGF0YSkpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgc29ja2V0Lm9uY2xvc2UgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBEaXNjb25uZWN0ZWQgZnJvbSAke2xhYmVsfWApO1xyXG4gICAgICAgICAgICBvbmNsb3NlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XHJcbiAgICAgICAgc29ja2V0ID0gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzb2NrZXQ7XHJcbn1cclxuIl19
