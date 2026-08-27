"use strict";
(self["webpackChunkapp"] = self["webpackChunkapp"] || []).push([["common"],{

/***/ 74:
/*!***********************************************************!*\
  !*** ./node_modules/@ionic/core/components/p-CmR5uXej.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   c: () => (/* binding */ r)
/* harmony export */ });
/* harmony import */ var _p_CHqRYvYm_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./p-CHqRYvYm.js */ 576);
/* harmony import */ var _p_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./p-ZjP4CjeZ.js */ 291);
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */


let t;
const i = (e, o, i) => {
    const n = o.startsWith("animation") ? (r = e, void 0 === t && (t = void 0 === r.style.animationName && void 0 !== r.style.webkitAnimationName ? "-webkit-" : ""), t) : "";
    var r;
    e.style.setProperty(n + o, i);
  },
  n = (e = [], o) => {
    if (void 0 !== o) {
      const t = Array.isArray(o) ? o : [o];
      return [...e, ...t];
    }
    return e;
  },
  r = t => {
    let r,
      a,
      s,
      d,
      l,
      f,
      c,
      v,
      m,
      u,
      p,
      y = [],
      g = [],
      A = [],
      b = !1,
      C = {},
      E = [],
      h = [],
      R = {},
      S = 0,
      j = !1,
      k = !1,
      w = !0,
      T = !1,
      D = !0,
      F = !1;
    const W = t,
      I = [],
      K = [],
      M = [],
      P = [],
      Y = [],
      Z = [],
      q = [],
      x = [],
      H = [],
      z = [],
      B = [],
      G = "function" == typeof AnimationEffect || void 0 !== _p_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_0__.w && "function" == typeof _p_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_0__.w.AnimationEffect,
      J = "function" == typeof Element && "function" == typeof Element.prototype.animate && G,
      L = () => B,
      N = (e, o) => {
        const t = o.findIndex(o => o.c === e);
        t > -1 && o.splice(t, 1);
      },
      O = (e, o) => (((null == o ? void 0 : o.oneTimeCallback) ? K : I).push({
        c: e,
        o
      }), p),
      Q = () => {
        J && (B.forEach(e => {
          e.cancel();
        }), B.length = 0);
      },
      U = () => {
        Z.forEach(e => {
          (null == e ? void 0 : e.parentNode) && e.parentNode.removeChild(e);
        }), Z.length = 0;
      },
      V = () => void 0 !== l ? l : c ? c.getFill() : "both",
      X = () => void 0 !== v ? v : void 0 !== f ? f : c ? c.getDirection() : "normal",
      $ = () => j ? "linear" : void 0 !== s ? s : c ? c.getEasing() : "linear",
      _ = () => k ? 0 : void 0 !== m ? m : void 0 !== a ? a : c ? c.getDuration() : 0,
      ee = () => void 0 !== d ? d : c ? c.getIterations() : 1,
      oe = () => void 0 !== u ? u : void 0 !== r ? r : c ? c.getDelay() : 0,
      te = () => {
        0 !== S && (S--, 0 === S && ((() => {
          H.forEach(e => e()), z.forEach(e => e());
          const e = w ? 1 : 0,
            o = E,
            t = h,
            n = R;
          P.forEach(e => {
            const r = e.classList;
            o.forEach(e => r.add(e)), t.forEach(e => r.remove(e));
            for (const o in n) n.hasOwnProperty(o) && i(e, o, n[o]);
          }), m = void 0, v = void 0, u = void 0, I.forEach(o => o.c(e, p)), K.forEach(o => o.c(e, p)), K.length = 0, D = !0, w && (T = !0), w = !0;
        })(), c && c.animationFinish()));
      },
      ie = () => {
        (() => {
          q.forEach(e => e()), x.forEach(e => e());
          const e = g,
            o = A,
            t = C;
          P.forEach(n => {
            const r = n.classList;
            e.forEach(e => r.add(e)), o.forEach(e => r.remove(e));
            for (const e in t) t.hasOwnProperty(e) && i(n, e, t[e]);
          });
        })(), y.length > 0 && J && (P.forEach(e => {
          const o = e.animate(y, {
            id: W,
            delay: oe(),
            duration: _(),
            easing: $(),
            iterations: ee(),
            fill: V(),
            direction: X()
          });
          o.pause(), B.push(o);
        }), B.length > 0 && (B[0].onfinish = () => {
          te();
        })), b = !0;
      },
      ne = e => {
        e = Math.min(Math.max(e, 0), .9999), J && B.forEach(o => {
          o.currentTime = o.effect.getComputedTiming().delay + _() * e, o.pause();
        });
      },
      re = e => {
        B.forEach(e => {
          e.effect.updateTiming({
            delay: oe(),
            duration: _(),
            easing: $(),
            iterations: ee(),
            fill: V(),
            direction: X()
          });
        }), void 0 !== e && ne(e);
      },
      ae = (e = !1, o = !0, t) => (e && Y.forEach(i => {
        i.update(e, o, t);
      }), J && re(t), p),
      se = () => {
        b && (J ? B.forEach(e => {
          e.pause();
        }) : P.forEach(e => {
          i(e, "animation-play-state", "paused");
        }), F = !0);
      },
      de = e => new Promise(o => {
        (null == e ? void 0 : e.sync) && (k = !0, O(() => k = !1, {
          oneTimeCallback: !0
        })), b || ie(), T && (J && (ne(0), re()), T = !1), D && (S = Y.length + 1, D = !1);
        const t = () => {
            N(i, K), o();
          },
          i = () => {
            N(t, M), o();
          };
        O(i, {
          oneTimeCallback: !0
        }), M.push({
          c: t,
          o: {
            oneTimeCallback: !0
          }
        }), Y.forEach(e => {
          e.play();
        }), J ? (B.forEach(e => {
          e.play();
        }), 0 !== y.length && 0 !== P.length || te()) : te(), F = !1;
      }),
      le = (e, o) => {
        const t = y[0];
        return void 0 === t || void 0 !== t.offset && 0 !== t.offset ? y = [{
          offset: 0,
          [e]: o
        }, ...y] : t[e] = o, p;
      };
    return p = {
      parentAnimation: c,
      elements: P,
      childAnimations: Y,
      id: W,
      animationFinish: te,
      from: le,
      to: (e, o) => {
        const t = y[y.length - 1];
        return void 0 === t || void 0 !== t.offset && 1 !== t.offset ? y = [...y, {
          offset: 1,
          [e]: o
        }] : t[e] = o, p;
      },
      fromTo: (e, o, t) => le(e, o).to(e, t),
      parent: e => (c = e, p),
      play: de,
      pause: () => (Y.forEach(e => {
        e.pause();
      }), se(), p),
      stop: () => {
        Y.forEach(e => {
          e.stop();
        }), b && (Q(), b = !1), j = !1, k = !1, D = !0, v = void 0, m = void 0, u = void 0, S = 0, T = !1, w = !0, F = !1, M.forEach(e => e.c(0, p)), M.length = 0;
      },
      destroy: e => (Y.forEach(o => {
        o.destroy(e);
      }), (e => {
        Q(), e && U();
      })(e), P.length = 0, Y.length = 0, y.length = 0, I.length = 0, K.length = 0, b = !1, D = !0, p),
      keyframes: e => {
        const o = y !== e;
        return y = e, o && (e => {
          J && L().forEach(o => {
            const t = o.effect;
            if (t.setKeyframes) t.setKeyframes(e);else {
              const i = new KeyframeEffect(t.target, e, t.getTiming());
              o.effect = i;
            }
          });
        })(y), p;
      },
      addAnimation: e => {
        if (null != e) if (Array.isArray(e)) for (const o of e) o.parent(p), Y.push(o);else e.parent(p), Y.push(e);
        return p;
      },
      addElement: o => {
        if (null != o) if (1 === o.nodeType) P.push(o);else if (o.length >= 0) for (let e = 0; e < o.length; e++) P.push(o[e]);else (0,_p_CHqRYvYm_js__WEBPACK_IMPORTED_MODULE_1__.j)("createAnimation - Invalid addElement value.");
        return p;
      },
      update: ae,
      fill: e => (l = e, ae(!0), p),
      direction: e => (f = e, ae(!0), p),
      iterations: e => (d = e, ae(!0), p),
      duration: e => (J || 0 !== e || (e = 1), a = e, ae(!0), p),
      easing: e => (s = e, ae(!0), p),
      delay: e => (r = e, ae(!0), p),
      getWebAnimations: L,
      getKeyframes: () => y,
      getFill: V,
      getDirection: X,
      getDelay: oe,
      getIterations: ee,
      getEasing: $,
      getDuration: _,
      afterAddRead: e => (H.push(e), p),
      afterAddWrite: e => (z.push(e), p),
      afterClearStyles: (e = []) => {
        for (const o of e) R[o] = "";
        return p;
      },
      afterStyles: (e = {}) => (R = e, p),
      afterRemoveClass: e => (h = n(h, e), p),
      afterAddClass: e => (E = n(E, e), p),
      beforeAddRead: e => (q.push(e), p),
      beforeAddWrite: e => (x.push(e), p),
      beforeClearStyles: (e = []) => {
        for (const o of e) C[o] = "";
        return p;
      },
      beforeStyles: (e = {}) => (C = e, p),
      beforeRemoveClass: e => (A = n(A, e), p),
      beforeAddClass: e => (g = n(g, e), p),
      onFinish: O,
      isRunning: () => 0 !== S && !F,
      progressStart: (e = !1, o) => (Y.forEach(t => {
        t.progressStart(e, o);
      }), se(), j = e, b || ie(), ae(!1, !0, o), p),
      progressStep: e => (Y.forEach(o => {
        o.progressStep(e);
      }), ne(e), p),
      progressEnd: (e, o, t) => (j = !1, Y.forEach(i => {
        i.progressEnd(e, o, t);
      }), void 0 !== t && (m = t), T = !1, w = !0, 0 === e ? (v = "reverse" === X() ? "normal" : "reverse", "reverse" === v && (w = !1), J ? (ae(), ne(1 - o)) : (u = (1 - o) * _() * -1, ae(!1, !1))) : 1 === e && (J ? (ae(), ne(o)) : (u = o * _() * -1, ae(!1, !1))), void 0 === e || c || de(), p)
    };
  };


