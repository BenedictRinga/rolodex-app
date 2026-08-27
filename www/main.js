(self["webpackChunkapp"] = self["webpackChunkapp"] || []).push([["main"],{

/***/ 4114:
/*!***************************************!*\
  !*** ./src/app/app-routing.module.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AppRoutingModule: () => (/* binding */ AppRoutingModule)
/* harmony export */ });
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/router */ 5072);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ 7580);
var _staticBlock;



const routes = [{
  path: 'home',
  loadChildren: () => __webpack_require__.e(/*! import() */ "src_app_home_home_module_ts").then(__webpack_require__.bind(__webpack_require__, /*! ./home/home.module */ 5055)).then(m => m.HomePageModule)
}, {
  path: '',
  redirectTo: 'home',
  pathMatch: 'full'
}];
class AppRoutingModule {
  static #_ = _staticBlock = () => (this.ɵfac = function AppRoutingModule_Factory(t) {
    return new (t || AppRoutingModule)();
  }, this.ɵmod = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineNgModule"]({
    type: AppRoutingModule
  }), this.ɵinj = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineInjector"]({
    imports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__.RouterModule.forRoot(routes, {
      preloadingStrategy: _angular_router__WEBPACK_IMPORTED_MODULE_1__.PreloadAllModules
    }), _angular_router__WEBPACK_IMPORTED_MODULE_1__.RouterModule]
  }));
}
_staticBlock();
(function () {
  (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵsetNgModuleScope"](AppRoutingModule, {
    imports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__.RouterModule],
    exports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__.RouterModule]
  });
})();

/***/ }),

/***/ 92:
/*!**********************************!*\
  !*** ./src/app/app.component.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AppComponent: () => (/* binding */ AppComponent)
/* harmony export */ });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/core */ 7580);
/* harmony import */ var _services_translation_translation_service__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./services/translation/translation.service */ 7905);
/* harmony import */ var _services_crash_crash_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./services/crash/crash.service */ 3953);
/* harmony import */ var _ionic_angular__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @ionic/angular */ 1507);
/* harmony import */ var _components_in_app_notifications_in_app_notifications_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./components/in-app-notifications/in-app-notifications.component */ 7335);
var _staticBlock;





class AppComponent {
  constructor(translation,
  // 2026-08-27 CRASH REPORTING: injecting it activates the global window
  // error + unhandled-rejection hooks (self-installing root service).
  crashReporter) {
    // 2026-08-25 DEVICE LANGUAGE: user choice wins, otherwise auto-detect
    // the device/browser language and switch when we have that locale.
    translation.init();
    void crashReporter;
  }
  static #_ = _staticBlock = () => (this.ɵfac = function AppComponent_Factory(t) {
    return new (t || AppComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_3__["ɵɵdirectiveInject"](_services_translation_translation_service__WEBPACK_IMPORTED_MODULE_0__.TranslationService), _angular_core__WEBPACK_IMPORTED_MODULE_3__["ɵɵdirectiveInject"](_services_crash_crash_service__WEBPACK_IMPORTED_MODULE_1__.CrashReporterService));
  }, this.ɵcmp = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_3__["ɵɵdefineComponent"]({
    type: AppComponent,
    selectors: [["app-root"]],
    decls: 3,
    vars: 0,
    template: function AppComponent_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_3__["ɵɵelementStart"](0, "ion-app");
        _angular_core__WEBPACK_IMPORTED_MODULE_3__["ɵɵelement"](1, "ion-router-outlet")(2, "app-in-app-notifications");
        _angular_core__WEBPACK_IMPORTED_MODULE_3__["ɵɵelementEnd"]();
      }
    },
    dependencies: [_ionic_angular__WEBPACK_IMPORTED_MODULE_4__.IonApp, _ionic_angular__WEBPACK_IMPORTED_MODULE_4__.IonRouterOutlet, _components_in_app_notifications_in_app_notifications_component__WEBPACK_IMPORTED_MODULE_2__.InAppNotificationsComponent],
    styles: ["/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJhcHAuY29tcG9uZW50LnNjc3MifQ== */\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8uL3NyYy9hcHAvYXBwLmNvbXBvbmVudC5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxnS0FBZ0siLCJzb3VyY2VSb290IjoiIn0= */"]
  }));
}
_staticBlock();

/***/ }),

/***/ 635:
/*!*******************************!*\
  !*** ./src/app/app.module.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AppModule: () => (/* binding */ AppModule),
/* harmony export */   HttpLoaderFactory: () => (/* binding */ HttpLoaderFactory)
/* harmony export */ });
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @angular/platform-browser */ 436);
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @angular/router */ 5072);
/* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! @angular/common/http */ 6443);
/* harmony import */ var _ionic_angular__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @ionic/angular */ 4059);
/* harmony import */ var _ionic_angular__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @ionic/angular */ 1507);
/* harmony import */ var _ngx_translate_core__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! @ngx-translate/core */ 852);
/* harmony import */ var _ngx_translate_http_loader__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @ngx-translate/http-loader */ 8952);
/* harmony import */ var _app_component__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./app.component */ 92);
/* harmony import */ var _app_routing_module__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./app-routing.module */ 4114);
/* harmony import */ var _components_in_app_notifications_in_app_notifications_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./components/in-app-notifications/in-app-notifications.component */ 7335);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @angular/core */ 7580);
var _staticBlock;












/** 2026-08-25 Zyppar-style i18n: JSON files in src/assets/i18n/*.json. */
function HttpLoaderFactory(http) {
  return new _ngx_translate_http_loader__WEBPACK_IMPORTED_MODULE_3__.TranslateHttpLoader(http, './assets/i18n/', '.json');
}
class AppModule {
  static #_ = _staticBlock = () => (this.ɵfac = function AppModule_Factory(t) {
    return new (t || AppModule)();
  }, this.ɵmod = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_4__["ɵɵdefineNgModule"]({
    type: AppModule,
    bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_0__.AppComponent]
  }), this.ɵinj = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_4__["ɵɵdefineInjector"]({
    providers: [{
      provide: _angular_router__WEBPACK_IMPORTED_MODULE_5__.RouteReuseStrategy,
      useClass: _ionic_angular__WEBPACK_IMPORTED_MODULE_6__.IonicRouteStrategy
    }],
    imports: [_angular_platform_browser__WEBPACK_IMPORTED_MODULE_7__.BrowserModule, _ionic_angular__WEBPACK_IMPORTED_MODULE_8__.IonicModule.forRoot(), _app_routing_module__WEBPACK_IMPORTED_MODULE_1__.AppRoutingModule, _components_in_app_notifications_in_app_notifications_component__WEBPACK_IMPORTED_MODULE_2__.InAppNotificationsComponent, _angular_common_http__WEBPACK_IMPORTED_MODULE_9__.HttpClientModule, _ngx_translate_core__WEBPACK_IMPORTED_MODULE_10__.TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: _ngx_translate_core__WEBPACK_IMPORTED_MODULE_10__.TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [_angular_common_http__WEBPACK_IMPORTED_MODULE_9__.HttpClient]
      }
    })]
  }));
}
_staticBlock();
(function () {
  (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_4__["ɵɵsetNgModuleScope"](AppModule, {
    declarations: [_app_component__WEBPACK_IMPORTED_MODULE_0__.AppComponent],
    imports: [_angular_platform_browser__WEBPACK_IMPORTED_MODULE_7__.BrowserModule, _ionic_angular__WEBPACK_IMPORTED_MODULE_8__.IonicModule, _app_routing_module__WEBPACK_IMPORTED_MODULE_1__.AppRoutingModule, _components_in_app_notifications_in_app_notifications_component__WEBPACK_IMPORTED_MODULE_2__.InAppNotificationsComponent, _angular_common_http__WEBPACK_IMPORTED_MODULE_9__.HttpClientModule, _ngx_translate_core__WEBPACK_IMPORTED_MODULE_10__.TranslateModule]
  });
})();

/***/ }),

/***/ 7335:
/*!***********************************************************************************!*\
  !*** ./src/app/components/in-app-notifications/in-app-notifications.component.ts ***!
  \***********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   InAppNotificationsComponent: () => (/* binding */ InAppNotificationsComponent)
/* harmony export */ });
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/common */ 316);
/* harmony import */ var _ionic_angular__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @ionic/angular */ 1507);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ 7580);
/* harmony import */ var _services_in_app_notification_in_app_notification_service__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../services/in-app-notification/in-app-notification.service */ 3745);
/* harmony import */ var _services_storage_storage_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../services/storage/storage.service */ 5217);
var _staticBlock;







