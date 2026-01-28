// Mock WeChat Mini Game APIs for browser
(function() {
  // Disable console.log for cleaner output
  console.log = function() {};
  console.warn = function() {};
  console.info = function() {};
  // Fixed mobile dimensions - must match game design (414x736)
  var MOBILE_WIDTH = 414;
  var MOBILE_HEIGHT = 736;

  // Create canvas
  var canvas = document.getElementById('canvas');
  canvas.width = MOBILE_WIDTH;
  canvas.height = MOBILE_HEIGHT;
  canvas.style.width = MOBILE_WIDTH + 'px';
  canvas.style.height = MOBILE_HEIGHT + 'px';
  canvas.style.margin = '0 auto';
  canvas.style.display = 'block';

  // Override window dimensions for the game
  Object.defineProperty(window, 'innerWidth', { value: MOBILE_WIDTH, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: MOBILE_HEIGHT, writable: true });

  // Global GameGlobal object (WeChat Mini Game global)
  window.GameGlobal = window.GameGlobal || {};
  window.GameGlobal.matchType = 0;  // Normal mode (0 = use default score 0)
  window.GameGlobal.cacheScore = 0;  // Cache score for relay mode
  window.GameGlobal.score = 0;  // Initialize score
  window.GameGlobal.currentScore = 0;
  window.GameGlobal.weekBestScore = 0;
  window.GameGlobal.historyBestScore = 0;
  window.canvas = canvas;

  // Patch to catch undefined.toString errors and return "0"
  var origNumberToString = Number.prototype.toString;
  function safeToString(val) {
    if (val === undefined || val === null) return "0";
    return String(val);
  }

  // Override game's score display to handle undefined
  window.addEventListener('load', function() {
    // Intercept any score that might be undefined
    var checkInterval = setInterval(function() {
      if (window.GameGlobal && window.GameGlobal.controller && window.GameGlobal.controller.gameData) {
        var gd = window.GameGlobal.controller.gameData;
        if (gd.score === undefined) gd.score = 0;
        if (gd.currentScore === undefined) gd.currentScore = 0;
        if (gd.weekBestScore === undefined) gd.weekBestScore = 0;
        if (gd.historyBestScore === undefined) gd.historyBestScore = 0;
      }
    }, 100);

    // Stop checking after 30 seconds
    setTimeout(function() { clearInterval(checkInterval); }, 30000);
  });

  // Mock wx object with ALL required functions
  window.wx = {
    // System Info
    getSystemInfoSync: function() {
      return {
        platform: 'android',
        model: 'Android Phone',
        system: 'Android 12',
        screenWidth: 414,
        screenHeight: 736,
        windowWidth: 414,
        windowHeight: 736,
        pixelRatio: 2,
        devicePixelRatio: 2,
        benchmarkLevel: 30,
        SDKVersion: '2.25.0',
        version: '8.0.30',
        language: 'zh_CN'
      };
    },

    getAppBaseInfo: function() {
      return { SDKVersion: '2.0.0', version: '1.0.0' };
    },

    getLaunchOptionsSync: function() {
      return { query: {}, scene: 1001 };
    },

    getMenuButtonBoundingClientRect: function() {
      return { top: 0, left: 0, right: 100, bottom: 50, width: 100, height: 50 };
    },

    getNetworkType: function(options) {
      if (options && options.success) options.success({ networkType: 'wifi' });
    },

    getUpdateManager: function() {
      return {
        onCheckForUpdate: function() {},
        onUpdateReady: function() {},
        onUpdateFailed: function() {},
        applyUpdate: function() {}
      };
    },

    // Storage
    getStorageSync: function(key) {
      try {
        var value = localStorage.getItem(key);
        if (value === null || value === undefined) {
          // Return proper defaults for different keys
          if (key === 'my_heighest_score') return 0;
          if (key === 'history_Times2') return 0;
          if (key === 'first_blood') return 0;
          if (key === 'weeek_best_score0') return { data: 0, ts: Date.now() + 604800000 };
          if (key === 'my_user_info') return { nick_name: 'Player', week_best_score: 0, history_best_score: 0 };
          if (key === 'session_id') return '';  // Empty = offline mode, no API calls
          return null;
        }
        var parsed = JSON.parse(value);
        // Ensure score values are never undefined
        if (key === 'my_heighest_score' && (parsed === undefined || parsed === null)) return 0;
        return parsed;
      } catch(e) {
        // If JSON parse fails, return safe defaults
        if (key === 'my_heighest_score') return 0;
        if (key === 'weeek_best_score0') return { data: 0, ts: Date.now() + 604800000 };
        return null;
      }
    },

    setStorageSync: function(key, data) {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
    },

    setStorage: function(options) {
      try {
        localStorage.setItem(options.key, JSON.stringify(options.data));
        if (options.success) options.success();
      } catch(e) { if (options.fail) options.fail(e); }
    },

    getStorageInfoSync: function() {
      return { keys: Object.keys(localStorage), currentSize: 0, limitSize: 10240 };
    },

    removeStorage: function(options) {
      localStorage.removeItem(options.key);
      if (options.success) options.success();
    },

    removeStorageSync: function(key) {
      localStorage.removeItem(key);
    },

    clearStorageSync: function() {
      localStorage.clear();
    },

    // Touch Events - Listen on document, fire to both wx callbacks and dispatch to document
    onTouchStart: function(callback) {
      // Store callback globally so weapp-adapter can use it
      window._wxTouchStartCallback = callback;
    },

    onTouchMove: function(callback) {
      window._wxTouchMoveCallback = callback;
    },

    onTouchEnd: function(callback) {
      window._wxTouchEndCallback = callback;
    },

    onTouchCancel: function(callback) {
      window._wxTouchCancelCallback = callback;
    },

    offTouchStart: function() {},
    offTouchMove: function() {},
    offTouchEnd: function() {},
    offTouchCancel: function() {},

    // Canvas & Image
    createCanvas: function() {
      // Return the existing HTML canvas instead of creating new one
      // This ensures touch events work correctly
      if (!window._wxCanvasCreated) {
        window._wxCanvasCreated = true;
        canvas.width = MOBILE_WIDTH;
        canvas.height = MOBILE_HEIGHT;
        return canvas;
      }
      // For subsequent calls, create new canvas (for offscreen rendering)
      var c = document.createElement('canvas');
      c.width = MOBILE_WIDTH;
      c.height = MOBILE_HEIGHT;
      return c;
    },

    createImage: function() {
      return new Image();
    },

    // Font
    loadFont: function(path) {
      // Load the actual font file
      if (path) {
        var fontName = 'GameFont' + Date.now();
        var font = new FontFace(fontName, 'url(' + path + ')');
        font.load().then(function(loadedFont) {
          document.fonts.add(loadedFont);
          console.log('[Font loaded]', path);
        }).catch(function(err) {
          console.log('[Font load failed]', path, err);
        });
        return fontName;
      }
      return 'Arial';
    },

    // Performance
    getPerformance: function() {
      return window.performance || { now: function() { return Date.now(); } };
    },

    // Audio
    createInnerAudioContext: function() {
      var audio = new Audio();
      var ctx = {
        _audio: audio,
        _src: '',
        loop: false,
        volume: 1,
        currentTime: 0,
        get src() { return this._src; },
        set src(val) {
          this._src = val;
          if (val) {
            this._audio.src = val;
            this._audio.load();
          }
        },
        play: function() {
          if (this._audio && this._audio.src) {
            this._audio.volume = this.volume;
            this._audio.loop = this.loop;
            var playPromise = this._audio.play();
            if (playPromise) {
              playPromise.catch(function(e) {
                console.log('[Audio play blocked]', e.message);
              });
            }
          }
        },
        pause: function() { if (this._audio) this._audio.pause(); },
        stop: function() {
          if (this._audio) {
            this._audio.pause();
            this._audio.currentTime = 0;
          }
        },
        seek: function(position) {
          if (this._audio) this._audio.currentTime = position;
        },
        destroy: function() {
          if (this._audio) {
            this._audio.pause();
            this._audio.src = '';
          }
          this._audio = null;
        },
        onCanplay: function(callback) { if (this._audio) this._audio.oncanplay = callback; },
        onPlay: function(callback) { if (this._audio) this._audio.onplay = callback; },
        onPause: function(callback) { if (this._audio) this._audio.onpause = callback; },
        onStop: function(callback) {},
        onEnded: function(callback) { if (this._audio) this._audio.onended = callback; },
        onError: function(callback) { if (this._audio) this._audio.onerror = callback; }
      };
      return ctx;
    },

    onAudioInterruptionBegin: function(callback) {},

    // Lifecycle Events
    onShow: function(callback) {
      window.addEventListener('focus', function() { callback({ query: {} }); });
      // Call immediately
      setTimeout(function() { callback({ query: {} }); }, 100);
    },

    onHide: function(callback) {
      window.addEventListener('blur', callback);
    },

    onError: function(callback) {
      window.addEventListener('error', function(e) {
        callback({ message: e.message, stack: e.error ? e.error.stack : '' });
      });
    },

    // Share
    showShareMenu: function(options) { if (options && options.success) options.success(); },
    onShareAppMessage: function(callback) {},
    shareAppMessage: function(options) { if (options && options.success) options.success(); },
    shareAppMessageToGroup: function(options) { if (options && options.success) options.success(); },
    updateShareMenu: function(options) { if (options && options.success) options.success(); },
    getShareInfo: function(options) { if (options && options.fail) options.fail(); },
    shareInvitationToLiveRoom: function(options) { if (options && options.fail) options.fail(); },
    onShareInvitationToLiveRoom: function(callback) {},

    // UI
    showModal: function(options) {
      var result = confirm(options.content || options.title);
      if (options.success) options.success({ confirm: result, cancel: !result });
    },

    showToast: function(options) {
      console.log('[Toast]', options.title);
      if (options.success) options.success();
    },

    showLoading: function(options) {
      console.log('[Loading]', options ? options.title : '');
      if (options && options.success) options.success();
    },

    hideLoading: function(options) {
      if (options && options.success) options.success();
    },

    showActionSheet: function(options) {
      if (options.fail) options.fail({ errMsg: 'Not supported in browser' });
    },

    // Keyboard
    showKeyboard: function(options) { if (options && options.success) options.success(); },
    onKeyboardComplete: function(callback) {},
    offKeyboardComplete: function() {},

    // Network Request - returns a Promise-like object
    request: function(options) {
      var url = options.url || '';

      // Create a request task object that the game expects
      // Also make it thenable in case game uses Promise-style
      var requestTask = {
        abort: function() {},
        onHeadersReceived: function() {},
        offHeadersReceived: function() {},
        then: function(resolve, reject) {
          // Will be resolved when success callback is called
          return Promise.resolve();
        },
        catch: function(fn) { return this; }
      };

      // Block WeChat server requests and return mock data
      if (url.indexOf('mp.weixin.qq.com') !== -1 || url.indexOf('wxagame') !== -1) {
        console.log('[Mock] Blocked WeChat request:', url);
        console.log('[Mock] Request data:', JSON.stringify(options.data || {}).substring(0, 200));

        // Return mock success response
        if (options.success) {
          var mockData = {
            base_resp: { errcode: 0, errmsg: 'ok' },
            content: {},
            data: {}
          };

          // Specific mocks for different endpoints
          if (url.indexOf('wxagame_init') !== -1) {
            mockData.session_id = 'mock_session_' + Date.now();
            mockData.skin_list = [];
            mockData.current_skin = null;
            mockData.version = 1;
            mockData.object_id_list = [];
            mockData.user_info = {
              nick_name: 'Player',
              head_img: '',
              open_id: 'mock_open_id_' + Date.now(),
              week_best_score: 0,
              history_best_score: 0
            };
          }
          if (url.indexOf('wxagame_scenelogin') !== -1) {
            mockData.ad_reward_quota = 0;
            mockData.ad_banner_quota = 0;
          }
          if (url.indexOf('wxagame_getproperty') !== -1) {
            mockData.property_list = [];
          }
          if (url.indexOf('wxagame_getuserinfo') !== -1) {
            mockData.appeal_notify = 0;
            mockData.headimg = 'res/ava.png';
            mockData.nickname = 'Player';
            mockData.open_id = 'mock_open_id_browser';
          }
          if (url.indexOf('wxagame_settlement') !== -1) {
            // Get the score from request data if available
            var reqScore = (options.data && options.data.score) ? options.data.score : 0;
            mockData.score = reqScore;
            mockData.cheater_status = 0;
            mockData.appeal_status = 0;
            mockData.week_best_score = reqScore;
            mockData.history_best_score = reqScore;
            mockData.best_score = reqScore;
            mockData.current_score = reqScore;
            mockData.bottle_skin = {};
            mockData.playback_id = 'mock_playback_' + Date.now();
            mockData.gift_id = '';
            mockData.rank = 1;
            mockData.rank_change = 0;
            // Return immediately for settlement
            if (options.success) {
              options.success({ data: mockData, statusCode: 200 });
            }
            return requestTask;
          }
          if (url.indexOf('wxagame_bottlereport') !== -1) {
            // Just acknowledge the report
          }
          if (url.indexOf('wxagame_eggreport') !== -1) {
            // Just acknowledge the report
          }
          if (url.indexOf('wxagame_getfriendsscore') !== -1) {
            mockData.bottle_skin_list = [];
            mockData.my_user_info = {
              bottle_skin_id: 0,
              grade: 0,
              headimg: 'res/ava.png',
              history_best_score: 0,
              hongbao_list: [],
              nickname: 'Player',
              playback_id: 'mock_playback_' + Date.now(),
              score_info: [],
              times: 10,
              week_best_score: 0
            };
            mockData.user_info = [];
          }

          setTimeout(function() {
            console.log('[Mock] Returning success for:', url.split('/').pop());
            console.log('[Mock] Response data:', JSON.stringify(mockData).substring(0, 300));
            try {
              options.success({ data: mockData, statusCode: 200 });
              console.log('[Mock] Callback completed for:', url.split('/').pop());
            } catch(err) {
              console.error('[Mock] Callback ERROR:', err);
            }
          }, 10);
        }
        return requestTask;
      }

      // For other requests, use fetch
      fetch(options.url, {
        method: options.method || 'GET',
        headers: options.header || {},
        body: options.method !== 'GET' && options.data ? JSON.stringify(options.data) : undefined
      })
      .then(function(response) { return response.json(); })
      .then(function(data) { if (options.success) options.success({ data: data, statusCode: 200 }); })
      .catch(function(error) { if (options.fail) options.fail(error); });

      return requestTask;
    },

    downloadFile: function(options) {
      if (options.fail) options.fail({ errMsg: 'Not supported in browser' });
    },

    uploadFile: function(options) {
      if (options.fail) options.fail({ errMsg: 'Not supported in browser' });
    },

    // WebSocket
    connectSocket: function(options) {
      try {
        var ws = new WebSocket(options.url);
        window._wxSocket = ws;
        if (options.success) options.success();
      } catch(e) {
        if (options.fail) options.fail(e);
      }
    },

    onSocketOpen: function(callback) {
      if (window._wxSocket) window._wxSocket.onopen = callback;
    },

    onSocketMessage: function(callback) {
      if (window._wxSocket) window._wxSocket.onmessage = function(e) { callback({ data: e.data }); };
    },

    onSocketError: function(callback) {
      if (window._wxSocket) window._wxSocket.onerror = callback;
    },

    onSocketClose: function(callback) {
      if (window._wxSocket) window._wxSocket.onclose = callback;
    },

    sendSocketMessage: function(options) {
      if (window._wxSocket) {
        window._wxSocket.send(options.data);
        if (options.success) options.success();
      }
    },

    closeSocket: function(options) {
      if (window._wxSocket) {
        window._wxSocket.close();
        if (options && options.success) options.success();
      }
    },

    // File System
    getFileSystemManager: function() {
      return {
        readFile: function(options) { if (options.fail) options.fail({ errMsg: 'Not supported' }); },
        writeFile: function(options) { if (options.fail) options.fail({ errMsg: 'Not supported' }); },
        readFileSync: function() { return null; },
        writeFileSync: function() {}
      };
    },

    // Login & User
    login: function(options) {
      var mockCode = 'mock_session_' + Date.now();
      console.log('[Mock] wx.login - code:', mockCode);
      if (options && options.success) {
        setTimeout(function() {
          options.success({ code: mockCode });
        }, 0);
      }
      // Return thenable for Promise-style usage
      return {
        then: function(resolve) {
          setTimeout(function() { resolve({ code: mockCode }); }, 0);
          return this;
        },
        catch: function() { return this; }
      };
    },

    getSetting: function(options) {
      // Return all permissions as granted
      var authSetting = {
        'scope.userInfo': true,
        'scope.userLocation': true,
        'scope.writePhotosAlbum': true,
        'scope.WxFriendInteraction': true,
        'scope.gameClubData': true
      };
      if (options && options.success) {
        setTimeout(function() { options.success({ authSetting: authSetting }); }, 0);
      }
      return {
        then: function(resolve) {
          setTimeout(function() { resolve({ authSetting: authSetting }); }, 0);
          return this;
        },
        catch: function() { return this; }
      };
    },

    openSetting: function(options) {
      var authSetting = {
        'scope.userInfo': true,
        'scope.userLocation': true,
        'scope.writePhotosAlbum': true,
        'scope.WxFriendInteraction': true,
        'scope.gameClubData': true
      };
      if (options && options.success) options.success({ authSetting: authSetting });
    },

    authorize: function(options) {
      if (options && options.success) {
        setTimeout(function() { options.success(); }, 0);
      }
      return {
        then: function(resolve) {
          setTimeout(function() { resolve(); }, 0);
          return this;
        },
        catch: function() { return this; }
      };
    },

    createUserInfoButton: function(options) {
      return {
        show: function() {},
        hide: function() {},
        destroy: function() {},
        onTap: function(callback) {}
      };
    },

    getPrivacySetting: function(options) {
      if (options.success) options.success({ needAuthorization: false });
    },

    requirePrivacyAuthorize: function(options) {
      if (options.success) options.success();
    },

    // Ads
    createBannerAd: function(options) {
      return {
        show: function() { return Promise.resolve(); },
        hide: function() {},
        destroy: function() {},
        onLoad: function(callback) {},
        onError: function(callback) {},
        onResize: function(callback) {}
      };
    },

    createRewardedVideoAd: function(options) {
      return {
        show: function() { return Promise.resolve(); },
        load: function() { return Promise.resolve(); },
        destroy: function() {},
        onLoad: function(callback) {},
        onError: function(callback) {},
        onClose: function(callback) { callback({ isEnded: true }); }
      };
    },

    createIncentiveVideoAd: function(options) {
      return {
        show: function() { return Promise.resolve(); },
        load: function() { return Promise.resolve(); },
        destroy: function() {},
        onLoad: function(callback) {},
        onError: function(callback) {},
        onClose: function(callback) {}
      };
    },

    // Image
    chooseImage: function(options) {
      if (options.fail) options.fail({ errMsg: 'Not supported in browser' });
    },

    saveImageToPhotosAlbum: function(options) {
      if (options.fail) options.fail({ errMsg: 'Not supported in browser' });
    },

    // Mini Program
    navigateToMiniProgram: function(options) {
      if (options.fail) options.fail({ errMsg: 'Not supported in browser' });
    },

    exitMiniProgram: function(options) {
      window.close();
      if (options && options.success) options.success();
    },

    // Rank & Social
    getRankManager: function() {
      return {
        onChallengeStart: function(callback) {},
        onChallengeEnd: function(callback) {},
        onChallengeScore: function(callback) {},
        getChallengeInfo: function(options) {
          if (options && options.success) options.success({});
        },
        setChallengeScore: function(options) {
          if (options && options.success) options.success();
        },
        getRankData: function(options) {
          if (options && options.success) options.success({ rankList: [] });
        },
        setRankData: function(options) {
          if (options && options.success) options.success();
        },
        update: function(options) {
          if (options && options.success) options.success();
        },
        createChallenge: function(options) {
          if (options && options.success) options.success();
        },
        getChallengeeInfo: function(options) {
          if (options && options.success) options.success({});
        }
      };
    },

    getGroupEnterInfo: function(options) {
      if (options.fail) options.fail({ errMsg: 'Not supported' });
    },

    // Chat Tool
    isChatTool: function() { return false; },
    getChatToolInfo: function(options) { if (options.fail) options.fail(); },
    openChatTool: function(options) { if (options.fail) options.fail(); },
    exitChatTool: function(options) { if (options.fail) options.fail(); },

    // Game Live
    getGameLiveState: function(options) {
      if (options && options.success) options.success({ isLiving: false, isLive: false });
      return { isLiving: false, isLive: false };
    },
    onGameLiveStateChange: function(callback) {},

    // Subscribe Message
    requestSubscribeMessage: function(options) {
      if (options.success) options.success({});
    },

    // Report
    reportEvent: function(eventId, data) {},
    getRealtimeLogManager: function() {
      return {
        info: function() {},
        warn: function() {},
        error: function() {},
        setFilterMsg: function() {},
        addFilterMsg: function() {}
      };
    },

    // Misc
    setKeepScreenOn: function(options) { if (options.success) options.success(); },
    triggerGC: function() {},
    openUrl: function(options) {
      if (options.url) window.open(options.url);
      if (options.success) options.success();
    },

    // Environment
    env: {
      USER_DATA_PATH: '/user'
    }
  };

  // Initialize score values in localStorage with defaults
  if (localStorage.getItem('my_heighest_score') === null) {
    localStorage.setItem('my_heighest_score', '0');
  }
  if (localStorage.getItem('history_Times2') === null) {
    localStorage.setItem('history_Times2', '0');
  }
  if (localStorage.getItem('first_blood') === null) {
    localStorage.setItem('first_blood', '0');
  }
  // Week best score has a special format with timestamp
  if (localStorage.getItem('weeek_best_score0') === null) {
    localStorage.setItem('weeek_best_score0', JSON.stringify({
      data: 0,
      ts: Date.now() + 7 * 24 * 60 * 60 * 1000  // Expires in 7 days
    }));
  }
  // Session ID - empty for offline mode
  localStorage.removeItem('session_id');
  // My user info - always reset to ensure clean state
  localStorage.setItem('my_user_info', JSON.stringify({
    nick_name: 'Player',
    head_img: 'res/ava.png',
    open_id: 'mock_open_id_' + Date.now(),
    week_best_score: 0,
    history_best_score: 0
  }));
  // Reset scores to 0
  localStorage.setItem('my_heighest_score', '0');

  // Test the mock
  var sysInfo = window.wx.getSystemInfoSync();
  console.log('WeChat API mock loaded!');
  console.log('Platform:', sysInfo.platform);
  console.log('Initialized localStorage scores');

  // Setup touch event forwarding
  function createTouchData(e, isEnd) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = MOBILE_WIDTH / rect.width;
    var scaleY = MOBILE_HEIGHT / rect.height;

    console.log('[Debug] rect:', rect.width, 'x', rect.height, '| scale:', scaleX.toFixed(2), scaleY.toFixed(2));

    var touches = [];
    var changedTouches = [];

    if (e.touches) {
      for (var i = 0; i < e.touches.length; i++) {
        var t = e.touches[i];
        var x = (t.clientX - rect.left) * scaleX;
        var y = (t.clientY - rect.top) * scaleY;
        touches.push({ clientX: x, clientY: y, pageX: x, pageY: y, identifier: t.identifier });
      }
    }

    if (e.changedTouches) {
      for (var j = 0; j < e.changedTouches.length; j++) {
        var ct = e.changedTouches[j];
        var cx = (ct.clientX - rect.left) * scaleX;
        var cy = (ct.clientY - rect.top) * scaleY;
        changedTouches.push({ clientX: cx, clientY: cy, pageX: cx, pageY: cy, identifier: ct.identifier });
      }
    }

    // For mouse events
    if (!e.touches && e.clientX !== undefined) {
      var mx = (e.clientX - rect.left) * scaleX;
      var my = (e.clientY - rect.top) * scaleY;
      var mouseTouch = { clientX: mx, clientY: my, pageX: mx, pageY: my, identifier: 0 };
      if (!isEnd) touches.push(mouseTouch);
      changedTouches.push(mouseTouch);
    }

    return {
      touches: touches,
      changedTouches: changedTouches,
      targetTouches: touches,  // Same as touches for single touch
      timeStamp: e.timeStamp || Date.now(),
      target: canvas,
      currentTarget: canvas,
      preventDefault: function() {},
      stopPropagation: function() {}
    };
  }

  // Canvas touch/mouse events - forward to game's canvas
  function fireTouchEvent(type, e, isEnd) {
    var data = createTouchData(e, isEnd);

    var tx = data.changedTouches[0]?.pageX;
    var ty = data.changedTouches[0]?.pageY;
    console.log('[Touch]', type, 'x:', Math.round(tx), 'y:', Math.round(ty), '| Button needs: x(86-318) y(458-552)');

    // Only fire on GameGlobal's document (game listens via canvas.addEventListener which adapter redirects to document)
    // Don't use wx callbacks to avoid duplicate events
    setTimeout(function() {
      if (window.GameGlobal && window.GameGlobal.document) {
        var evt = new Event(type, { bubbles: true });
        evt.touches = data.touches;
        evt.changedTouches = data.changedTouches;
        evt.targetTouches = data.touches;
        evt.timeStamp = data.timeStamp;

        // Fire on GameGlobal document
        try {
          window.GameGlobal.document.dispatchEvent(evt);
          console.log('[Dispatched to GameGlobal.document]', type);
        } catch(err) {
          console.log('[GameGlobal dispatch error]', err);
        }
      }
    }, 0);
  }

  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    fireTouchEvent('touchstart', e, false);
  });

  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    fireTouchEvent('touchmove', e, false);
  });

  canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    fireTouchEvent('touchend', e, true);
  });

  canvas.addEventListener('touchcancel', function(e) {
    fireTouchEvent('touchcancel', e, true);
  });

  // Mouse events for desktop
  canvas.addEventListener('mousedown', function(e) {
    fireTouchEvent('touchstart', e, false);
  });

  canvas.addEventListener('mousemove', function(e) {
    if (e.buttons === 1) {
      fireTouchEvent('touchmove', e, false);
    }
  });

  canvas.addEventListener('mouseup', function(e) {
    fireTouchEvent('touchend', e, true);
  });
})();