/***/ }),

/***/ 291:
/*!***********************************************************!*\
  !*** ./node_modules/@ionic/core/components/p-ZjP4CjeZ.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   d: () => (/* binding */ o),
/* harmony export */   w: () => (/* binding */ d)
/* harmony export */ });
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
const d = "undefined" != typeof window ? window : void 0,
  o = "undefined" != typeof document ? document : void 0;


/***/ }),

/***/ 666:
/*!*********************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/button-active-CXXy0FIE.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   c: () => (/* binding */ createButtonActiveGesture)
/* harmony export */ });
/* harmony import */ var _index_tcQvqkiX_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./index-tcQvqkiX.js */ 8026);
/* harmony import */ var _haptic_DzAMWJuk_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./haptic-DzAMWJuk.js */ 8235);
/* harmony import */ var _index_Bck1OwMs_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./index-Bck1OwMs.js */ 7584);
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */



const createButtonActiveGesture = (el, isButton) => {
  let currentTouchedButton;
  let initialTouchedButton;
  const activateButtonAtPoint = (x, y, hapticFeedbackFn) => {
    if (typeof document === 'undefined') {
      return;
    }
    const target = document.elementFromPoint(x, y);
    if (!target || !isButton(target) || target.disabled) {
      clearActiveButton();
      return;
    }
    if (target !== currentTouchedButton) {
      clearActiveButton();
      setActiveButton(target, hapticFeedbackFn);
    }
  };
  const setActiveButton = (button, hapticFeedbackFn) => {
    currentTouchedButton = button;
    if (!initialTouchedButton) {
      initialTouchedButton = currentTouchedButton;
    }
    const buttonToModify = currentTouchedButton;
    (0,_index_tcQvqkiX_js__WEBPACK_IMPORTED_MODULE_0__.w)(() => buttonToModify.classList.add('ion-activated'));
    hapticFeedbackFn();
  };
  const clearActiveButton = (dispatchClick = false) => {
    if (!currentTouchedButton) {
      return;
    }
    const buttonToModify = currentTouchedButton;
    (0,_index_tcQvqkiX_js__WEBPACK_IMPORTED_MODULE_0__.w)(() => buttonToModify.classList.remove('ion-activated'));
    /**
     * Clicking on one button, but releasing on another button
     * does not dispatch a click event in browsers, so we
     * need to do it manually here. Some browsers will
     * dispatch a click if clicking on one button, dragging over
     * another button, and releasing on the original button. In that
     * case, we need to make sure we do not cause a double click there.
     */
    if (dispatchClick && initialTouchedButton !== currentTouchedButton) {
      currentTouchedButton.click();
    }
    currentTouchedButton = undefined;
  };
  return (0,_index_Bck1OwMs_js__WEBPACK_IMPORTED_MODULE_2__.createGesture)({
    el,
    gestureName: 'buttonActiveDrag',
    threshold: 0,
    onStart: ev => activateButtonAtPoint(ev.currentX, ev.currentY, _haptic_DzAMWJuk_js__WEBPACK_IMPORTED_MODULE_1__.b),
    onMove: ev => activateButtonAtPoint(ev.currentX, ev.currentY, _haptic_DzAMWJuk_js__WEBPACK_IMPORTED_MODULE_1__.a),
    onEnd: () => {
      clearActiveButton(true);
      (0,_haptic_DzAMWJuk_js__WEBPACK_IMPORTED_MODULE_1__.h)();
      initialTouchedButton = undefined;
    }
  });
};


/***/ }),

/***/ 5051:
/*!*****************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/capacitor-CFERIeaU.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   g: () => (/* binding */ getCapacitor)
/* harmony export */ });
/* harmony import */ var _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./index-ZjP4CjeZ.js */ 575);
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */

const getCapacitor = () => {
  if (_index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_0__.w !== undefined) {
    return _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_0__.w.Capacitor;
  }
  return undefined;
};


/***/ }),

/***/ 9929:
/*!**************************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/compare-with-utils-sObYyvOy.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   c: () => (/* binding */ compareOptions),
/* harmony export */   i: () => (/* binding */ isOptionSelected)
/* harmony export */ });
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
/**
 * Uses the compareWith param to compare two values to determine if they are equal.
 *
 * @param currentValue The current value of the control.
 * @param compareValue The value to compare against.
 * @param compareWith The function or property name to use to compare values.
 */
const compareOptions = (currentValue, compareValue, compareWith) => {
  if (typeof compareWith === 'function') {
    return compareWith(currentValue, compareValue);
  } else if (typeof compareWith === 'string') {
    return currentValue[compareWith] === compareValue[compareWith];
  } else {
    return Array.isArray(compareValue) ? compareValue.includes(currentValue) : currentValue === compareValue;
  }
};
/**
 * Compares a value against the current value(s) to determine if it is selected.
 *
 * @param currentValue The current value of the control.
 * @param compareValue The value to compare against.
 * @param compareWith The function or property name to use to compare values.
 */