const _c0 = ["dock"];
const _c1 = (a0, a1) => ({
  left: a0,
  top: a1
});
function InAppNotificationsComponent_div_0_div_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵgetCurrentView"]();
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementStart"](0, "div", 9);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelement"](1, "ion-icon", 10);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementStart"](2, "span", 11);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵtext"](3);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementEnd"]();
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementStart"](4, "ion-button", 12);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵlistener"]("click", function InAppNotificationsComponent_div_0_div_8_Template_ion_button_click_4_listener($event) {
      const n_r4 = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵrestoreView"](_r3).$implicit;
      const ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵnextContext"](2);
      ctx_r1.dismiss(n_r4);
      return _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵresetView"]($event.stopPropagation());
    });
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelement"](5, "ion-icon", 13);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementEnd"]()();
  }
  if (rf & 2) {
    const n_r4 = ctx.$implicit;
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵclassProp"]("error", n_r4.kind === "error")("success", n_r4.kind === "success");
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵadvance"]();
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵproperty"]("name", n_r4.kind === "error" ? "alert-circle-outline" : n_r4.kind === "success" ? "checkmark-circle-outline" : "information-circle-outline");
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵadvance"](2);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵtextInterpolate"](n_r4.message);
  }
}
function InAppNotificationsComponent_div_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵgetCurrentView"]();
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementStart"](0, "div", 2, 0);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵlistener"]("pointerdown", function InAppNotificationsComponent_div_0_Template_div_pointerdown_0_listener($event) {
      _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵrestoreView"](_r1);
      const ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵnextContext"]();
      return _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵresetView"](ctx_r1.onDragStart($event));
    })("pointermove", function InAppNotificationsComponent_div_0_Template_div_pointermove_0_listener($event) {
      _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵrestoreView"](_r1);
      const ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵnextContext"]();
      return _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵresetView"](ctx_r1.onDragMove($event));
    })("pointerup", function InAppNotificationsComponent_div_0_Template_div_pointerup_0_listener($event) {
      _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵrestoreView"](_r1);
      const ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵnextContext"]();
      return _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵresetView"](ctx_r1.onDragEnd($event));
    })("pointercancel", function InAppNotificationsComponent_div_0_Template_div_pointercancel_0_listener($event) {
      _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵrestoreView"](_r1);
      const ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵnextContext"]();
      return _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵresetView"](ctx_r1.onDragEnd($event));
    });
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementStart"](2, "div", 3);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelement"](3, "ion-icon", 4);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementStart"](4, "span", 5);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵtext"](5, "LoopKeeper");
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementEnd"]();
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelement"](6, "ion-icon", 6);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementEnd"]();
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementStart"](7, "div", 7);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵtemplate"](8, InAppNotificationsComponent_div_0_div_8_Template, 6, 6, "div", 8);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵelementEnd"]()();
  }
  if (rf & 2) {
    const ctx_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵnextContext"]();
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵproperty"]("ngStyle", _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵpureFunction2"](2, _c1, ctx_r1.position.x + "px", ctx_r1.position.y + "px"));
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵadvance"](8);
    _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵproperty"]("ngForOf", ctx_r1.notifications);
  }
}
/**
 * 2026-08-18 IN-APP NOTIFICATION DOCK.
 *
 * Ionic-rendered, draggable, dismissible. It defaults to the bottom-right
 * corner and the user drags it by the header to any convenient space; the
 * position lives for the session (component instance).
 */
