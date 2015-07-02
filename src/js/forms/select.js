/**
 * MUI CSS/JS select module
 * @module forms/select
 */

'use strict';


var jqLite = require('../lib/jqLite.js'),
    util = require('../lib/util.js'),
    wrapperClass = 'mui-select',
    cssSelector = '.mui-select > select',
    menuClass = 'mui-select-menu',
    optionHeight = 42,  // from CSS
    menuPadding = 8;  // from CSS


/**
 * Initialize select element.
 * @param {Element} selectEl - The select element.
 */
function initialize(selectEl) {
  // check flag
  if (selectEl._muiSelect === true) return;
  else selectEl._muiSelect = true;

  // initialize element
  new Select(selectEl);
}


/**
 * Creates a new Select object
 * @class
 */
function Select(selectEl) {
  // instance variables
  this.selectEl = selectEl;
  this.wrapperEl = selectEl.parentNode;
  this.useDefault = false;

  // attach event handlers
  jqLite.on(selectEl, 'touchstart', util.callback(this, 'touchstartHandler'));
  jqLite.on(selectEl, 'mousedown', util.callback(this, 'mousedownHandler'));
  jqLite.on(selectEl, 'focus', util.callback(this, 'focusHandler'));
  jqLite.on(selectEl, 'click', util.callback(this, 'clickHandler'));
  
  // make wrapper focusable and fix firefox bug
  this.wrapperEl.tabIndex = -1;
  var callbackFn = util.callback(this, 'wrapperFocusHandler');
  jqLite.on(this.wrapperEl, 'focus', callbackFn);
}


/**
 * Use default on touch devices.
 */
Select.prototype.touchstartHandler = function() {
  // set flag
  this.useDefault = true;
}


/**
 * Disable default dropdown on mousedown.
 * @param {Event} ev - The DOM event
 */
Select.prototype.mousedownHandler = function(ev) {
  if (ev.button !== 0 || this.useDefault === true) return;
  ev.preventDefault();
}


/**
 * Handle focus event on select element.
 * @param {Event} ev - The DOM event
 */
Select.prototype.focusHandler = function(ev) {
  // check flag
  if (this.useDefault === true) return;

  var selectEl = this.selectEl,
      wrapperEl = this.wrapperEl,
      origIndex = selectEl.tabIndex,
      keydownFn = util.callback(this, 'keydownHandler');

  // attach keydown handler
  jqLite.on(document, 'keydown', keydownFn);

  // disable tabfocus once
  selectEl.tabIndex = -1;
  jqLite.one(wrapperEl, 'blur', function() {
    selectEl.tabIndex = origIndex;
    jqLite.off(document, 'keydown', keydownFn);
  });
  
  // defer focus to parent
  wrapperEl.focus();
}


/**
 * Handle keydown events on document
 **/
Select.prototype.keydownHandler = function(ev) {
  // spacebar, down, up
  if (ev.keyCode === 32 || ev.keyCode === 38 || ev.keyCode === 40) {
    // prevent window scroll
    ev.preventDefault();
    
    if (this.selectEl.disabled !== true) this.renderMenu();
  }
}


/**
 * Handle focus event on wrapper element.
 */
Select.prototype.wrapperFocusHandler = function() {
  // firefox bugfix
  if (this.selectEl.disabled) return this.wrapperEl.blur();
}


/**
 * Handle click events on select element.
 * @param {Event} ev - The DOM event
 */
Select.prototype.clickHandler = function(ev) {
  // only left clicks
  if (ev.button !== 0) return;
  this.renderMenu();
}


/**
 * Render options dropdown.
 */
Select.prototype.renderMenu = function() {
  // check and reset flag
  if (this.useDefault === true) return this.useDefault = false;

  new Menu(this.selectEl);
}


/**
 * Creates a new Menu
 * @class
 */
function Menu(selectEl) {
  // instance variables
  this.origIndex = null;
  this.currentIndex = null;
  this.selectEl = selectEl;
  this.menuEl = this._createMenuEl(selectEl);
  this.clickCallbackFn = util.callback(this, 'clickHandler');
  this.keydownCallbackFn = util.callback(this, 'keydownHandler');
  this.destroyCallbackFn = util.callback(this, 'destroy');

  // add to DOM
  selectEl.parentNode.appendChild(this.menuEl);

  // blur active element
  setTimeout(function() {
    // ie10 bugfix
    if (document.activeElement.nodeName.toLowerCase() !== "body") {
      document.activeElement.blur();
    }
  }, 0);
  
  // attach event handlers
  jqLite.on(this.menuEl, 'click', this.clickCallbackFn);
  jqLite.on(document, 'keydown', this.keydownCallbackFn);
  jqLite.on(window, 'resize', this.destroyCallbackFn);

  // attach event handler after current event loop exits
  var fn = this.destroyCallbackFn;
  setTimeout(function() {jqLite.on(document, 'click', fn);}, 0);
}