const isOptionSelected = (currentValue, compareValue, compareWith) => {
  if (currentValue === undefined) {
    return false;
  }
  if (Array.isArray(currentValue)) {
    return currentValue.some(val => compareOptions(val, compareValue, compareWith));
  } else {
    return compareOptions(currentValue, compareValue, compareWith);
  }
};


/***/ }),

/***/ 2853:
/*!*********************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/focus-visible-BmVRXR1y.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   startFocusVisible: () => (/* binding */ startFocusVisible)
/* harmony export */ });
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
const ION_FOCUSED = 'ion-focused';
const ION_FOCUSABLE = 'ion-focusable';
const FOCUS_KEYS = ['Tab', 'ArrowDown', 'Space', 'Escape', ' ', 'Shift', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Home', 'End'];
const startFocusVisible = rootEl => {
  let currentFocus = [];
  let keyboardMode = true;
  const ref = rootEl ? rootEl.shadowRoot : document;
  const root = rootEl ? rootEl : document.body;
  const setFocus = elements => {
    currentFocus.forEach(el => el.classList.remove(ION_FOCUSED));
    elements.forEach(el => el.classList.add(ION_FOCUSED));
    currentFocus = elements;
  };
  const pointerDown = () => {
    keyboardMode = false;
    setFocus([]);
  };
  const onKeydown = ev => {
    keyboardMode = FOCUS_KEYS.includes(ev.key);
    if (!keyboardMode) {
      setFocus([]);
    }
  };
  const onFocusin = ev => {
    if (keyboardMode && ev.composedPath !== undefined) {
      const toFocus = ev.composedPath().filter(el => {
        // TODO(FW-2832): type
        if (el.classList) {
          return el.classList.contains(ION_FOCUSABLE);
        }
        return false;
      });
      setFocus(toFocus);
    }
  };
  const onFocusout = () => {
    if (ref.activeElement === root) {
      setFocus([]);
    }
  };
  ref.addEventListener('keydown', onKeydown);
  ref.addEventListener('focusin', onFocusin);
  ref.addEventListener('focusout', onFocusout);
  ref.addEventListener('touchstart', pointerDown, {
    passive: true
  });
  ref.addEventListener('mousedown', pointerDown);
  const destroy = () => {
    ref.removeEventListener('keydown', onKeydown);
    ref.removeEventListener('focusin', onFocusin);
    ref.removeEventListener('focusout', onFocusout);
    ref.removeEventListener('touchstart', pointerDown);
    ref.removeEventListener('mousedown', pointerDown);
  };
  return {
    destroy,
    setFocus
  };
};


/***/ }),

/***/ 8235:
/*!**************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/haptic-DzAMWJuk.js ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   I: () => (/* binding */ ImpactStyle),
/* harmony export */   a: () => (/* binding */ hapticSelectionChanged),
/* harmony export */   b: () => (/* binding */ hapticSelectionStart),
/* harmony export */   c: () => (/* binding */ hapticSelection),
/* harmony export */   d: () => (/* binding */ hapticImpact),
/* harmony export */   h: () => (/* binding */ hapticSelectionEnd)
/* harmony export */ });
/* harmony import */ var _capacitor_CFERIeaU_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./capacitor-CFERIeaU.js */ 5051);
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */

var ImpactStyle;
(function (ImpactStyle) {
  /**
   * A collision between large, heavy user interface elements
   *
   * @since 1.0.0
   */
  ImpactStyle["Heavy"] = "HEAVY";
  /**
   * A collision between moderately sized user interface elements
   *
   * @since 1.0.0
   */
  ImpactStyle["Medium"] = "MEDIUM";
  /**
   * A collision between small, light user interface elements
   *
   * @since 1.0.0
   */
  ImpactStyle["Light"] = "LIGHT";
})(ImpactStyle || (ImpactStyle = {}));
var NotificationType;
(function (NotificationType) {
  /**
   * A notification feedback type indicating that a task has completed successfully
   *
   * @since 1.0.0
   */
  NotificationType["Success"] = "SUCCESS";
  /**
   * A notification feedback type indicating that a task has produced a warning
   *
   * @since 1.0.0
   */
  NotificationType["Warning"] = "WARNING";
  /**
   * A notification feedback type indicating that a task has failed
   *
   * @since 1.0.0
   */
  NotificationType["Error"] = "ERROR";
})(NotificationType || (NotificationType = {}));
const HapticEngine = {
  getEngine() {
    const capacitor = (0,_capacitor_CFERIeaU_js__WEBPACK_IMPORTED_MODULE_0__.g)();
    if (capacitor === null || capacitor === void 0 ? void 0 : capacitor.isPluginAvailable('Haptics')) {
      // Capacitor
      return capacitor.Plugins.Haptics;
    }
    return undefined;
  },
  available() {
    const engine = this.getEngine();
    if (!engine) {
      return false;
    }
    const capacitor = (0,_capacitor_CFERIeaU_js__WEBPACK_IMPORTED_MODULE_0__.g)();
    /**
     * Developers can manually import the
     * Haptics plugin in their app which will cause
     * getEngine to return the Haptics engine. However,
     * the Haptics engine will throw an error if
     * used in a web browser that does not support
     * the Vibrate API. This check avoids that error
     * if the browser does not support the Vibrate API.
     */
    if ((capacitor === null || capacitor === void 0 ? void 0 : capacitor.getPlatform()) === 'web') {
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      return typeof navigator !== 'undefined' && navigator.vibrate !== undefined;
    }
    return true;
  },
  impact(options) {
    const engine = this.getEngine();
    if (!engine) {
      return;
    }
    engine.impact({
      style: options.style
    });
  },
  notification(options) {
    const engine = this.getEngine();
    if (!engine) {
      return;
    }
    engine.notification({
      type: options.type
    });
  },
  selection() {
    this.impact({
      style: ImpactStyle.Light
    });
  },
  selectionStart() {
    const engine = this.getEngine();
    if (!engine) {
      return;
    }
    engine.selectionStart();
  },
  selectionChanged() {
    const engine = this.getEngine();
    if (!engine) {
      return;
    }
    engine.selectionChanged();
  },
  selectionEnd() {
    const engine = this.getEngine();
    if (!engine) {
      return;
    }
    engine.selectionEnd();
  }
};
/**
 * Check to see if the Haptic Plugin is available
 * @return Returns `true` or false if the plugin is available
 */
const hapticAvailable = () => {
  return HapticEngine.available();
};
/**
 * Trigger a selection changed haptic event. Good for one-time events
 * (not for gestures)
 */
const hapticSelection = () => {
  hapticAvailable() && HapticEngine.selection();
};
/**
 * Tell the haptic engine that a gesture for a selection change is starting.
 */
const hapticSelectionStart = () => {
  hapticAvailable() && HapticEngine.selectionStart();
};
/**
 * Tell the haptic engine that a selection changed during a gesture.
 */
const hapticSelectionChanged = () => {
  hapticAvailable() && HapticEngine.selectionChanged();
};
/**
 * Tell the haptic engine we are done with a gesture. This needs to be
 * called lest resources are not properly recycled.
 */
const hapticSelectionEnd = () => {
  hapticAvailable() && HapticEngine.selectionEnd();
};
/**
 * Use this to indicate success/failure/warning to the user.
 * options should be of the type `{ style: ImpactStyle.LIGHT }` (or `MEDIUM`/`HEAVY`)
 */
const hapticImpact = options => {
  hapticAvailable() && HapticEngine.impact(options);
};


/***/ }),