class InAppNotificationsComponent {
  constructor(service, storage) {
    this.service = service;
    this.storage = storage;
    this.notifications = [];
    this.position = {
      x: 0,
      y: 0
    };
    this.sub = null;
    this.initialized = false;
    this.drag = {
      active: false,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0
    };
  }
  ngOnInit() {
    // Restore the user's chosen corner from the previous session.
    void this.storage.get(InAppNotificationsComponent.POS_KEY).then(saved => {
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        this.position = saved;
        this.initialized = true;
      }
    });
    this.sub = this.service.notifications$.subscribe(list => {
      this.notifications = list;
      if (list.length && !this.initialized) {
        // Let the DOM paint, then land in the bottom-right corner.
        setTimeout(() => this.defaultPosition(), 0);
        this.initialized = true;
      }
    });
  }
  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
  defaultPosition() {
    const el = this.dockEl?.nativeElement;
    const w = el?.offsetWidth || 320;
    const h = el?.offsetHeight || 120;
    this.position.x = Math.max(8, window.innerWidth - w - 16);
    this.position.y = Math.max(8, window.innerHeight - h - 16);
    void this.persistPosition();
  }
  persistPosition() {
    void this.storage.set(InAppNotificationsComponent.POS_KEY, this.position);
  }
  onDragStart(e) {
    // Close buttons must stay tappable, not become drag handles.
    if (e.target.closest('ion-button')) return;
    this.drag = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: this.position.x,
      originY: this.position.y
    };
    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch {/* best effort */}
    e.preventDefault();
  }
  onDragMove(e) {
    if (!this.drag.active) return;
    const el = this.dockEl?.nativeElement;
    const maxX = Math.max(0, window.innerWidth - (el?.offsetWidth || 320));
    const maxY = Math.max(0, window.innerHeight - (el?.offsetHeight || 120));
    this.position.x = Math.min(Math.max(0, this.drag.originX + (e.clientX - this.drag.startX)), maxX);
    this.position.y = Math.min(Math.max(0, this.drag.originY + (e.clientY - this.drag.startY)), maxY);
  }
  onDragEnd(e) {
    if (!this.drag.active) return;
    this.drag.active = false;
    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch {/* best effort */}
    void this.persistPosition();
  }
  dismiss(n) {
    this.service.dismiss(n.id);
  }
  static #_ = _staticBlock = () => (this.POS_KEY = 'rolodex_notify_dock_pos', this.ɵfac = function InAppNotificationsComponent_Factory(t) {
    return new (t || InAppNotificationsComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdirectiveInject"](_services_in_app_notification_in_app_notification_service__WEBPACK_IMPORTED_MODULE_0__.InAppNotificationService), _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdirectiveInject"](_services_storage_storage_service__WEBPACK_IMPORTED_MODULE_1__.StorageService));
  }, this.ɵcmp = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineComponent"]({
    type: InAppNotificationsComponent,
    selectors: [["app-in-app-notifications"]],
    viewQuery: function InAppNotificationsComponent_Query(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵviewQuery"](_c0, 5);
      }
      if (rf & 2) {
        let _t;
        _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵqueryRefresh"](_t = _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵloadQuery"]()) && (ctx.dockEl = _t.first);
      }
    },
    standalone: true,
    features: [_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵStandaloneFeature"]],
    decls: 1,
    vars: 1,
    consts: [["dock", ""], ["class", "notify-dock", 3, "ngStyle", "pointerdown", "pointermove", "pointerup", "pointercancel", 4, "ngIf"], [1, "notify-dock", 3, "pointerdown", "pointermove", "pointerup", "pointercancel", "ngStyle"], [1, "notify-header"], ["name", "notifications-outline", 1, "notify-header-icon"], [1, "notify-title"], ["name", "reorder-two-outline", 1, "notify-grip"], [1, "notify-list"], ["class", "notify-item", 3, "error", "success", 4, "ngFor", "ngForOf"], [1, "notify-item"], [1, "notify-icon", 3, "name"], [1, "notify-msg"], ["fill", "clear", "size", "small", 1, "notify-close", 3, "click"], ["name", "close-outline"]],
    template: function InAppNotificationsComponent_Template(rf, ctx) {
      if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵtemplate"](0, InAppNotificationsComponent_div_0_Template, 9, 5, "div", 1);
      }
      if (rf & 2) {
        _angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵproperty"]("ngIf", ctx.notifications.length);
      }
    },
    dependencies: [_angular_common__WEBPACK_IMPORTED_MODULE_3__.CommonModule, _angular_common__WEBPACK_IMPORTED_MODULE_3__.NgForOf, _angular_common__WEBPACK_IMPORTED_MODULE_3__.NgIf, _angular_common__WEBPACK_IMPORTED_MODULE_3__.NgStyle, _ionic_angular__WEBPACK_IMPORTED_MODULE_4__.IonicModule, _ionic_angular__WEBPACK_IMPORTED_MODULE_4__.IonButton, _ionic_angular__WEBPACK_IMPORTED_MODULE_4__.IonIcon],
    styles: [".notify-dock[_ngcontent-%COMP%] {\n  position: fixed;\n  z-index: 99999;\n  width: min(340px, 100vw - 24px);\n  max-height: min(46vh, 420px);\n  display: flex;\n  flex-direction: column;\n  background: #1b1e2a;\n  color: #e6e8f0;\n  border: 1px solid #2c3040;\n  border-radius: 16px;\n  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);\n  overflow: hidden;\n  touch-action: none;\n  user-select: none;\n  -webkit-user-select: none;\n}\n\n.notify-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 12px;\n  background: #222634;\n  border-bottom: 1px solid #2c3040;\n  cursor: grab;\n}\n\n.notify-header[_ngcontent-%COMP%]:active {\n  cursor: grabbing;\n}\n\n.notify-header-icon[_ngcontent-%COMP%] {\n  color: #f5c542;\n  font-size: 18px;\n}\n\n.notify-title[_ngcontent-%COMP%] {\n  font-size: 12px;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.06em;\n  color: #aab2cc;\n  flex: 1;\n}\n\n.notify-grip[_ngcontent-%COMP%] {\n  color: #6b7390;\n  font-size: 16px;\n}\n\n.notify-list[_ngcontent-%COMP%] {\n  overflow-y: auto;\n  padding: 6px 8px;\n}\n\n.notify-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 4px 8px 8px;\n  border-radius: 10px;\n  font-size: 13px;\n  line-height: 1.4;\n}\n\n.notify-item[_ngcontent-%COMP%]    + .notify-item[_ngcontent-%COMP%] {\n  border-top: 1px solid #262b3a;\n}\n\n.notify-icon[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  color: #58a6ff;\n  font-size: 18px;\n}\n\n.notify-item.success[_ngcontent-%COMP%]   .notify-icon[_ngcontent-%COMP%] {\n  color: #3fb950;\n}\n\n.notify-item.error[_ngcontent-%COMP%]   .notify-icon[_ngcontent-%COMP%] {\n  color: #f85149;\n}\n\n.notify-msg[_ngcontent-%COMP%] {\n  flex: 1;\n  color: #e6e8f0;\n}\n\n.notify-close[_ngcontent-%COMP%] {\n  --padding-start: 4px;\n  --padding-end: 4px;\n  margin: 0;\n  color: #8b93b0;\n}\n\n@media (prefers-color-scheme: light) {\n  .notify-dock[_ngcontent-%COMP%] {\n    background: #ffffff;\n    color: #1a1d27;\n    border-color: #e2e5ee;\n    box-shadow: 0 12px 36px rgba(20, 24, 40, 0.18);\n  }\n  .notify-header[_ngcontent-%COMP%] {\n    background: #f6f7fb;\n    border-bottom-color: #e2e5ee;\n  }\n  .notify-title[_ngcontent-%COMP%] {\n    color: #4a5068;\n  }\n  .notify-grip[_ngcontent-%COMP%] {\n    color: #a0a6bd;\n  }\n  .notify-item[_ngcontent-%COMP%]    + .notify-item[_ngcontent-%COMP%] {\n    border-top-color: #eceef4;\n  }\n  .notify-msg[_ngcontent-%COMP%] {\n    color: #1a1d27;\n  }\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluLWFwcC1ub3RpZmljYXRpb25zLmNvbXBvbmVudC5zY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0VBQ0UsZUFBQTtFQUNBLGNBQUE7RUFDQSwrQkFBQTtFQUNBLDRCQUFBO0VBQ0EsYUFBQTtFQUNBLHNCQUFBO0VBQ0EsbUJBQUE7RUFDQSxjQUFBO0VBQ0EseUJBQUE7RUFDQSxtQkFBQTtFQUNBLDJDQUFBO0VBQ0EsZ0JBQUE7RUFDQSxrQkFBQTtFQUNBLGlCQUFBO0VBQ0EseUJBQUE7QUFDRjs7QUFFQTtFQUNFLGFBQUE7RUFDQSxtQkFBQTtFQUNBLFFBQUE7RUFDQSxrQkFBQTtFQUNBLG1CQUFBO0VBQ0EsZ0NBQUE7RUFDQSxZQUFBO0FBQ0Y7O0FBRUE7RUFDRSxnQkFBQTtBQUNGOztBQUVBO0VBQ0UsY0FBQTtFQUNBLGVBQUE7QUFDRjs7QUFFQTtFQUNFLGVBQUE7RUFDQSxnQkFBQTtFQUNBLHlCQUFBO0VBQ0Esc0JBQUE7RUFDQSxjQUFBO0VBQ0EsT0FBQTtBQUNGOztBQUVBO0VBQ0UsY0FBQTtFQUNBLGVBQUE7QUFDRjs7QUFFQTtFQUNFLGdCQUFBO0VBQ0EsZ0JBQUE7QUFDRjs7QUFFQTtFQUNFLGFBQUE7RUFDQSxtQkFBQTtFQUNBLFFBQUE7RUFDQSx3QkFBQTtFQUNBLG1CQUFBO0VBQ0EsZUFBQTtFQUNBLGdCQUFBO0FBQ0Y7O0FBRUE7RUFDRSw2QkFBQTtBQUNGOztBQUVBO0VBQ0UsY0FBQTtFQUNBLGNBQUE7RUFDQSxlQUFBO0FBQ0Y7O0FBRUE7RUFDRSxjQUFBO0FBQ0Y7O0FBRUE7RUFDRSxjQUFBO0FBQ0Y7O0FBRUE7RUFDRSxPQUFBO0VBQ0EsY0FBQTtBQUNGOztBQUVBO0VBQ0Usb0JBQUE7RUFDQSxrQkFBQTtFQUNBLFNBQUE7RUFDQSxjQUFBO0FBQ0Y7O0FBRUE7RUFDRTtJQUNFLG1CQUFBO0lBQ0EsY0FBQTtJQUNBLHFCQUFBO0lBQ0EsOENBQUE7RUFDRjtFQUVBO0lBQ0UsbUJBQUE7SUFDQSw0QkFBQTtFQUFGO0VBR0E7SUFDRSxjQUFBO0VBREY7RUFJQTtJQUNFLGNBQUE7RUFGRjtFQUtBO0lBQ0UseUJBQUE7RUFIRjtFQU1BO0lBQ0UsY0FBQTtFQUpGO0FBQ0YiLCJmaWxlIjoiaW4tYXBwLW5vdGlmaWNhdGlvbnMuY29tcG9uZW50LnNjc3MiLCJzb3VyY2VzQ29udGVudCI6WyIubm90aWZ5LWRvY2sge1xuICBwb3NpdGlvbjogZml4ZWQ7XG4gIHotaW5kZXg6IDk5OTk5O1xuICB3aWR0aDogbWluKDM0MHB4LCBjYWxjKDEwMHZ3IC0gMjRweCkpO1xuICBtYXgtaGVpZ2h0OiBtaW4oNDZ2aCwgNDIwcHgpO1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBiYWNrZ3JvdW5kOiAjMWIxZTJhO1xuICBjb2xvcjogI2U2ZThmMDtcbiAgYm9yZGVyOiAxcHggc29saWQgIzJjMzA0MDtcbiAgYm9yZGVyLXJhZGl1czogMTZweDtcbiAgYm94LXNoYWRvdzogMCAxMnB4IDQwcHggcmdiYSgwLCAwLCAwLCAwLjQ1KTtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgdG91Y2gtYWN0aW9uOiBub25lO1xuICB1c2VyLXNlbGVjdDogbm9uZTtcbiAgLXdlYmtpdC11c2VyLXNlbGVjdDogbm9uZTtcbn1cblxuLm5vdGlmeS1oZWFkZXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBnYXA6IDhweDtcbiAgcGFkZGluZzogMTBweCAxMnB4O1xuICBiYWNrZ3JvdW5kOiAjMjIyNjM0O1xuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzJjMzA0MDtcbiAgY3Vyc29yOiBncmFiO1xufVxuXG4ubm90aWZ5LWhlYWRlcjphY3RpdmUge1xuICBjdXJzb3I6IGdyYWJiaW5nO1xufVxuXG4ubm90aWZ5LWhlYWRlci1pY29uIHtcbiAgY29sb3I6ICNmNWM1NDI7XG4gIGZvbnQtc2l6ZTogMThweDtcbn1cblxuLm5vdGlmeS10aXRsZSB7XG4gIGZvbnQtc2l6ZTogMTJweDtcbiAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgbGV0dGVyLXNwYWNpbmc6IDAuMDZlbTtcbiAgY29sb3I6ICNhYWIyY2M7XG4gIGZsZXg6IDE7XG59XG5cbi5ub3RpZnktZ3JpcCB7XG4gIGNvbG9yOiAjNmI3MzkwO1xuICBmb250LXNpemU6IDE2cHg7XG59XG5cbi5ub3RpZnktbGlzdCB7XG4gIG92ZXJmbG93LXk6IGF1dG87XG4gIHBhZGRpbmc6IDZweCA4cHg7XG59XG5cbi5ub3RpZnktaXRlbSB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGdhcDogOHB4O1xuICBwYWRkaW5nOiA4cHggNHB4IDhweCA4cHg7XG4gIGJvcmRlci1yYWRpdXM6IDEwcHg7XG4gIGZvbnQtc2l6ZTogMTNweDtcbiAgbGluZS1oZWlnaHQ6IDEuNDtcbn1cblxuLm5vdGlmeS1pdGVtICsgLm5vdGlmeS1pdGVtIHtcbiAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICMyNjJiM2E7XG59XG5cbi5ub3RpZnktaWNvbiB7XG4gIGZsZXgtc2hyaW5rOiAwO1xuICBjb2xvcjogIzU4YTZmZjtcbiAgZm9udC1zaXplOiAxOHB4O1xufVxuXG4ubm90aWZ5LWl0ZW0uc3VjY2VzcyAubm90aWZ5LWljb24ge1xuICBjb2xvcjogIzNmYjk1MDtcbn1cblxuLm5vdGlmeS1pdGVtLmVycm9yIC5ub3RpZnktaWNvbiB7XG4gIGNvbG9yOiAjZjg1MTQ5O1xufVxuXG4ubm90aWZ5LW1zZyB7XG4gIGZsZXg6IDE7XG4gIGNvbG9yOiAjZTZlOGYwO1xufVxuXG4ubm90aWZ5LWNsb3NlIHtcbiAgLS1wYWRkaW5nLXN0YXJ0OiA0cHg7XG4gIC0tcGFkZGluZy1lbmQ6IDRweDtcbiAgbWFyZ2luOiAwO1xuICBjb2xvcjogIzhiOTNiMDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogbGlnaHQpIHtcbiAgLm5vdGlmeS1kb2NrIHtcbiAgICBiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuICAgIGNvbG9yOiAjMWExZDI3O1xuICAgIGJvcmRlci1jb2xvcjogI2UyZTVlZTtcbiAgICBib3gtc2hhZG93OiAwIDEycHggMzZweCByZ2JhKDIwLCAyNCwgNDAsIDAuMTgpO1xuICB9XG5cbiAgLm5vdGlmeS1oZWFkZXIge1xuICAgIGJhY2tncm91bmQ6ICNmNmY3ZmI7XG4gICAgYm9yZGVyLWJvdHRvbS1jb2xvcjogI2UyZTVlZTtcbiAgfVxuXG4gIC5ub3RpZnktdGl0bGUge1xuICAgIGNvbG9yOiAjNGE1MDY4O1xuICB9XG5cbiAgLm5vdGlmeS1ncmlwIHtcbiAgICBjb2xvcjogI2EwYTZiZDtcbiAgfVxuXG4gIC5ub3RpZnktaXRlbSArIC5ub3RpZnktaXRlbSB7XG4gICAgYm9yZGVyLXRvcC1jb2xvcjogI2VjZWVmNDtcbiAgfVxuXG4gIC5ub3RpZnktbXNnIHtcbiAgICBjb2xvcjogIzFhMWQyNztcbiAgfVxufVxuIl19 */\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8uL3NyYy9hcHAvY29tcG9uZW50cy9pbi1hcHAtbm90aWZpY2F0aW9ucy9pbi1hcHAtbm90aWZpY2F0aW9ucy5jb21wb25lbnQuc2NzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUNFLGVBQUE7RUFDQSxjQUFBO0VBQ0EsK0JBQUE7RUFDQSw0QkFBQTtFQUNBLGFBQUE7RUFDQSxzQkFBQTtFQUNBLG1CQUFBO0VBQ0EsY0FBQTtFQUNBLHlCQUFBO0VBQ0EsbUJBQUE7RUFDQSwyQ0FBQTtFQUNBLGdCQUFBO0VBQ0Esa0JBQUE7RUFDQSxpQkFBQTtFQUNBLHlCQUFBO0FBQ0Y7O0FBRUE7RUFDRSxhQUFBO0VBQ0EsbUJBQUE7RUFDQSxRQUFBO0VBQ0Esa0JBQUE7RUFDQSxtQkFBQTtFQUNBLGdDQUFBO0VBQ0EsWUFBQTtBQUNGOztBQUVBO0VBQ0UsZ0JBQUE7QUFDRjs7QUFFQTtFQUNFLGNBQUE7RUFDQSxlQUFBO0FBQ0Y7O0FBRUE7RUFDRSxlQUFBO0VBQ0EsZ0JBQUE7RUFDQSx5QkFBQTtFQUNBLHNCQUFBO0VBQ0EsY0FBQTtFQUNBLE9BQUE7QUFDRjs7QUFFQTtFQUNFLGNBQUE7RUFDQSxlQUFBO0FBQ0Y7O0FBRUE7RUFDRSxnQkFBQTtFQUNBLGdCQUFBO0FBQ0Y7O0FBRUE7RUFDRSxhQUFBO0VBQ0EsbUJBQUE7RUFDQSxRQUFBO0VBQ0Esd0JBQUE7RUFDQSxtQkFBQTtFQUNBLGVBQUE7RUFDQSxnQkFBQTtBQUNGOztBQUVBO0VBQ0UsNkJBQUE7QUFDRjs7QUFFQTtFQUNFLGNBQUE7RUFDQSxjQUFBO0VBQ0EsZUFBQTtBQUNGOztBQUVBO0VBQ0UsY0FBQTtBQUNGOztBQUVBO0VBQ0UsY0FBQTtBQUNGOztBQUVBO0VBQ0UsT0FBQTtFQUNBLGNBQUE7QUFDRjs7QUFFQTtFQUNFLG9CQUFBO0VBQ0Esa0JBQUE7RUFDQSxTQUFBO0VBQ0EsY0FBQTtBQUNGOztBQUVBO0VBQ0U7SUFDRSxtQkFBQTtJQUNBLGNBQUE7SUFDQSxxQkFBQTtJQUNBLDhDQUFBO0VBQ0Y7RUFFQTtJQUNFLG1CQUFBO0lBQ0EsNEJBQUE7RUFBRjtFQUdBO0lBQ0UsY0FBQTtFQURGO0VBSUE7SUFDRSxjQUFBO0VBRkY7RUFLQTtJQUNFLHlCQUFBO0VBSEY7RUFNQTtJQUNFLGNBQUE7RUFKRjtBQUNGO0FBQ0EsZ29JQUFnb0kiLCJzb3VyY2VzQ29udGVudCI6WyIubm90aWZ5LWRvY2sge1xuICBwb3NpdGlvbjogZml4ZWQ7XG4gIHotaW5kZXg6IDk5OTk5O1xuICB3aWR0aDogbWluKDM0MHB4LCBjYWxjKDEwMHZ3IC0gMjRweCkpO1xuICBtYXgtaGVpZ2h0OiBtaW4oNDZ2aCwgNDIwcHgpO1xuICBkaXNwbGF5OiBmbGV4O1xuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICBiYWNrZ3JvdW5kOiAjMWIxZTJhO1xuICBjb2xvcjogI2U2ZThmMDtcbiAgYm9yZGVyOiAxcHggc29saWQgIzJjMzA0MDtcbiAgYm9yZGVyLXJhZGl1czogMTZweDtcbiAgYm94LXNoYWRvdzogMCAxMnB4IDQwcHggcmdiYSgwLCAwLCAwLCAwLjQ1KTtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgdG91Y2gtYWN0aW9uOiBub25lO1xuICB1c2VyLXNlbGVjdDogbm9uZTtcbiAgLXdlYmtpdC11c2VyLXNlbGVjdDogbm9uZTtcbn1cblxuLm5vdGlmeS1oZWFkZXIge1xuICBkaXNwbGF5OiBmbGV4O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBnYXA6IDhweDtcbiAgcGFkZGluZzogMTBweCAxMnB4O1xuICBiYWNrZ3JvdW5kOiAjMjIyNjM0O1xuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzJjMzA0MDtcbiAgY3Vyc29yOiBncmFiO1xufVxuXG4ubm90aWZ5LWhlYWRlcjphY3RpdmUge1xuICBjdXJzb3I6IGdyYWJiaW5nO1xufVxuXG4ubm90aWZ5LWhlYWRlci1pY29uIHtcbiAgY29sb3I6ICNmNWM1NDI7XG4gIGZvbnQtc2l6ZTogMThweDtcbn1cblxuLm5vdGlmeS10aXRsZSB7XG4gIGZvbnQtc2l6ZTogMTJweDtcbiAgZm9udC13ZWlnaHQ6IDYwMDtcbiAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbiAgbGV0dGVyLXNwYWNpbmc6IDAuMDZlbTtcbiAgY29sb3I6ICNhYWIyY2M7XG4gIGZsZXg6IDE7XG59XG5cbi5ub3RpZnktZ3JpcCB7XG4gIGNvbG9yOiAjNmI3MzkwO1xuICBmb250LXNpemU6IDE2cHg7XG59XG5cbi5ub3RpZnktbGlzdCB7XG4gIG92ZXJmbG93LXk6IGF1dG87XG4gIHBhZGRpbmc6IDZweCA4cHg7XG59XG5cbi5ub3RpZnktaXRlbSB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGdhcDogOHB4O1xuICBwYWRkaW5nOiA4cHggNHB4IDhweCA4cHg7XG4gIGJvcmRlci1yYWRpdXM6IDEwcHg7XG4gIGZvbnQtc2l6ZTogMTNweDtcbiAgbGluZS1oZWlnaHQ6IDEuNDtcbn1cblxuLm5vdGlmeS1pdGVtICsgLm5vdGlmeS1pdGVtIHtcbiAgYm9yZGVyLXRvcDogMXB4IHNvbGlkICMyNjJiM2E7XG59XG5cbi5ub3RpZnktaWNvbiB7XG4gIGZsZXgtc2hyaW5rOiAwO1xuICBjb2xvcjogIzU4YTZmZjtcbiAgZm9udC1zaXplOiAxOHB4O1xufVxuXG4ubm90aWZ5LWl0ZW0uc3VjY2VzcyAubm90aWZ5LWljb24ge1xuICBjb2xvcjogIzNmYjk1MDtcbn1cblxuLm5vdGlmeS1pdGVtLmVycm9yIC5ub3RpZnktaWNvbiB7XG4gIGNvbG9yOiAjZjg1MTQ5O1xufVxuXG4ubm90aWZ5LW1zZyB7XG4gIGZsZXg6IDE7XG4gIGNvbG9yOiAjZTZlOGYwO1xufVxuXG4ubm90aWZ5LWNsb3NlIHtcbiAgLS1wYWRkaW5nLXN0YXJ0OiA0cHg7XG4gIC0tcGFkZGluZy1lbmQ6IDRweDtcbiAgbWFyZ2luOiAwO1xuICBjb2xvcjogIzhiOTNiMDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogbGlnaHQpIHtcbiAgLm5vdGlmeS1kb2NrIHtcbiAgICBiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuICAgIGNvbG9yOiAjMWExZDI3O1xuICAgIGJvcmRlci1jb2xvcjogI2UyZTVlZTtcbiAgICBib3gtc2hhZG93OiAwIDEycHggMzZweCByZ2JhKDIwLCAyNCwgNDAsIDAuMTgpO1xuICB9XG5cbiAgLm5vdGlmeS1oZWFkZXIge1xuICAgIGJhY2tncm91bmQ6ICNmNmY3ZmI7XG4gICAgYm9yZGVyLWJvdHRvbS1jb2xvcjogI2UyZTVlZTtcbiAgfVxuXG4gIC5ub3RpZnktdGl0bGUge1xuICAgIGNvbG9yOiAjNGE1MDY4O1xuICB9XG5cbiAgLm5vdGlmeS1ncmlwIHtcbiAgICBjb2xvcjogI2EwYTZiZDtcbiAgfVxuXG4gIC5ub3RpZnktaXRlbSArIC5ub3RpZnktaXRlbSB7XG4gICAgYm9yZGVyLXRvcC1jb2xvcjogI2VjZWVmNDtcbiAgfVxuXG4gIC5ub3RpZnktbXNnIHtcbiAgICBjb2xvcjogIzFhMWQyNztcbiAgfVxufVxuIl0sInNvdXJjZVJvb3QiOiIifQ== */"]
  }));
}
_staticBlock();