/**
 * Create menu element
 * @param {Element} selectEl - The select element
 */
Menu.prototype._createMenuEl = function(selectEl) {
  var optionEl, itemEl, i;

  var menuEl = document.createElement('div'),
      optionList = selectEl.children,
      m = optionList.length,
      selectedPos = 0,
      top = 13;

  // create element
  menuEl.className = menuClass;

  // add options
  for (i=0; i < m; i++) {
    optionEl = optionList[i];

    itemEl = document.createElement('div');
    itemEl.textContent = optionEl.textContent;
    itemEl._muiPos = i;

    if (optionEl.selected) selectedPos = i;

    menuEl.appendChild(itemEl);
  }

  // add selected attribute
  menuEl.children[selectedPos].setAttribute('selected', true);

  // save indices
  this.origIndex = selectedPos;
  this.currentIndex = selectedPos;

  var viewHeight = document.documentElement.clientHeight;

  // set height (use viewport as maximum height)
  var height = m * optionHeight + 2 * menuPadding;
  height = Math.min(height, viewHeight);
  jqLite.css(menuEl, 'height', height + 'px');

  // set position
  top += selectedPos * optionHeight;

  // prevent overflow top (set max to parent relative to viewport)
  top = Math.min(top, selectEl.getBoundingClientRect().top);

  // TODO: prevent overflow bottom
  
  jqLite.css(menuEl, 'top', (-1 * top) + 'px');

  return menuEl;
}


/**
 * Handle keydown events on document element.
 * @param {Event} ev - The DOM event
 */
Menu.prototype.keydownHandler = function(ev) {
  var keyCode = ev.keyCode;

  // tab
  if (keyCode === 9) return this.destroy();
  
  // escape | up | down | enter
  if (keyCode === 27 || keyCode === 40 || keyCode === 38 || keyCode === 13) {
    ev.preventDefault();
  }

  if (keyCode === 27) {
    this.destroy();
  } else if (keyCode === 40) {
    this.increment();
  } else if (keyCode === 38) {
    this.decrement();
  } else if (keyCode === 13) {
    this.selectCurrent();
    this.destroy();
  }
}


/**
 * Handle click events on menu element.
 * @param {Event} ev - The DOM event
 */
Menu.prototype.clickHandler = function(ev) {
  // don't allow events to bubble
  ev.stopPropagation();

  var pos = ev.target._muiPos;

  // ignore clicks on non-items                                               
  if (pos === undefined) return;

  // select option
  this.currentIndex = pos;
  this.selectCurrent();

  // destroy menu
  this.destroy();
}


/**
 * Increment selected item
 */
Menu.prototype.increment = function() {
  if (this.currentIndex === this.menuEl.children.length - 1) return;

  this.menuEl.children[this.currentIndex].removeAttribute('selected');
  this.currentIndex += 1;
  this.menuEl.children[this.currentIndex].setAttribute('selected', true);
}


/**
 * Decrement selected item
 */
Menu.prototype.decrement = function() {
  if (this.currentIndex === 0) return;

  this.menuEl.children[this.currentIndex].removeAttribute('selected');
  this.currentIndex -= 1;
  this.menuEl.children[this.currentIndex].setAttribute('selected', true);
}


/**
 * Select current item
 */
Menu.prototype.selectCurrent = function() {
  if (this.currentIndex !== this.origIndex) {
    this.selectEl.children[this.origIndex].selected = false;
    this.selectEl.children[this.currentIndex].selected = true;

    // trigger change event
    util.dispatchEvent(this.selectEl, 'change');
  }
}


/**
 * Destroy menu and detach event handlers
 */
Menu.prototype.destroy = function() {
  // remove element and focus element
  this.menuEl.parentNode.removeChild(this.menuEl);
  this.selectEl.focus();
  
  // remove event handlers
  jqLite.off(this.menuEl, 'click', this.clickCallbackFn);
  jqLite.off(document, 'keydown', this.keydownCallbackFn);
  jqLite.off(document, 'click', this.destroyCallbackFn);
  jqLite.off(window, 'resize', this.destroyCallbackFn);
}


/** Define module API */
module.exports = {
  /** Initialize module listeners */
  initListeners: function() {
    var doc = document;

    // markup elements available when method is called
    var elList = doc.querySelectorAll(cssSelector);
    for (var i=elList.length - 1; i >= 0; i--) initialize(elList[i]);

    // listen for new elements
    util.onNodeInserted(function(el) {
      if (el.tagName === 'SELECT' &&
          jqLite.hasClass(el.parentNode, wrapperClass)) {
        initialize(el);
      }
    });
  }
};