/***/ 1839:
/*!*************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/index-B_8X7INq.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   I: () => (/* binding */ ION_CONTENT_CLASS_SELECTOR),
/* harmony export */   a: () => (/* binding */ findClosestIonContent),
/* harmony export */   b: () => (/* binding */ findIonContent),
/* harmony export */   c: () => (/* binding */ ION_CONTENT_ELEMENT_SELECTOR),
/* harmony export */   d: () => (/* binding */ disableContentScrollY),
/* harmony export */   e: () => (/* binding */ findRefresherScrollHost),
/* harmony export */   f: () => (/* binding */ findRefresherInContent),
/* harmony export */   g: () => (/* binding */ getScrollElement),
/* harmony export */   h: () => (/* binding */ scrollByPoint),
/* harmony export */   i: () => (/* binding */ isIonContent),
/* harmony export */   p: () => (/* binding */ printIonContentErrorMsg),
/* harmony export */   r: () => (/* binding */ resetContentScrollY),
/* harmony export */   s: () => (/* binding */ scrollToTop)
/* harmony export */ });
/* harmony import */ var D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js */ 9204);
/* harmony import */ var _helpers_DkCLSLI9_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./helpers-DkCLSLI9.js */ 8169);
/* harmony import */ var _index_tcQvqkiX_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./index-tcQvqkiX.js */ 8026);

/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */


const ION_CONTENT_TAG_NAME = 'ION-CONTENT';
const ION_CONTENT_ELEMENT_SELECTOR = 'ion-content';
const ION_CONTENT_CLASS_SELECTOR = '.ion-content-scroll-host';
/**
 * Selector used for implementations reliant on `<ion-content>` for scroll event changes.
 *
 * Developers should use the `.ion-content-scroll-host` selector to target the element emitting
 * scroll events. With virtual scroll implementations this will be the host element for
 * the scroll viewport.
 */
const ION_CONTENT_SELECTOR = `${ION_CONTENT_ELEMENT_SELECTOR}, ${ION_CONTENT_CLASS_SELECTOR}`;
const isIonContent = el => el.tagName === ION_CONTENT_TAG_NAME;
/**
 * Waits for the element host fully initialize before
 * returning the inner scroll element.
 *
 * For `ion-content` the scroll target will be the result
 * of the `getScrollElement` function.
 *
 * For custom implementations it will be the element host
 * or a selector within the host, if supplied through `scrollTarget`.
 */
const getScrollElement = /*#__PURE__*/function () {
  var _ref = (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* (el) {
    if (isIonContent(el)) {
      yield new Promise(resolve => (0,_helpers_DkCLSLI9_js__WEBPACK_IMPORTED_MODULE_1__.c)(el, resolve));
      return el.getScrollElement();
    }
    return el;
  });
  return function getScrollElement(_x) {
    return _ref.apply(this, arguments);
  };
}();
/**
 * Queries the element matching the selector for IonContent.
 * See ION_CONTENT_SELECTOR for the selector used.
 */
const findIonContent = el => {
  /**
   * First we try to query the custom scroll host selector in cases where
   * the implementation is using an outer `ion-content` with an inner custom
   * scroll container.
   */
  const customContentHost = el.querySelector(ION_CONTENT_CLASS_SELECTOR);
  if (customContentHost) {
    return customContentHost;
  }
  return el.querySelector(ION_CONTENT_SELECTOR);
};
/**
 * Queries the closest element matching the selector for IonContent.
 */
const findClosestIonContent = el => {
  return el.closest(ION_CONTENT_SELECTOR);
};
/**
 * Queries the custom scroll host an `ion-refresher` scrolls with in the given
 * `ion-content`. A refresher only pairs with the first host.
 */
const findRefresherScrollHost = ionContent => {
  return ionContent.querySelector(ION_CONTENT_CLASS_SELECTOR);
};
/**
 * Queries the `ion-refresher` that scrolls with the given content element,
 * which may be an `ion-content` or a custom scroll host. A refresher is a
 * `slot="fixed"` child of `ion-content`, so it is a sibling of a scroll host
 * rather than a descendant of it.
 */
const findRefresherInContent = contentEl => {
  // An `ion-content` owns any refresher inside it, scroll host or not.
  if (isIonContent(contentEl)) {
    return contentEl.querySelector('ion-refresher');
  }
  // A refresher needs an `ion-content` ancestor to initialize.
  const ionContent = contentEl.closest(ION_CONTENT_ELEMENT_SELECTOR);
  if (ionContent === null) {
    return null;
  }
  // Any scroll host other than the refresher's own has no refresher.
  const refresherScrollHost = findRefresherScrollHost(ionContent);
  if (refresherScrollHost === null || !refresherScrollHost.contains(contentEl)) {
    return null;
  }
  return ionContent.querySelector('ion-refresher');
};
/**
 * Scrolls to the top of the element. If an `ion-content` is found, it will scroll
 * using the public API `scrollToTop` with a duration.
 */
const scrollToTop = (el, durationMs) => {
  if (isIonContent(el)) {
    const content = el;
    return content.scrollToTop(durationMs);
  }
  return Promise.resolve(el.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth'
  }));
};
/**
 * Scrolls by a specified X/Y distance in the component. If an `ion-content` is found, it will scroll
 * using the public API `scrollByPoint` with a duration.
 */
const scrollByPoint = (el, x, y, durationMs) => {
  if (isIonContent(el)) {
    const content = el;
    return content.scrollByPoint(x, y, durationMs);
  }
  return Promise.resolve(el.scrollBy({
    top: y,
    left: x,
    behavior: durationMs > 0 ? 'smooth' : 'auto'
  }));
};
/**
 * Prints an error informing developers that an implementation requires an element to be used
 * within either the `ion-content` selector or the `.ion-content-scroll-host` class.
 */
const printIonContentErrorMsg = el => {
  return (0,_index_tcQvqkiX_js__WEBPACK_IMPORTED_MODULE_2__.t)(el, ION_CONTENT_ELEMENT_SELECTOR);
};
/**
 * Several components in Ionic need to prevent scrolling
 * during a gesture (card modal, range, item sliding, etc).
 * Use this utility to account for ion-content and custom content hosts.
 */
const disableContentScrollY = contentEl => {
  if (isIonContent(contentEl)) {
    const ionContent = contentEl;
    const initialScrollY = ionContent.scrollY;
    ionContent.scrollY = false;
    /**
     * This should be passed into resetContentScrollY
     * so that we can revert ion-content's scrollY to the
     * correct state. For example, if scrollY = false
     * initially, we do not want to enable scrolling
     * when we call resetContentScrollY.
     */
    return initialScrollY;
  } else {
    contentEl.style.setProperty('overflow', 'hidden');
    return true;
  }
};
const resetContentScrollY = (contentEl, initialScrollY) => {
  if (isIonContent(contentEl)) {
    contentEl.scrollY = initialScrollY;
  } else {
    contentEl.style.removeProperty('overflow');
  }
};


/***/ }),