/***/ }),

/***/ 3953:
/*!*************************************************!*\
  !*** ./src/app/services/crash/crash.service.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CrashReporterService: () => (/* binding */ CrashReporterService)
/* harmony export */ });
/* harmony import */ var D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js */ 9204);
/* harmony import */ var _capacitor_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @capacitor/core */ 4070);
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../environments/environment */ 5312);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @angular/core */ 7580);
/* harmony import */ var _network_network_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../network/network.service */ 8501);
/* harmony import */ var _storage_storage_service__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../storage/storage.service */ 5217);

var _staticBlock;





class CrashReporterService {
  constructor(network, storage) {
    this.network = network;
    this.storage = storage;
    this.queue = [];
    this.timer = null;
    this.draining = false;
    this.consented = null; // null = not yet resolved
    if (typeof window === 'undefined' || window.__loopkeeperCrashWired) return;
    window.__loopkeeperCrashWired = true;
    window.addEventListener('error', ev => {
      this.record('error', ev?.message, ev?.error);
    });
    window.addEventListener('unhandledrejection', ev => {
      const r = ev?.reason;
      this.record('unhandledrejection', typeof r === 'string' ? r : r?.message || String(r ?? 'unknown rejection'), r instanceof Error ? r : undefined);
    });
    // Flush when the page goes away — last chance before the WebView dies.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void this.flush();
    });
    window.addEventListener('pagehide', () => {
      void this.flush();
    });
    this.timer = setInterval(() => {
      void this.flush();
    }, 30_000);
  }
  /** Resolve + cache the analytics consent flag once per session. */
  isConsented() {
    var _this = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      if (_this.consented !== null) return _this.consented;
      try {
        const stored = yield _this.storage.get('loopkeeper_analytics_enabled');
        _this.consented = stored !== false && stored !== 'false';
      } catch {
        _this.consented = true; // fail-open like AnalyticsService default-on
      }
      return _this.consented;
    })();
  }
  record(type, message, error) {
    if (!message && !error) return;
    // Never report our own HTTP failures from reporting itself, or benign aborts.
    const msg = String(message || '').slice(0, 500);
    if (/AbortError|NetworkError|Failed to fetch/i.test(msg)) return;
    if (this.queue.length >= CrashReporterService.MAX_QUEUE) this.queue.shift();
    let stack = '';
    if (error instanceof Error) stack = String(error.stack || '').slice(0, 2000);
    this.queue.push({
      ts: Date.now(),
      type,
      msg,
      stack,
      ver: `${_environments_environment__WEBPACK_IMPORTED_MODULE_2__.environment.version || ''}/b${_environments_environment__WEBPACK_IMPORTED_MODULE_2__.environment.build}`,
      plat: _capacitor_core__WEBPACK_IMPORTED_MODULE_1__.Capacitor.isNativePlatform() ? `native:${_capacitor_core__WEBPACK_IMPORTED_MODULE_1__.Capacitor.getPlatform()}` : 'web',
      lang: typeof navigator !== 'undefined' && navigator.language || '',
      page: this.safePage(),
      ua: typeof navigator !== 'undefined' && navigator.userAgent || ''
    });
  }
  /** PATH ONLY — strip any ?query (invite tokens must never be reported). */
  safePage() {
    try {
      return window.location.pathname.slice(0, 120);
    } catch {
      return '';
    }
  }
  flush() {
    var _this2 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      if (_this2.draining || !_this2.queue.length || !_this2.network.isOnline()) return;
      if (!(yield _this2.isConsented())) {
        _this2.queue.length = 0;
        return;
      }
      // Also send anything persisted from a previous session first.
      let backlog = [];
      try {
        const stored = yield _this2.storage.get(CrashReporterService.QUEUE_KEY);
        if (Array.isArray(stored)) backlog = stored;
      } catch {/* ignore */}
      const batch = [...backlog, ..._this2.queue].slice(-40); // cap request size
      if (!batch.length) return;
      _this2.draining = true;
      try {
        const res = yield _this2.network.safeFetch(`${_environments_environment__WEBPACK_IMPORTED_MODULE_2__.environment.rolodexApiBase}/crashes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            events: batch
          })
        }, {
          timeoutMs: 10000
        });
        if (res && res.ok) {
          _this2.queue.length = 0;
          yield _this2.storage.remove(CrashReporterService.QUEUE_KEY);
        } else {
          // Offline/intake down: persist merged backlog, retry next cycle.
          _this2.queue.length = 0;
          yield _this2.storage.set(CrashReporterService.QUEUE_KEY, batch);
        }
      } finally {
        _this2.draining = false;
      }
    })();
  }
  static #_ = _staticBlock = () => (this.QUEUE_KEY = 'loopkeeper_crash_queue', this.MAX_QUEUE = 60, this.ɵfac = function CrashReporterService_Factory(t) {
    return new (t || CrashReporterService)(_angular_core__WEBPACK_IMPORTED_MODULE_5__["ɵɵinject"](_network_network_service__WEBPACK_IMPORTED_MODULE_3__.NetworkService), _angular_core__WEBPACK_IMPORTED_MODULE_5__["ɵɵinject"](_storage_storage_service__WEBPACK_IMPORTED_MODULE_4__.StorageService));
  }, this.ɵprov = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_5__["ɵɵdefineInjectable"]({
    token: CrashReporterService,
    factory: CrashReporterService.ɵfac,
    providedIn: 'root'
  }));
}
_staticBlock();

/***/ }),

/***/ 3745:
/*!*****************************************************************************!*\
  !*** ./src/app/services/in-app-notification/in-app-notification.service.ts ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   InAppNotificationService: () => (/* binding */ InAppNotificationService)
/* harmony export */ });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ 5797);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ 7580);
var _staticBlock;


class InAppNotificationService {
  constructor() {
    this.notifications = [];
    this.subject = new rxjs__WEBPACK_IMPORTED_MODULE_0__.BehaviorSubject([]);
    this.nextId = 1;
    this.timers = new Map();
    this.notifications$ = this.subject.asObservable();
  }
  notify(message, opts) {
    const id = this.nextId++;
    const notification = {
      id,
      message,
      kind: opts?.kind || 'info',
      duration: opts?.duration ?? 3500
    };
    this.notifications = [...this.notifications, notification];
    this.subject.next(this.notifications);
    if (notification.duration > 0) {
      const timer = setTimeout(() => this.dismiss(id), notification.duration);
      this.timers.set(id, timer);
    }
    return id;
  }
  dismiss(id) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.subject.next(this.notifications);
  }
  clear() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.notifications = [];
    this.subject.next([]);
  }
  static #_ = _staticBlock = () => (this.ɵfac = function InAppNotificationService_Factory(t) {
    return new (t || InAppNotificationService)();
  }, this.ɵprov = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjectable"]({
    token: InAppNotificationService,
    factory: InAppNotificationService.ɵfac,
    providedIn: 'root'
  }));
}
_staticBlock();

/***/ }),

/***/ 8501:
/*!*****************************************************!*\
  !*** ./src/app/services/network/network.service.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NetworkService: () => (/* binding */ NetworkService)
/* harmony export */ });
/* harmony import */ var D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js */ 9204);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ 7580);

var _staticBlock;

/**
 * 2026-08-24 NETWORK SERVICE — one quiet door for every background fetch.
 *
 * Why: poll calls (update checks, AI status, investor summary) were throwing
 * raw `net::ERR_NETWORK_CHANGED` / offline rejections into the console. The
 * browser devtools will still list failed requests, but the app no longer
 * turns those into unhandled rejections, retry storms, or console noise.
 *
 * Rules:
 * - safeFetch() never throws for offline / aborted / network-changed.
 * - It returns null so callers can fall back quietly.
 * - It skips immediately when navigator.onLine is false.
 * - A timeout aborts hung requests (default 12s, override per call).
 */
class NetworkService {
  isOnline() {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }
  safeFetch(input, init, opts) {
    var _this = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      if (!_this.isOnline()) return null;
      const timeoutMs = opts?.timeoutMs ?? 12000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return yield fetch(input, {
          ...(init || {}),
          signal: controller.signal
        });
      } catch {
        // Offline, network changed, aborted, or server unreachable — silent.
        return null;
      } finally {
        clearTimeout(timer);
      }
    })();
  }
  static #_ = _staticBlock = () => (this.ɵfac = function NetworkService_Factory(t) {
    return new (t || NetworkService)();
  }, this.ɵprov = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjectable"]({
    token: NetworkService,
    factory: NetworkService.ɵfac,
    providedIn: 'root'
  }));
}
_staticBlock();

/***/ }),

/***/ 5217:
/*!*****************************************************!*\
  !*** ./src/app/services/storage/storage.service.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StorageService: () => (/* binding */ StorageService)
/* harmony export */ });
/* harmony import */ var D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js */ 9204);
/* harmony import */ var _capacitor_preferences__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @capacitor/preferences */ 6493);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ 7580);

var _staticBlock;


// ---------------------------------------------------------------------------
// 2026-08-18 THE ROLODEX STORAGE - a SEQUENCED ARRAY of media, no single
// point of loss (and no direct localStorage):
//
//   1. MEMORY CACHE   - the hot sync layer (fastest reads, served first).
//   2. INDEXEDDB      - the PRIMARY persistent medium (hundreds of MB,
//                       async, survives app updates and browser churn).
//   3. CAPACITOR
//      PREFERENCES    - the native backup tier (Android/iOS only - the
//                       native Key-Value store; the web tier is skipped so
//                       localStorage never leaks in through a side door).
//
// Every write cascades memory -> IndexedDB -> (native) Preferences; every
// read walks memory -> IndexedDB -> (native) Preferences -> null. If a
// medium fails, the next one in the sequence still holds the data - the
// classic priority/backup cascade, sequenced as an array.
// ---------------------------------------------------------------------------
class StorageService {
  constructor() {
    this.dbName = 'rolodex';
    this.storeName = 'kv';
    this.db = null;
    this.dbPromise = null;
    this.memory = new Map();
    this.hydrated = false;
    this.nativePrefs = false;
    try {
      this.nativePrefs = !!_capacitor_preferences__WEBPACK_IMPORTED_MODULE_1__.Preferences?.set && typeof window?.Capacitor?.isNativePlatform === 'function' ? window.Capacitor.isNativePlatform() : false;
    } catch {
      this.nativePrefs = false;
    }
    void this.hydrate();
  }
  /** The native backup tier (Capacitor Preferences, Android/iOS only). */
  prefsGet(key) {
    var _this = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      if (!_this.nativePrefs) return null;
      try {
        const {
          value
        } = yield _capacitor_preferences__WEBPACK_IMPORTED_MODULE_1__.Preferences.get({
          key
        });
        return value ?? null;
      } catch {
        return null;
      }
    })();
  }
  prefsSet(key, value) {
    var _this2 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      if (!_this2.nativePrefs) return;
      try {
        yield _capacitor_preferences__WEBPACK_IMPORTED_MODULE_1__.Preferences.set({
          key,
          value
        });
      } catch {
        /* the primary tiers still hold the data */
      }
    })();
  }
  // ===== IndexedDB plumbing =================================================
  open() {
    var _this3 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      if (_this3.db) return _this3.db;
      if (_this3.dbPromise) return _this3.dbPromise;
      _this3.dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('indexedDB unavailable'));
          return;
        }
        try {
          const req = indexedDB.open(_this3.dbName, 1);
          req.onupgradeneeded = () => {
            const d = req.result;
            if (!d.objectStoreNames.contains(_this3.storeName)) {
              d.createObjectStore(_this3.storeName, {
                keyPath: 'k'
              });
            }
          };
          req.onsuccess = () => {
            _this3.db = req.result;
            resolve(req.result);
          };
          req.onerror = () => reject(req.error || new Error('indexedDB open failed'));
        } catch (e) {
          reject(e);
        }
      });
      return _this3.dbPromise;
    })();
  }
  /** Load every persisted entry into the sync memory cache (once). */
  hydrate() {
    var _this4 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      if (_this4.hydrated) return;
      try {
        const db = yield _this4.open();
        const all = yield new Promise((resolve, reject) => {
          const tx = db.transaction(_this4.storeName, 'readonly');
          const req = tx.objectStore(_this4.storeName).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error || new Error('hydrate failed'));
        });
        for (const row of all) _this4.memory.set(row.k, row.v);
      } catch {
        /* memory-only mode */
      }
      _this4.hydrated = true;
    })();
  }
  ensureHydrated() {
    var _this5 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      if (!_this5.hydrated) yield _this5.hydrate();
    })();
  }
  idbPut(k, v) {
    var _this6 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      try {
        const db = yield _this6.open();
        yield new Promise((resolve, reject) => {
          const tx = db.transaction(_this6.storeName, 'readwrite');
          tx.objectStore(_this6.storeName).put({
            k,
            v
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error('put failed'));
        });
      } catch {
        /* memory-only */
      }
    })();
  }
  idbDelete(k) {
    var _this7 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      try {
        const db = yield _this7.open();
        yield new Promise((resolve, reject) => {
          const tx = db.transaction(_this7.storeName, 'readwrite');
          tx.objectStore(_this7.storeName).delete(k);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error('delete failed'));
        });
      } catch {
        /* memory-only */
      }
    })();
  }
  idbClear() {
    var _this8 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      try {
        const db = yield _this8.open();
        yield new Promise((resolve, reject) => {
          const tx = db.transaction(_this8.storeName, 'readwrite');
          tx.objectStore(_this8.storeName).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error('clear failed'));
        });
      } catch {
        /* memory-only */
      }
    })();
  }
  idbKeys() {
    var _this9 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      try {
        const db = yield _this9.open();
        return yield new Promise((resolve, reject) => {
          const tx = db.transaction(_this9.storeName, 'readonly');
          const req = tx.objectStore(_this9.storeName).getAllKeys();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error || new Error('keys failed'));
        });
      } catch {
        return [];
      }
    })();
  }
  // ===== Async API ==========================================================
  set(key, value) {
    var _this0 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      const serialized = JSON.stringify(value);
      _this0.memory.set(key, serialized);
      yield _this0.idbPut(key, serialized);
      yield _this0.prefsSet(key, serialized); // the native backup tier (Android/iOS)
    })();
  }
  get(key) {
    var _this1 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      yield _this1.ensureHydrated();
      if (_this1.memory.has(key)) {
        try {
          return JSON.parse(_this1.memory.get(key));
        } catch {
          return null;
        }
      }
      try {
        const db = yield _this1.open();
        const row = yield new Promise((resolve, reject) => {
          const tx = db.transaction(_this1.storeName, 'readonly');
          const req = tx.objectStore(_this1.storeName).get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error || new Error('get failed'));
        });
        if (row) {
          _this1.memory.set(key, row.v);
          try {
            return JSON.parse(row.v);
          } catch {
            return null;
          }
        }
      } catch {
        /* fall through to the backup tier */
      }
      // the native Preferences backup (Android/iOS) - the sequence holds
      const backup = yield _this1.prefsGet(key);
      if (backup !== null) {
        _this1.memory.set(key, backup);
        try {
          return JSON.parse(backup);
        } catch {
          return null;
        }
      }
      return null;
    })();
  }
  remove(key) {
    var _this10 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      _this10.memory.delete(key);
      yield _this10.idbDelete(key);
    })();
  }
  clear() {
    var _this11 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      _this11.memory.clear();
      yield _this11.idbClear();
    })();
  }
  getAllKeys() {
    var _this12 = this;
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      yield _this12.ensureHydrated();
      const memKeys = Array.from(_this12.memory.keys());
      const dbKeys = yield _this12.idbKeys();
      return Array.from(new Set([...memKeys, ...dbKeys]));
    })();
  }
  // ===== Synchronous cache (memory-backed; NEVER localStorage) ==============
  getSync(key) {
    const raw = this.memory.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  setSync(key, value) {
    const serialized = JSON.stringify(value);
    this.memory.set(key, serialized);
    void this.idbPut(key, serialized); // fire-and-forget persistence
  }
  static #_ = _staticBlock = () => (this.ɵfac = function StorageService_Factory(t) {
    return new (t || StorageService)();
  }, this.ɵprov = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineInjectable"]({
    token: StorageService,
    factory: StorageService.ɵfac,
    providedIn: 'root'
  }));
}
_staticBlock();

/***/ }),

/***/ 7905:
/*!*************************************************************!*\
  !*** ./src/app/services/translation/translation.service.ts ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TranslationService: () => (/* binding */ TranslationService)
/* harmony export */ });
/* harmony import */ var D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js */ 9204);
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../environments/environment */ 5312);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ 7580);
/* harmony import */ var _ngx_translate_core__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @ngx-translate/core */ 852);

var _staticBlock;



class TranslationService {
  constructor(translate) {
    this.translate = translate;
    this.languages = [{
      code: 'en',
      label: 'English'
    }, {
      code: 'af',
      label: 'Afrikaans'
    }, {
      code: 'am',
      label: 'Amharic'
    }, {
      code: 'ar',
      label: 'Arabic'
    }, {
      code: 'bs',
      label: 'Bosnian'
    }, {
      code: 'by',
      label: 'Belarusian'
    }, {
      code: 'da',
      label: 'Danish'
    }, {
      code: 'de',
      label: 'German'
    }, {
      code: 'el',
      label: 'Greek'
    }, {
      code: 'en-US',
      label: 'English (US)'
    }, {
      code: 'es',
      label: 'Spanish'
    }, {
      code: 'es-eu',
      label: 'Spanish (EU)'
    }, {
      code: 'fil',
      label: 'Filipino'
    }, {
      code: 'fr',
      label: 'French'
    }, {
      code: 'ha',
      label: 'Hausa'
    }, {
      code: 'he',
      label: 'Hebrew'
    }, {
      code: 'hi',
      label: 'Hindi'
    }, {
      code: 'ig',
      label: 'Igbo'
    }, {
      code: 'it',
      label: 'Italian'
    }, {
      code: 'ja',
      label: 'Japanese'
    }, {
      code: 'nb_NO',
      label: 'Norwegian'
    }, {
      code: 'nl',
      label: 'Dutch'
    }, {
      code: 'om',
      label: 'Oromo'
    }, {
      code: 'pl',
      label: 'Polish'
    }, {
      code: 'pt-PT',
      label: 'Portuguese (EU)'
    }, {
      code: 'pt-br',
      label: 'Portuguese (BR)'
    }, {
      code: 'ru',
      label: 'Russian'
    }, {
      code: 'sk',
      label: 'Slovak'
    }, {
      code: 'sl',
      label: 'Slovenian'
    }, {
      code: 'sn',
      label: 'Shona'
    }, {
      code: 'so',
      label: 'Somali'
    }, {
      code: 'sv',
      label: 'Swedish'
    }, {
      code: 'sw',
      label: 'Swahili'
    }, {
      code: 'th',
      label: 'Thai'
    }, {
      code: 'tr',
      label: 'Turkish'
    }, {
      code: 'ua',
      label: 'Ukrainian'
    }, {
      code: 'yo',
      label: 'Yoruba'
    }, {
      code: 'zh-cmn-Hans',
      label: 'Chinese (Simplified)'
    }, {
      code: 'zh-cmn-Hant',
      label: 'Chinese (Traditional)'
    }];
  }
  /** Boot-time init: user choice wins, otherwise follow the device language. */
  init() {
    const saved = this.getSavedLanguage();
    const lang = saved || this.detectDeviceLanguage();
    void this.translate.use(lang).subscribe(() => this.applyOverrides(lang));
  }
  getSavedLanguage() {
    try {
      return localStorage.getItem(TranslationService.LANG_KEY);
    } catch {
      return null;
    }
  }
  setLanguage(code) {
    try {
      localStorage.setItem(TranslationService.LANG_KEY, code);
    } catch {
      /* storage unavailable — session only */
    }
    void this.translate.use(code).subscribe(() => this.applyOverrides(code));
  }
  /** Map the browser/device language to one of our supported locale files. */
  detectDeviceLanguage() {
    let raw = '';
    try {
      raw = navigator.language || navigator.userLanguage || '';
    } catch {
      raw = '';
    }
    if (!raw) return 'en';
    const lower = raw.toLowerCase().replace('_', '-');
    // Exact file match first.
    if (this.languages.some(l => l.code.toLowerCase() === lower)) {
      return this.languages.find(l => l.code.toLowerCase() === lower).code;
    }
    const base = lower.split('-')[0];
    if (base === 'zh') {
      // Traditional markers → Hant, otherwise Simplified.
      if (/tw|hant|hk/i.test(raw)) return 'zh-cmn-Hant';
      return 'zh-cmn-Hans';
    }
    if (base === 'pt') {
      if (/br/i.test(raw)) return 'pt-br';
      return 'pt-PT';
    }
    if (base === 'en') return 'en';
    const hit = this.languages.find(l => l.code.toLowerCase().startsWith(base));
    return hit ? hit.code : 'en';
  }
  // ── Community aggregation ─────────────────────────────────────────────────
  /** Anonymous submission to the LoopKeeper translation aggregator. */
  submitCommunity(lang, keys) {
    return (0,D_MacBook_noGoogle_rolodex_app_node_modules_babel_runtime_helpers_esm_asyncToGenerator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(function* () {
      try {
        const res = yield fetch(`${_environments_environment__WEBPACK_IMPORTED_MODULE_1__.environment.rolodexApiBase}/translations/contribute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lang,
            keys
          })
        });
        if (!res.ok) return false;
        const data = yield res.json().catch(() => ({}));
        return !!data?.ok;
      } catch {
        return false;
      }
    })();
  }
  // ── User-owned overrides ──────────────────────────────────────────────────
  getOverrides(lang) {
    try {
      const all = JSON.parse(localStorage.getItem(TranslationService.OVERRIDES_KEY) || '{}');
      return all[lang] || {};
    } catch {
      return {};
    }
  }
  saveOverride(lang, key, value) {
    const all = this.getAllOverrides();
    const per = all[lang] || {};
    const trimmed = value.trim();
    if (trimmed && trimmed !== key) {
      per[key] = trimmed;
    } else {
      delete per[key];
    }
    all[lang] = per;
    this.persistOverrides(all);
    this.applyOverrides(lang);
  }
  clearOverride(lang, key) {
    const all = this.getAllOverrides();
    const per = all[lang] || {};
    delete per[key];
    all[lang] = per;
    this.persistOverrides(all);
    this.applyOverrides(lang);
  }
  getAllOverrides() {
    try {
      return JSON.parse(localStorage.getItem(TranslationService.OVERRIDES_KEY) || '{}');
    } catch {
      return {};
    }
  }
  persistOverrides(all) {
    try {
      localStorage.setItem(TranslationService.OVERRIDES_KEY, JSON.stringify(all));
    } catch {
      /* storage unavailable */
    }
  }
  applyOverrides(lang) {
    const overrides = this.getOverrides(lang);
    const entries = Object.entries(overrides);
    if (!entries.length) return;
    const merged = {};
    for (const [k, v] of entries) {
      if (k.startsWith('loopkeeper.')) merged[k] = v;
    }
    if (Object.keys(merged).length) {
      this.translate.setTranslation(lang, merged, true);
    }
  }
  static #_ = _staticBlock = () => (this.LANG_KEY = 'loopkeeper_language', this.OVERRIDES_KEY = 'loopkeeper_translation_overrides', this.ɵfac = function TranslationService_Factory(t) {
    return new (t || TranslationService)(_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵinject"](_ngx_translate_core__WEBPACK_IMPORTED_MODULE_3__.TranslateService));
  }, this.ɵprov = /*@__PURE__*/_angular_core__WEBPACK_IMPORTED_MODULE_2__["ɵɵdefineInjectable"]({
    token: TranslationService,
    factory: TranslationService.ɵfac,
    providedIn: 'root'
  }));
}
_staticBlock();