/***/ 7594:
/*!*************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/index-DV3sJJW8.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   a: () => (/* binding */ arrowBackSharp),
/* harmony export */   b: () => (/* binding */ closeCircle),
/* harmony export */   c: () => (/* binding */ chevronBack),
/* harmony export */   d: () => (/* binding */ closeSharp),
/* harmony export */   e: () => (/* binding */ searchSharp),
/* harmony export */   f: () => (/* binding */ checkmarkOutline),
/* harmony export */   g: () => (/* binding */ ellipseOutline),
/* harmony export */   h: () => (/* binding */ arrowDown),
/* harmony export */   i: () => (/* binding */ caretBackSharp),
/* harmony export */   j: () => (/* binding */ reorderThreeOutline),
/* harmony export */   k: () => (/* binding */ reorderTwoSharp),
/* harmony export */   l: () => (/* binding */ chevronDown),
/* harmony export */   m: () => (/* binding */ chevronForwardOutline),
/* harmony export */   n: () => (/* binding */ ellipsisHorizontal),
/* harmony export */   o: () => (/* binding */ caretUpSharp),
/* harmony export */   p: () => (/* binding */ chevronForward),
/* harmony export */   q: () => (/* binding */ caretDownSharp),
/* harmony export */   r: () => (/* binding */ removeOutline),
/* harmony export */   s: () => (/* binding */ searchOutline),
/* harmony export */   t: () => (/* binding */ close),
/* harmony export */   u: () => (/* binding */ menuOutline),
/* harmony export */   v: () => (/* binding */ menuSharp),
/* harmony export */   w: () => (/* binding */ chevronExpand),
/* harmony export */   x: () => (/* binding */ eyeOff),
/* harmony export */   y: () => (/* binding */ eye)
/* harmony export */ });
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
/* Ionicons v8.0.13, ES Modules */

const arrowBackSharp = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M244 400 100 256l144-144M120 256h292' stroke-linecap='square' stroke-miterlimit='10' stroke-width='48px' class='ionicon-fill-none'/></svg>";
const arrowDown = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='m112 268 144 144 144-144M256 392V100' stroke-linecap='round' stroke-linejoin='round' stroke-width='48px' class='ionicon-fill-none'/></svg>";
const caretBackSharp = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M368 64 144 256l224 192z'/></svg>";
const caretDownSharp = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='m64 144 192 224 192-224z'/></svg>";
const caretUpSharp = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M448 368 256 144 64 368z'/></svg>";
const checkmarkOutline = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M416 128 192 384l-96-96' stroke-linecap='round' stroke-linejoin='round' class='ionicon-fill-none ionicon-stroke-width'/></svg>";
const chevronBack = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M328 112 184 256l144 144' stroke-linecap='round' stroke-linejoin='round' stroke-width='48px' class='ionicon-fill-none'/></svg>";
const chevronDown = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='m112 184 144 144 144-144' stroke-linecap='round' stroke-linejoin='round' stroke-width='48px' class='ionicon-fill-none'/></svg>";
const chevronExpand = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='48' d='m136 208 120-104 120 104M136 304l120 104 120-104' class='ionicon-fill-none'/></svg>";
const chevronForward = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='m184 112 144 144-144 144' stroke-linecap='round' stroke-linejoin='round' stroke-width='48px' class='ionicon-fill-none'/></svg>";
const chevronForwardOutline = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='m184 112 144 144-144 144' stroke-linecap='round' stroke-linejoin='round' stroke-width='48px' class='ionicon-fill-none'/></svg>";
const close = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='m289.94 256 95-95A24 24 0 0 0 351 127l-95 95-95-95a24 24 0 0 0-34 34l95 95-95 95a24 24 0 1 0 34 34l95-95 95 95a24 24 0 0 0 34-34Z'/></svg>";
const closeCircle = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48m75.31 260.69a16 16 0 1 1-22.62 22.62L256 278.63l-52.69 52.68a16 16 0 0 1-22.62-22.62L233.37 256l-52.68-52.69a16 16 0 0 1 22.62-22.62L256 233.37l52.69-52.68a16 16 0 0 1 22.62 22.62L278.63 256Z'/></svg>";
const closeSharp = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256z'/></svg>";
const ellipseOutline = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><circle cx='256' cy='256' r='192' stroke-linecap='round' stroke-linejoin='round' class='ionicon-fill-none ionicon-stroke-width'/></svg>";
const ellipsisHorizontal = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><circle cx='256' cy='256' r='48'/><circle cx='416' cy='256' r='48'/><circle cx='96' cy='256' r='48'/></svg>";
const eye = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><circle cx='256' cy='256' r='64'/><path d='M490.84 238.6c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 255.66 96c-42.52 0-84.33 12.15-124.27 36.11-40.73 24.43-77.63 60.12-109.68 106.07a31.92 31.92 0 0 0-.64 35.54c26.41 41.33 60.4 76.14 98.28 100.65C162 402 207.9 416 255.66 416c46.71 0 93.81-14.43 136.2-41.72 38.46-24.77 72.72-59.66 99.08-100.92a32.2 32.2 0 0 0-.1-34.76M256 352a96 96 0 1 1 96-96 96.11 96.11 0 0 1-96 96'/></svg>";
const eyeOff = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M432 448a15.92 15.92 0 0 1-11.31-4.69l-352-352a16 16 0 0 1 22.62-22.62l352 352A16 16 0 0 1 432 448M248 315.85l-51.79-51.79a2 2 0 0 0-3.39 1.69 64.11 64.11 0 0 0 53.49 53.49 2 2 0 0 0 1.69-3.39M264 196.15 315.87 248a2 2 0 0 0 3.4-1.69 64.13 64.13 0 0 0-53.55-53.55 2 2 0 0 0-1.72 3.39'/><path d='M491 273.36a32.2 32.2 0 0 0-.1-34.76c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 255.68 96a226.5 226.5 0 0 0-71.82 11.79 4 4 0 0 0-1.56 6.63l47.24 47.24a4 4 0 0 0 3.82 1.05 96 96 0 0 1 116 116 4 4 0 0 0 1.05 3.81l67.95 68a4 4 0 0 0 5.4.24 343.8 343.8 0 0 0 67.24-77.4M256 352a96 96 0 0 1-93.3-118.63 4 4 0 0 0-1.05-3.81l-66.84-66.87a4 4 0 0 0-5.41-.23c-24.39 20.81-47 46.13-67.67 75.72a31.92 31.92 0 0 0-.64 35.54c26.41 41.33 60.39 76.14 98.28 100.65C162.06 402 207.92 416 255.68 416a238.2 238.2 0 0 0 72.64-11.55 4 4 0 0 0 1.61-6.64l-47.47-47.46a4 4 0 0 0-3.81-1.05A96 96 0 0 1 256 352'/></svg>";
const menuOutline = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M80 160h352M80 256h352M80 352h352' stroke-linecap='round' stroke-miterlimit='10' class='ionicon-fill-none ionicon-stroke-width'/></svg>";
const menuSharp = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M64 384h384v-42.67H64Zm0-106.67h384v-42.66H64ZM64 128v42.67h384V128Z'/></svg>";
const removeOutline = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M400 256H112' stroke-linecap='round' stroke-linejoin='round' class='ionicon-fill-none ionicon-stroke-width'/></svg>";
const reorderThreeOutline = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M96 256h320M96 176h320M96 336h320' stroke-linecap='round' stroke-linejoin='round' class='ionicon-fill-none ionicon-stroke-width'/></svg>";
const reorderTwoSharp = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M118 304h276M118 208h276' stroke-linecap='square' stroke-linejoin='round' stroke-width='44px' class='ionicon-fill-none'/></svg>";
const searchOutline = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M221.09 64a157.09 157.09 0 1 0 157.09 157.09A157.1 157.1 0 0 0 221.09 64Z' stroke-miterlimit='10' class='ionicon-fill-none ionicon-stroke-width'/><path d='M338.29 338.29 448 448' stroke-linecap='round' stroke-miterlimit='10' class='ionicon-fill-none ionicon-stroke-width'/></svg>";
const searchSharp = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' class='ionicon'><path d='M464 428 339.92 303.9a160.48 160.48 0 0 0 30.72-94.58C370.64 120.37 298.27 48 209.32 48S48 120.37 48 209.32s72.37 161.32 161.32 161.32a160.48 160.48 0 0 0 94.58-30.72L428 464ZM209.32 319.69a110.38 110.38 0 1 1 110.37-110.37 110.5 110.5 0 0 1-110.37 110.37'/></svg>";


/***/ }),

/***/ 9424:
/*!****************************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/item-multiple-inputs-DlNuqNJm.js ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   c: () => (/* binding */ createItemMultipleInputsObserver)
/* harmony export */ });
/* harmony import */ var _index_tcQvqkiX_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./index-tcQvqkiX.js */ 8026);
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */


/**
 * `item-multiple-inputs` is toggled on the item after its form controls render,
 * so a control whose focus styling depends on it needs to re-render when it flips.
 *
 * @internal
 * @param el The form control whose closest `ion-item` should be observed.
 * @param onChange Called whenever one of `classNames` is added or removed.
 * @param classNames The item classes the caller's rendering depends on. A caller
 * reading more than one must list them all, or changes to the rest are ignored.
 * @returns The observer to disconnect in `disconnectedCallback`, or `undefined`
 * if it could not be created.
 */
const createItemMultipleInputsObserver = (el, onChange, classNames = ['item-multiple-inputs']) => {
  const item = el.closest('ion-item');
  if (!item || false || typeof MutationObserver === 'undefined') {
    return undefined;
  }
  const readClasses = () => classNames.map(name => item.classList.contains(name)).join(',');
  let previousClasses = readClasses();
  const observer = new MutationObserver(() => {
    const currentClasses = readClasses();
    if (currentClasses !== previousClasses) {
      previousClasses = currentClasses;
      onChange();
    }
  });
  observer.observe(item, {
    attributes: true,
    attributeFilter: ['class']
  });
  return observer;
};


/***/ }),

/***/ 2954:
/*!****************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/keyboard-CUw4ekVy.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   K: () => (/* binding */ Keyboard),
/* harmony export */   a: () => (/* binding */ KeyboardResize)
/* harmony export */ });
/* harmony import */ var _capacitor_CFERIeaU_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./capacitor-CFERIeaU.js */ 5051);
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */

var ExceptionCode;
(function (ExceptionCode) {
  /**
   * API is not implemented.
   *
   * This usually means the API can't be used because it is not implemented for
   * the current platform.
   */
  ExceptionCode["Unimplemented"] = "UNIMPLEMENTED";
  /**
   * API is not available.
   *
   * This means the API can't be used right now because:
   *   - it is currently missing a prerequisite, such as network connectivity
   *   - it requires a particular platform or browser version
   */
  ExceptionCode["Unavailable"] = "UNAVAILABLE";
})(ExceptionCode || (ExceptionCode = {}));
var KeyboardResize;
(function (KeyboardResize) {
  /**
   * Only the `body` HTML element will be resized.
   * Relative units are not affected, because the viewport does not change.
   *
   * @since 1.0.0
   */
  KeyboardResize["Body"] = "body";
  /**
   * Only the `ion-app` HTML element will be resized.
   * Use it only for Ionic Framework apps.
   *
   * @since 1.0.0
   */
  KeyboardResize["Ionic"] = "ionic";
  /**
   * The whole native Web View will be resized when the keyboard shows/hides.
   * This affects the `vh` relative unit.
   *
   * @since 1.0.0
   */
  KeyboardResize["Native"] = "native";
  /**
   * Neither the app nor the Web View are resized.
   *
   * @since 1.0.0
   */
  KeyboardResize["None"] = "none";
})(KeyboardResize || (KeyboardResize = {}));
const Keyboard = {
  getEngine() {
    const capacitor = (0,_capacitor_CFERIeaU_js__WEBPACK_IMPORTED_MODULE_0__.g)();
    if (capacitor === null || capacitor === void 0 ? void 0 : capacitor.isPluginAvailable('Keyboard')) {
      return capacitor.Plugins.Keyboard;
    }
    return undefined;
  },
  getResizeMode() {
    const engine = this.getEngine();
    if (!(engine === null || engine === void 0 ? void 0 : engine.getResizeMode)) {
      return Promise.resolve(undefined);
    }
    return engine.getResizeMode().catch(e => {
      if (e.code === ExceptionCode.Unimplemented) {
        // If the native implementation is not available
        // we treat it the same as if the plugin is not available.
        return undefined;
      }
      throw e;
    });
  }
};


/***/ }),

/***/ 7387:
/*!***************************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/keyboard-controller-BaaVITYt.js ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   c: () => (/* binding */ createKeyboardController)
/* harmony export */ });
/* harmony import */ var D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js */ 9204);
/* harmony import */ var _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./index-ZjP4CjeZ.js */ 575);
/* harmony import */ var _keyboard_CUw4ekVy_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./keyboard-CUw4ekVy.js */ 2954);

/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */



/**
 * The element that resizes when the keyboard opens
 * is going to depend on the resize mode
 * which is why we check that here.
 */
const getResizeContainer = resizeMode => {
  /**
   * If doc is undefined then we are
   * in an SSR environment, so the keyboard
   * adjustment does not apply.
   * If the webview does not resize then there
   * is no container to resize.
   */
  if (_index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.d === undefined || resizeMode === _keyboard_CUw4ekVy_js__WEBPACK_IMPORTED_MODULE_2__.a.None || resizeMode === undefined) {
    return null;
  }
  /**
   * The three remaining resize modes: Native, Ionic, and Body
   * all cause `ion-app` to resize, so we can listen for changes
   * on that. In the event `ion-app` is not available then
   * we can fall back to `body`.
   */
  const ionApp = _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.d.querySelector('ion-app');
  return ionApp !== null && ionApp !== void 0 ? ionApp : _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.d.body;
};
/**
 * Get the height of ion-app or body.
 * This is used for determining if the webview
 * has resized before the keyboard closed.
 * */
const getResizeContainerHeight = resizeMode => {
  const containerElement = getResizeContainer(resizeMode);
  return containerElement === null ? 0 : containerElement.clientHeight;
};
/**
 * Creates a controller that tracks and reacts to opening or closing the keyboard.
 *
 * @internal
 * @param keyboardChangeCallback A function to call when the keyboard opens or closes.
 */