/***/ }),

/***/ 5312:
/*!*****************************************!*\
  !*** ./src/environments/environment.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   environment: () => (/* binding */ environment)
/* harmony export */ });
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
const environment = {
  production: false,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (server aliases openloop/rolodex).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1',
  // LoopKeeper app version — compared against /api/updates/check
  build: 109 // 2026-08-27 APEX CONSULT + RU/HE: 🩺 consult card on every loop row; full Russian & Hebrew sweeps (366 keys × 39 locales); consult strings for fr/es/de/sw
};
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

/***/ }),

/***/ 4429:
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/platform-browser */ 436);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ 7580);
/* harmony import */ var _app_app_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./app/app.module */ 635);
/* harmony import */ var src_environments_environment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! src/environments/environment */ 5312);




// 2026-08-16 FIX (two parts):
// 1. Bootstrap: platformBrowserDynamic (JIT) on an AOT bundle created the platform
//    through the compiler context — switched to the AOT-static platformBrowser().
// 2. THE REAL BLANK-SCREEN ROOT CAUSE: the production minifier transforms the
//    Injector class's static block into a private static arrow (`static #e = () =>
//    this.ɵprov = ...`) and DROPS its invocation — so Injector.ɵprov, .NULL and
//    .THROW_IF_NOT_FOUND never exist in the minified bundle. Two failures:
//    (a) the tree-shakable 'any' resolution -> "No provider for Injector" at the
//    platform creation; (b) after that's bypassed, `Injector.NULL` is undefined
//    -> component creation crashes. Fix: restore the statics + provide the token
//    explicitly (resolved from the internal INJECTOR token, which the R3Injector
//    always records) — bypassing the broken tree-shakable path entirely.
const INJECTOR_ANY = _angular_core__WEBPACK_IMPORTED_MODULE_2__.Injector;
if (typeof INJECTOR_ANY.NULL === 'undefined') {
  const THROW = Symbol('THROW_IF_NOT_FOUND');
  INJECTOR_ANY.THROW_IF_NOT_FOUND = THROW;
  INJECTOR_ANY.NULL = {
    get(token, notFoundValue) {
      if (notFoundValue === THROW) {
        throw new Error(`NullInjectorError: No provider for ${String(token)}!`);
      }
      return notFoundValue;
    }
  };
  INJECTOR_ANY.__NG_ELEMENT_ID__ = -1;
}
(0,_angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__.platformBrowser)([{
  provide: _angular_core__WEBPACK_IMPORTED_MODULE_2__.Injector,
  useFactory: injector => injector,
  deps: [_angular_core__WEBPACK_IMPORTED_MODULE_2__.INJECTOR]
}]).bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_0__.AppModule).then(() => {
  // 2026-08-20 ZYPPAR-STYLE PWA: register the one service worker so the app
  // becomes installable (manifest + SW with a fetch handler are the Chrome
  // install criteria). The SW is a passthrough; updates clear it fully.
  if (src_environments_environment__WEBPACK_IMPORTED_MODULE_1__.environment.production && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('custom-sw.js').catch(() => {});
    });
  }
}).catch(err => !src_environments_environment__WEBPACK_IMPORTED_MODULE_1__.environment.production && console.log(err));