const createKeyboardController = /*#__PURE__*/function () {
  var _ref = (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* (keyboardChangeCallback) {
    let keyboardWillShowHandler;
    let keyboardWillHideHandler;
    let keyboardVisible;
    /**
     * This lets us determine if the webview content
     * has resized as a result of the keyboard.
     */
    let initialResizeContainerHeight;
    const init = /*#__PURE__*/function () {
      var _ref2 = (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
        const resizeOptions = yield _keyboard_CUw4ekVy_js__WEBPACK_IMPORTED_MODULE_2__.K.getResizeMode();
        const resizeMode = resizeOptions === undefined ? undefined : resizeOptions.mode;
        keyboardWillShowHandler = () => {
          /**
           * We need to compute initialResizeContainerHeight right before
           * the keyboard opens to guarantee the resize container is visible.
           * The resize container may not be visible if we compute this
           * as soon as the keyboard controller is created.
           * We should only need to do this once to avoid additional clientHeight
           * computations.
           */
          if (initialResizeContainerHeight === undefined) {
            initialResizeContainerHeight = getResizeContainerHeight(resizeMode);
          }
          keyboardVisible = true;
          fireChangeCallback(keyboardVisible, resizeMode);
        };
        keyboardWillHideHandler = () => {
          keyboardVisible = false;
          fireChangeCallback(keyboardVisible, resizeMode);
        };
        _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w === null || _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w === void 0 ? void 0 : _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w.addEventListener('keyboardWillShow', keyboardWillShowHandler);
        _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w === null || _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w === void 0 ? void 0 : _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w.addEventListener('keyboardWillHide', keyboardWillHideHandler);
      });
      return function init() {
        return _ref2.apply(this, arguments);
      };
    }();
    const fireChangeCallback = (state, resizeMode) => {
      if (keyboardChangeCallback) {
        keyboardChangeCallback(state, createResizePromiseIfNeeded(resizeMode));
      }
    };
    /**
     * Code responding to keyboard lifecycles may need
     * to show/hide content once the webview has
     * resized as a result of the keyboard showing/hiding.
     * createResizePromiseIfNeeded provides a way for code to wait for the
     * resize event that was triggered as a result of the keyboard.
     */
    const createResizePromiseIfNeeded = resizeMode => {
      if (
      /**
       * If we are in an SSR environment then there is
       * no window to resize. Additionally, if there
       * is no resize mode or the resize mode is "None"
       * then initialResizeContainerHeight will be 0
       */
      initialResizeContainerHeight === 0 ||
      /**
       * If the keyboard is closed before the webview resizes initially
       * then the webview will never resize.
       */
      initialResizeContainerHeight === getResizeContainerHeight(resizeMode)) {
        return;
      }
      /**
       * Get the resize container so we can
       * attach the ResizeObserver below to
       * the correct element.
       */
      const containerElement = getResizeContainer(resizeMode);
      if (containerElement === null) {
        return;
      }
      /**
       * Some part of the web content should resize,
       * and we need to listen for a resize.
       */
      return new Promise(resolve => {
        const callback = () => {
          /**
           * As per the spec, the ResizeObserver
           * will fire when observation starts if
           * the observed element is rendered and does not
           * have a size of 0 x 0. However, the watched element
           * may or may not have resized by the time this first
           * callback is fired. As a result, we need to check
           * the dimensions of the element.
           *
           * https://www.w3.org/TR/resize-observer/#intro
           */
          if (containerElement.clientHeight === initialResizeContainerHeight) {
            /**
             * The resize happened, so stop listening
             * for resize on this element.
             */
            ro.disconnect();
            resolve();
          }
        };
        /**
         * In Capacitor there can be delay between when the window
         * resizes and when the container element resizes, so we cannot
         * rely on a 'resize' event listener on the window.
         * Instead, we need to determine when the container
         * element resizes using a ResizeObserver.
         */
        const ro = new ResizeObserver(callback);
        ro.observe(containerElement);
      });
    };
    const destroy = () => {
      _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w === null || _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w === void 0 ? void 0 : _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w.removeEventListener('keyboardWillShow', keyboardWillShowHandler);
      _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w === null || _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w === void 0 ? void 0 : _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_1__.w.removeEventListener('keyboardWillHide', keyboardWillHideHandler);
      keyboardWillShowHandler = keyboardWillHideHandler = undefined;
    };
    const isKeyboardVisible = () => keyboardVisible;
    yield init();
    return {
      init,
      destroy,
      isKeyboardVisible
    };
  });
  return function createKeyboardController(_x) {
    return _ref.apply(this, arguments);
  };
}();


/***/ }),

/***/ 4753:
/*!****************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/keyboard-ywgs5efA.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   KEYBOARD_DID_CLOSE: () => (/* binding */ KEYBOARD_DID_CLOSE),
/* harmony export */   KEYBOARD_DID_OPEN: () => (/* binding */ KEYBOARD_DID_OPEN),
/* harmony export */   copyVisualViewport: () => (/* binding */ copyVisualViewport),
/* harmony export */   keyboardDidClose: () => (/* binding */ keyboardDidClose),
/* harmony export */   keyboardDidOpen: () => (/* binding */ keyboardDidOpen),
/* harmony export */   keyboardDidResize: () => (/* binding */ keyboardDidResize),
/* harmony export */   resetKeyboardAssist: () => (/* binding */ resetKeyboardAssist),
/* harmony export */   setKeyboardClose: () => (/* binding */ setKeyboardClose),
/* harmony export */   setKeyboardOpen: () => (/* binding */ setKeyboardOpen),
/* harmony export */   startKeyboardAssist: () => (/* binding */ startKeyboardAssist),
/* harmony export */   trackViewportChanges: () => (/* binding */ trackViewportChanges)
/* harmony export */ });
/* harmony import */ var _keyboard_CUw4ekVy_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./keyboard-CUw4ekVy.js */ 2954);
/* harmony import */ var _capacitor_CFERIeaU_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./capacitor-CFERIeaU.js */ 5051);
/* harmony import */ var _index_ZjP4CjeZ_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./index-ZjP4CjeZ.js */ 575);
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */



const KEYBOARD_DID_OPEN = 'ionKeyboardDidShow';
const KEYBOARD_DID_CLOSE = 'ionKeyboardDidHide';
const KEYBOARD_THRESHOLD = 150;
// TODO(FW-2832): types
let previousVisualViewport = {};
let currentVisualViewport = {};
let keyboardOpen = false;
/**
 * This is only used for tests
 */
const resetKeyboardAssist = () => {
  previousVisualViewport = {};
  currentVisualViewport = {};
  keyboardOpen = false;
};
const startKeyboardAssist = win => {
  const nativeEngine = _keyboard_CUw4ekVy_js__WEBPACK_IMPORTED_MODULE_0__.K.getEngine();
  /**
   * If the native keyboard plugin is available
   * then we are running in a native environment. As a result
   * we should only listen on the native events instead of
   * using the Visual Viewport as the Ionic webview manipulates
   * how it resizes such that the Visual Viewport API is not
   * reliable here.
   */
  if (nativeEngine) {
    startNativeListeners(win);
  } else {
    if (!win.visualViewport) {
      return;
    }
    currentVisualViewport = copyVisualViewport(win.visualViewport);
    win.visualViewport.onresize = () => {
      trackViewportChanges(win);
      if (keyboardDidOpen() || keyboardDidResize(win)) {
        setKeyboardOpen(win);
      } else if (keyboardDidClose(win)) {
        setKeyboardClose(win);
      }
    };
  }
};
/**
 * Listen for events fired by native keyboard plugin
 * in Capacitor/Cordova so devs only need to listen
 * in one place.
 */
const startNativeListeners = win => {
  win.addEventListener('keyboardDidShow', ev => setKeyboardOpen(win, ev));
  win.addEventListener('keyboardDidHide', () => setKeyboardClose(win));
};
const setKeyboardOpen = (win, ev) => {
  fireKeyboardOpenEvent(win, ev);
  keyboardOpen = true;
};
const setKeyboardClose = win => {
  fireKeyboardCloseEvent(win);
  keyboardOpen = false;
};
/**
 * Returns `true` if the `keyboardOpen` flag is not
 * set, the previous visual viewport width equal the current
 * visual viewport width, and if the scaled difference
 * of the previous visual viewport height minus the current
 * visual viewport height is greater than KEYBOARD_THRESHOLD
 *
 * We need to be able to accommodate users who have zooming
 * enabled in their browser (or have zoomed in manually) which
 * is why we take into account the current visual viewport's
 * scale value.
 */
const keyboardDidOpen = () => {
  const scaledHeightDifference = (previousVisualViewport.height - currentVisualViewport.height) * currentVisualViewport.scale;
  return !keyboardOpen && previousVisualViewport.width === currentVisualViewport.width && scaledHeightDifference > KEYBOARD_THRESHOLD;
};
/**
 * Returns `true` if the keyboard is open,
 * but the keyboard did not close
 */
const keyboardDidResize = win => {
  return keyboardOpen && !keyboardDidClose(win);
};
/**
 * Determine if the keyboard was closed
 * Returns `true` if the `keyboardOpen` flag is set and
 * the current visual viewport height equals the
 * layout viewport height.
 */
const keyboardDidClose = win => {
  return keyboardOpen && currentVisualViewport.height === win.innerHeight;
};
/**
 * Dispatch a keyboard open event
 */
const fireKeyboardOpenEvent = (win, nativeEv) => {
  const keyboardHeight = nativeEv ? nativeEv.keyboardHeight : win.innerHeight - currentVisualViewport.height;
  const ev = new CustomEvent(KEYBOARD_DID_OPEN, {
    detail: {
      keyboardHeight
    }
  });
  win.dispatchEvent(ev);
};
/**
 * Dispatch a keyboard close event
 */
const fireKeyboardCloseEvent = win => {
  const ev = new CustomEvent(KEYBOARD_DID_CLOSE);
  win.dispatchEvent(ev);
};
/**
 * Given a window object, create a copy of
 * the current visual and layout viewport states
 * while also preserving the previous visual and
 * layout viewport states
 */
const trackViewportChanges = win => {
  previousVisualViewport = Object.assign({}, currentVisualViewport);
  currentVisualViewport = copyVisualViewport(win.visualViewport);
};
/**
 * Creates a deep copy of the visual viewport
 * at a given state
 */
const copyVisualViewport = visualViewport => {
  return {
    width: Math.round(visualViewport.width),
    height: Math.round(visualViewport.height),
    offsetTop: visualViewport.offsetTop,
    offsetLeft: visualViewport.offsetLeft,
    pageTop: visualViewport.pageTop,
    pageLeft: visualViewport.pageLeft,
    scale: visualViewport.scale
  };
};


/***/ }),

/***/ 2377:
/*!***********************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/lock-controller-B-hirT0v.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   c: () => (/* binding */ createLockController)
/* harmony export */ });
/* harmony import */ var D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js */ 9204);

/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
/**
 * Creates a lock controller.
 *
 * Claiming a lock means that nothing else can acquire the lock until it is released.
 * This can momentarily prevent execution of code that needs to wait for the earlier code to finish.
 * For example, this can be used to prevent multiple transitions from occurring at the same time.
 */
const createLockController = () => {
  let waitPromise;
  /**
   * When lock() is called, the lock is claimed.
   * Once a lock has been claimed, it cannot be claimed again until it is released.
   * When this function gets resolved, the lock is released, allowing it to be claimed again.
   *
   * @example ```tsx
   * const unlock = await this.lockController.lock();
   * // do other stuff
   * unlock();
   * ```
   */
  const lock = /*#__PURE__*/function () {
    var _ref = (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      const p = waitPromise;
      let resolve;
      waitPromise = new Promise(r => resolve = r);
      if (p !== undefined) {
        yield p;
      }
      return resolve;
    });
    return function lock() {
      return _ref.apply(this, arguments);
    };
  }();
  return {
    lock
  };
};


/***/ }),

/***/ 787:
/*!***********************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/spinner-configs-D4RIp70E.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   S: () => (/* binding */ SPINNERS)
/* harmony export */ });
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
const spinners = {
  bubbles: {
    dur: 1000,
    circles: 9,
    fn: (dur, index, total) => {
      const animationDelay = `${dur * index / total - dur}ms`;
      const angle = 2 * Math.PI * index / total;
      return {
        r: 5,
        style: {
          top: `${32 * Math.sin(angle)}%`,
          left: `${32 * Math.cos(angle)}%`,
          'animation-delay': animationDelay
        }
      };
    }
  },
  circles: {
    dur: 1000,
    circles: 8,
    fn: (dur, index, total) => {
      const step = index / total;
      const animationDelay = `${dur * step - dur}ms`;
      const angle = 2 * Math.PI * step;
      return {
        r: 5,
        style: {
          top: `${32 * Math.sin(angle)}%`,
          left: `${32 * Math.cos(angle)}%`,
          'animation-delay': animationDelay
        }
      };
    }
  },
  circular: {
    dur: 1400,
    elmDuration: true,
    circles: 1,
    fn: () => {
      return {
        r: 20,
        cx: 48,
        cy: 48,
        fill: 'none',
        viewBox: '24 24 48 48',
        transform: 'translate(0,0)',
        style: {}
      };
    }
  },
  crescent: {
    dur: 750,
    circles: 1,
    fn: () => {
      return {
        r: 26,
        style: {}
      };
    }
  },
  dots: {
    dur: 750,
    circles: 3,
    fn: (_, index) => {
      const animationDelay = -(110 * index) + 'ms';
      return {
        r: 6,
        style: {
          left: `${32 - 32 * index}%`,
          'animation-delay': animationDelay
        }
      };
    }
  },
  lines: {
    dur: 1000,
    lines: 8,
    fn: (dur, index, total) => {
      const transform = `rotate(${360 / total * index + (index < total / 2 ? 180 : -180)}deg)`;
      const animationDelay = `${dur * index / total - dur}ms`;
      return {
        y1: 14,
        y2: 26,
        style: {
          transform: transform,
          'animation-delay': animationDelay
        }
      };
    }
  },
  'lines-small': {
    dur: 1000,
    lines: 8,
    fn: (dur, index, total) => {
      const transform = `rotate(${360 / total * index + (index < total / 2 ? 180 : -180)}deg)`;
      const animationDelay = `${dur * index / total - dur}ms`;
      return {
        y1: 12,
        y2: 20,
        style: {
          transform: transform,
          'animation-delay': animationDelay
        }
      };
    }
  },
  'lines-sharp': {
    dur: 1000,
    lines: 12,
    fn: (dur, index, total) => {
      const transform = `rotate(${30 * index + (index < 6 ? 180 : -180)}deg)`;
      const animationDelay = `${dur * index / total - dur}ms`;
      return {
        y1: 17,
        y2: 29,
        style: {
          transform: transform,
          'animation-delay': animationDelay
        }
      };
    }
  },
  'lines-sharp-small': {
    dur: 1000,
    lines: 12,
    fn: (dur, index, total) => {
      const transform = `rotate(${30 * index + (index < 6 ? 180 : -180)}deg)`;
      const animationDelay = `${dur * index / total - dur}ms`;
      return {
        y1: 12,
        y2: 20,
        style: {
          transform: transform,
          'animation-delay': animationDelay
        }
      };
    }
  }
};
const SPINNERS = spinners;


/***/ }),

/***/ 4468:
/*!*********************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/watch-options-Dtdm8lKC.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   w: () => (/* binding */ watchForOptions)
/* harmony export */ });
/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
const watchForOptions = (containerEl, tagName, onChange) => {
  if (typeof MutationObserver === 'undefined') {
    return;
  }
  const mutation = new MutationObserver(mutationList => {
    onChange(getSelectedOption(mutationList, tagName));
  });
  mutation.observe(containerEl, {
    childList: true,
    subtree: true
  });
  return mutation;
};
const getSelectedOption = (mutationList, tagName) => {
  let newOption;
  mutationList.forEach(mut => {
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < mut.addedNodes.length; i++) {
      newOption = findCheckedOption(mut.addedNodes[i], tagName) || newOption;
    }
  });
  return newOption;
};
/**
 * The "value" key is only set on some components such as ion-select-option.
 * As a result, we create a default union type of HTMLElement and the "value" key.
 * However, implementers are required to provide the appropriate component type
 * such as HTMLIonSelectOptionElement.
 */
const findCheckedOption = (node, tagName) => {
  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
   * The above check ensures "node" is an Element (nodeType 1).
   */
  if (node.nodeType !== 1) {
    return undefined;
  }
  // HTMLElement inherits from Element, so we cast "el" as T.
  const el = node;
  const options = el.tagName === tagName.toUpperCase() ? [el] : Array.from(el.querySelectorAll(tagName));
  return options.find(o => o.value === el.value);
};


/***/ })

}]);
//# sourceMappingURL=common.js.map