/***/ }),

/***/ 8996:
/*!******************************************************************************************************************************************!*\
  !*** ./node_modules/@ionic/core/dist/esm/ lazy ^\.\/.*\.entry\.js$ include: \.entry\.js$ exclude: \.system\.entry\.js$ namespace object ***!
  \******************************************************************************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var map = {
	"./ion-accordion_2.entry.js": [
		7518,
		"common",
		"node_modules_ionic_core_dist_esm_ion-accordion_2_entry_js"
	],
	"./ion-action-sheet.entry.js": [
		1981,
		"common",
		"node_modules_ionic_core_dist_esm_ion-action-sheet_entry_js"
	],
	"./ion-alert.entry.js": [
		1603,
		"common",
		"node_modules_ionic_core_dist_esm_ion-alert_entry_js"
	],
	"./ion-app_8.entry.js": [
		2273,
		"common",
		"node_modules_ionic_core_dist_esm_ion-app_8_entry_js"
	],
	"./ion-avatar_3.entry.js": [
		9642,
		"node_modules_ionic_core_dist_esm_ion-avatar_3_entry_js"
	],
	"./ion-back-button.entry.js": [
		2095,
		"common",
		"node_modules_ionic_core_dist_esm_ion-back-button_entry_js"
	],
	"./ion-backdrop.entry.js": [
		2335,
		"node_modules_ionic_core_dist_esm_ion-backdrop_entry_js"
	],
	"./ion-breadcrumb_2.entry.js": [
		8221,
		"common",
		"node_modules_ionic_core_dist_esm_ion-breadcrumb_2_entry_js"
	],
	"./ion-button_2.entry.js": [
		7184,
		"node_modules_ionic_core_dist_esm_ion-button_2_entry_js"
	],
	"./ion-card_5.entry.js": [
		8759,
		"node_modules_ionic_core_dist_esm_ion-card_5_entry_js"
	],
	"./ion-checkbox.entry.js": [
		4248,
		"common",
		"node_modules_ionic_core_dist_esm_ion-checkbox_entry_js"
	],
	"./ion-chip.entry.js": [
		9863,
		"node_modules_ionic_core_dist_esm_ion-chip_entry_js"
	],
	"./ion-col_3.entry.js": [
		1769,
		"node_modules_ionic_core_dist_esm_ion-col_3_entry_js"
	],
	"./ion-datetime-button.entry.js": [
		2569,
		"default-node_modules_ionic_core_dist_esm_format-CAmvpAez_js",
		"node_modules_ionic_core_dist_esm_ion-datetime-button_entry_js"
	],
	"./ion-datetime_3.entry.js": [
		6534,
		"default-node_modules_ionic_core_dist_esm_format-CAmvpAez_js",
		"common",
		"node_modules_ionic_core_dist_esm_ion-datetime_3_entry_js"
	],
	"./ion-fab_3.entry.js": [
		5458,
		"common",
		"node_modules_ionic_core_dist_esm_ion-fab_3_entry_js"
	],
	"./ion-img.entry.js": [
		654,
		"node_modules_ionic_core_dist_esm_ion-img_entry_js"
	],
	"./ion-infinite-scroll_2.entry.js": [
		6034,
		"common",
		"node_modules_ionic_core_dist_esm_ion-infinite-scroll_2_entry_js"
	],
	"./ion-input-otp.entry.js": [
		381,
		"node_modules_ionic_core_dist_esm_ion-input-otp_entry_js"
	],
	"./ion-input-password-toggle.entry.js": [
		5196,
		"common",
		"node_modules_ionic_core_dist_esm_ion-input-password-toggle_entry_js"
	],
	"./ion-input.entry.js": [
		761,
		"default-node_modules_ionic_core_dist_esm_input_utils-Cd23Gdd1_js-node_modules_ionic_core_dist-313a14",
		"common",
		"node_modules_ionic_core_dist_esm_ion-input_entry_js"
	],
	"./ion-item-option_3.entry.js": [
		6492,
		"common",
		"node_modules_ionic_core_dist_esm_ion-item-option_3_entry_js"
	],
	"./ion-item_8.entry.js": [
		9557,
		"common",
		"node_modules_ionic_core_dist_esm_ion-item_8_entry_js"
	],
	"./ion-loading.entry.js": [
		8353,
		"common",
		"node_modules_ionic_core_dist_esm_ion-loading_entry_js"
	],
	"./ion-menu_3.entry.js": [
		1024,
		"common",
		"node_modules_ionic_core_dist_esm_ion-menu_3_entry_js"
	],
	"./ion-modal.entry.js": [
		9160,
		"common",
		"node_modules_ionic_core_dist_esm_ion-modal_entry_js"
	],
	"./ion-nav_2.entry.js": [
		393,
		"node_modules_ionic_core_dist_esm_ion-nav_2_entry_js"
	],
	"./ion-picker-column-option.entry.js": [
		8442,
		"node_modules_ionic_core_dist_esm_ion-picker-column-option_entry_js"
	],
	"./ion-picker-column.entry.js": [
		3110,
		"common",
		"node_modules_ionic_core_dist_esm_ion-picker-column_entry_js"
	],
	"./ion-picker.entry.js": [
		5575,
		"node_modules_ionic_core_dist_esm_ion-picker_entry_js"
	],
	"./ion-popover.entry.js": [
		6772,
		"common",
		"node_modules_ionic_core_dist_esm_ion-popover_entry_js"
	],
	"./ion-progress-bar.entry.js": [
		4810,
		"node_modules_ionic_core_dist_esm_ion-progress-bar_entry_js"
	],
	"./ion-radio_2.entry.js": [
		4639,
		"common",
		"node_modules_ionic_core_dist_esm_ion-radio_2_entry_js"
	],
	"./ion-range.entry.js": [
		628,
		"common",
		"node_modules_ionic_core_dist_esm_ion-range_entry_js"
	],
	"./ion-refresher_2.entry.js": [
		8471,
		"common",
		"node_modules_ionic_core_dist_esm_ion-refresher_2_entry_js"
	],
	"./ion-reorder_2.entry.js": [
		1479,
		"common",
		"node_modules_ionic_core_dist_esm_ion-reorder_2_entry_js"
	],
	"./ion-ripple-effect.entry.js": [
		4065,
		"node_modules_ionic_core_dist_esm_ion-ripple-effect_entry_js"
	],
	"./ion-route_4.entry.js": [
		7971,
		"common",
		"node_modules_ionic_core_dist_esm_ion-route_4_entry_js"
	],
	"./ion-searchbar.entry.js": [
		3184,
		"common",
		"node_modules_ionic_core_dist_esm_ion-searchbar_entry_js"
	],
	"./ion-segment-content.entry.js": [
		4312,
		"node_modules_ionic_core_dist_esm_ion-segment-content_entry_js"
	],
	"./ion-segment-view.entry.js": [
		4540,
		"node_modules_ionic_core_dist_esm_ion-segment-view_entry_js"
	],
	"./ion-segment_2.entry.js": [
		469,
		"node_modules_ionic_core_dist_esm_ion-segment_2_entry_js"
	],
	"./ion-select-modal.entry.js": [
		7101,
		"node_modules_ionic_core_dist_esm_ion-select-modal_entry_js"
	],
	"./ion-select_3.entry.js": [
		3709,
		"common",
		"node_modules_ionic_core_dist_esm_ion-select_3_entry_js"
	],
	"./ion-spinner.entry.js": [
		388,
		"common",
		"node_modules_ionic_core_dist_esm_ion-spinner_entry_js"
	],
	"./ion-split-pane.entry.js": [
		2392,
		"node_modules_ionic_core_dist_esm_ion-split-pane_entry_js"
	],
	"./ion-tab-bar_2.entry.js": [
		6059,
		"common",
		"node_modules_ionic_core_dist_esm_ion-tab-bar_2_entry_js"
	],
	"./ion-tab_2.entry.js": [
		5427,
		"node_modules_ionic_core_dist_esm_ion-tab_2_entry_js"
	],
	"./ion-text.entry.js": [
		198,
		"node_modules_ionic_core_dist_esm_ion-text_entry_js"
	],
	"./ion-textarea.entry.js": [
		1735,
		"default-node_modules_ionic_core_dist_esm_input_utils-Cd23Gdd1_js-node_modules_ionic_core_dist-313a14",
		"node_modules_ionic_core_dist_esm_ion-textarea_entry_js"
	],
	"./ion-toast.entry.js": [
		7510,
		"common",
		"node_modules_ionic_core_dist_esm_ion-toast_entry_js"
	],
	"./ion-toggle.entry.js": [
		5297,
		"common",
		"node_modules_ionic_core_dist_esm_ion-toggle_entry_js"
	]
};
function webpackAsyncContext(req) {
	if(!__webpack_require__.o(map, req)) {
		return Promise.resolve().then(() => {
			var e = new Error("Cannot find module '" + req + "'");
			e.code = 'MODULE_NOT_FOUND';
			throw e;
		});
	}

	var ids = map[req], id = ids[0];
	return Promise.all(ids.slice(1).map(__webpack_require__.e)).then(() => {
		return __webpack_require__(id);
	});
}
webpackAsyncContext.keys = () => (Object.keys(map));
webpackAsyncContext.id = 8996;
module.exports = webpackAsyncContext;

/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ __webpack_require__.O(0, ["vendor"], () => (__webpack_exec__(4429)));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ }
]);
//# sourceMappingURL=main.js.map