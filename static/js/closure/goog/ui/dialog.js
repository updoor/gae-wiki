// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Copyright 2006 Google Inc. All Rights Reserved.

/**
 * @fileoverview Class for showing simple modal dialog boxes.
 *
 * TODO:
 *   * Standardize CSS class names with other components
 *   * Add functionality to "host" other components in content area
 *   * Abstract out ButtonSet and make it more general
 * @see ../demos/dialog.html
 */

goog.provide('goog.ui.Dialog');
goog.provide('goog.ui.Dialog.ButtonSet');
goog.provide('goog.ui.Dialog.DefaultButtonKeys');
goog.provide('goog.ui.Dialog.Event');
goog.provide('goog.ui.Dialog.EventType');

goog.require('goog.Timer');
goog.require('goog.dom');
goog.require('goog.dom.NodeType');
goog.require('goog.dom.TagName');
goog.require('goog.dom.a11y');
goog.require('goog.dom.classes');
goog.require('goog.dom.iframe');
goog.require('goog.events');
goog.require('goog.events.FocusHandler');
goog.require('goog.events.KeyCodes');
goog.require('goog.fx.Dragger');
goog.require('goog.math.Rect');
goog.require('goog.string');
goog.require('goog.structs');
goog.require('goog.structs.Map');
goog.require('goog.style');
goog.require('goog.ui.Component');
goog.require('goog.userAgent');


/**
 * Class for showing simple dialog boxes.
 * The Html structure of the dialog box is:
 * <pre>
 *  Element         Function                Class-name, modal-dialog = default
 * ----------------------------------------------------------------------------
 * - iframe         Iframe mask              modal-dialog-bg
 * - div            Background mask          modal-dialog-bg
 * - div            Dialog area              modal-dialog
 *     - div        Title bar                modal-dialog-title
 *        - span                             modal-dialog-title-text
 *          - text  Title text               N/A
 *        - span                             modal-dialog-title-close
 *          - ??    Close box                N/A
 *     - div        Content area             modal-dialog-content
 *        - ??      User specified content   N/A
 *     - div        Button area              modal-dialog-buttons
 *        - button                           N/A
 *        - button
 *        - ...
 * </pre>
 * @constructor
 * @param {string} opt_class CSS class name for the dialog element, also used
 *    as a class name prefix for related elements; defaults to modal-dialog.
 * @param {boolean} opt_useIframeMask Work around windowed controls z-index
 *     issue by using an iframe instead of a div for bg element.
 * @param {goog.dom.DomHelper} opt_domHelper Optional DOM helper; see {@link
 *    goog.ui.Component} for semantics.
 * @extends {goog.ui.Component}
 */
goog.ui.Dialog = function(opt_class, opt_useIframeMask, opt_domHelper) {
  goog.ui.Component.call(this, opt_domHelper);

  /**
   * CSS class name for the dialog element, also used as a class name prefix for
   * related elements.  Defaults to goog.getCssName('modal-dialog').
   * @type {string}
   * @private
   */
  this.class_ = opt_class || goog.getCssName('modal-dialog');

  this.useIframeMask_ = !!opt_useIframeMask;

  // Set the default button set to show ok and cancel
  this.buttons_ = goog.ui.Dialog.ButtonSet.OK_CANCEL;

  this.focusHandler_ = new goog.events.FocusHandler(
      this.getDomHelper().getDocument());
};
goog.inherits(goog.ui.Dialog, goog.ui.Component);


/**
 * Whether the dialog should use an iframe as the background element to work
 * around z-order issues.  Defaults to false.
 * @type {boolean}
 * @private
 */
goog.ui.Dialog.prototype.useIframeMask_ = false;


/**
 * Whether the dialog is modal. Defaults to true.
 * @type {boolean}
 * @private
 */
goog.ui.Dialog.prototype.modal_ = true;


/**
 * Whether the dialog is draggable. Defaults to true.
 * @type {boolean}
 * @private
 */
goog.ui.Dialog.prototype.draggable_ = true;


/**
 * Opacity for background mask.  Defaults to 30%.
 * @type {number}
 * @private
 */
goog.ui.Dialog.prototype.backgroundElementOpacity_ = 0.30;


/**
 * Dialog's title.
 * @type {string}
 * @private
 */
goog.ui.Dialog.prototype.title_ = '';


/**
 * Dialog's content (HTML).
 * @type {string}
 * @private
 */
goog.ui.Dialog.prototype.content_ = '';


/**
 * Button set.  Default: Ok/Cancel.
 * @type {goog.ui.Dialog.ButtonSet?}
 * @private
 */
goog.ui.Dialog.prototype.buttons_ = null;


/**
 * Dragger.
 * @type {?goog.fx.Dragger}
 * @private
 */
goog.ui.Dialog.prototype.dragger_ = null;


/**
 * Whether dialog is visible.
 * @type {boolean}
 * @private
 */
goog.ui.Dialog.prototype.visible_ = false;


/**
 * Whether the dialog should be disposed when it is hidden.
 * @type {boolean}
 * @private
 */
goog.ui.Dialog.prototype.disposeOnHide_ = false;


/**
 * Element for the background which obscures the UI and blocks events.
 * @type {Element?}
 * @private
 */
goog.ui.Dialog.prototype.bgEl_ = null;


/**
 * Iframe element that is only used for IE as a workaround to keep select-type
 * elements from burning through background.
 * @type {Element?}
 * @private
 */
goog.ui.Dialog.prototype.bgIframeEl_ = null;


/**
 * Element for the title bar.
 * @type {Element?}
 * @private
 */
goog.ui.Dialog.prototype.titleEl_ = null;


/**
 * Element for the text area of the title bar.
 * @type {Element?}
 * @private
 */
goog.ui.Dialog.prototype.titleTextEl_ = null;



/**
 * Id of element for the text area of the title bar.
 * @type {string?}
 * @private
 */
goog.ui.Dialog.prototype.titleId_ = null;


/**
 * Element for the close box area of the title bar.
 * @type {Element?}
 * @private
 */
goog.ui.Dialog.prototype.titleCloseEl_ = null;


/**
 * Element for the content area.
 * @type {Element?}
 * @private
 */
goog.ui.Dialog.prototype.contentEl_ = null;


/**
 * Element for the button bar.
 * @type {Element?}
 * @private
 */
goog.ui.Dialog.prototype.buttonEl_ = null;


/**
 * Sets the title.
 * @param {string} title Title HTML (escaped).
 */
goog.ui.Dialog.prototype.setTitle = function(title) {
  this.title_ = title;
  if (this.titleTextEl_) {
    goog.dom.setTextContent(this.titleTextEl_, title);
  }
};


/**
 * Gets the title.
 * @return {string} The title.
 */
goog.ui.Dialog.prototype.getTitle = function() {
  return this.title_;
};


/**
 * Allows arbitrary HTML to be set in the content element.
 * @param {string} html Content HTML.
 */
goog.ui.Dialog.prototype.setContent = function(html) {
  this.content_ = html;
  if (this.contentEl_) {
    this.contentEl_.innerHTML = html;
  }
};


/**
 * Gets the content HTML of the content element.
 * @return {string} Content HTML.
 */
goog.ui.Dialog.prototype.getContent = function() {
  return this.content_;
};


/**
 * Returns the content element so that more complicated things can be done with
 * the content area.  Lazily renders the component if needed.  Overrides
 * {@link goog.ui.Component#getContentElement}.
 * @return {Element} The content element.
 */
goog.ui.Dialog.prototype.getContentElement = function() {
  if (!this.contentEl_) {
    this.render();
  }
  return this.contentEl_;
};


/**
 * Returns the title element so that more complicated things can be done with
 * the title.  Lazily renders the component if needed.
 * @return {Element} The title element.
 */
goog.ui.Dialog.prototype.getTitleElement = function() {
  if (!this.isInDocument()) {
    this.render();
  }
  return this.titleEl_;
};


/**
 * Returns the title text element so that more complicated things can be done
 * with the text of the title.  Lazily renders the component if needed.
 * @return {Element} The title text element.
 */
goog.ui.Dialog.prototype.getTitleTextElement = function() {
  if (!this.isInDocument()) {
    this.render();
  }
  return this.titleTextEl_;
};


/**
 * Returns the title close element so that more complicated things can be done
 * with the close area of the title.
 * @return {Element} The close box.
 */
goog.ui.Dialog.prototype.getTitleCloseElement = function() {
  if (!this.isInDocument()) {
    this.render();
  }
  return this.titleCloseEl_;
};


/**
 * Returns the button element so that more complicated things can be done with
 * the button area.  Lazily renders the component if needed.
 * @return {Element} The button container element.
 */
goog.ui.Dialog.prototype.getButtonElement = function() {
  if (!this.isInDocument()) {
    this.render();
  }
  return this.buttonEl_;
};


/**
 * Returns the dialog element so that more complicated things can be done with
 * the dialog box.  Lazily renders the component if needed.
 * @return {Element} The dialog element.
 */
goog.ui.Dialog.prototype.getDialogElement = function() {
  if (!this.isInDocument()) {
    this.render();
  }
  return this.getElement();
};


/**
 * Returns the background mask element so that more complicated things can be
 * done with the background region.  Lazily renders the component if needed.
 * @return {Element} The background mask element.
 */
goog.ui.Dialog.prototype.getBackgroundElement = function() {
  if (!this.isInDocument()) {
    this.render();
  }
  return this.bgEl_;
};


/**
 * Gets the opacity of the background mask.
 * @return {number} Background mask opacity.
 */
goog.ui.Dialog.prototype.getBackgroundElementOpacity = function() {
  return this.backgroundElementOpacity_;
};


/**
 * Sets the opacity of the background mask.
 * @param {number} opacity Background mask opacity.
 */
goog.ui.Dialog.prototype.setBackgroundElementOpacity = function(opacity) {
  this.backgroundElementOpacity_ = opacity;

  if (this.bgEl_) {
    goog.style.setOpacity(this.bgEl_, this.backgroundElementOpacity_);
  }
};


/**
 * Sets the modal property of the dialog.
 *
 * Note that non-modal dialogs cannot use an iframe mask.
 *
 * @param {boolean} modal Whether the dialog is modal.
 */
goog.ui.Dialog.prototype.setModal = function(modal) {
  this.modal_ = modal;
  this.manageBackgroundDom_();
};


/**
 * @return {boolean} modal Whether the dialog is modal.
 */
goog.ui.Dialog.prototype.getModal = function() {
  return this.modal_;
};


/**
 * @return {string} The CSS class name for the dialog element.
 */
goog.ui.Dialog.prototype.getClass = function() {
  return this.class_;
};


/**
 * Sets whether the dialog can be dragged.
 * @param {boolean} draggable Whether the dialog can be dragged.
 */
goog.ui.Dialog.prototype.setDraggable = function(draggable) {
  this.draggable_ = draggable;

  // this will add the dragger if we've already rendered, and gone through
  // the enterDocument routine, but now want to dynamically add draggability
  if (this.draggable_ && !this.dragger_ && this.getElement()) {
    this.dragger_ = this.createDraggableTitleDom_();

  } else if (!this.draggable_ && this.dragger_) {
    // removes draggable classname post-render
    if (this.getElement()) {
      goog.dom.classes.remove(this.titleEl_,
          goog.getCssName(this.class_, 'title-draggable'));
    }
    this.dragger_.dispose();
    this.dragger_ = null;
  }
};


/**
 * Creates a dragger on the title element and adds a classname for
 * cursor:move targeting.
 * @return {goog.fx.Dragger} The created dragger instance.
 * @private
 */
goog.ui.Dialog.prototype.createDraggableTitleDom_ = function() {
  var dragger = new goog.fx.Dragger(this.getElement(), this.titleEl_);
  goog.dom.classes.add(this.titleEl_,
      goog.getCssName(this.class_, 'title-draggable'));
  return dragger;
};


/**
 * @return {boolean} Whether the dialog is draggable.
 */
goog.ui.Dialog.prototype.getDraggable = function() {
  return this.draggable_;
};


/**
 * Creates the initial DOM representation for the dialog.  Overrides {@link
 * goog.ui.Component#createDom}.
 */
goog.ui.Dialog.prototype.createDom = function() {
  // Manages the DOM for background mask elements.
  this.manageBackgroundDom_();

  // Create the dialog element, and make sure it's hidden.
  var dom = this.getDomHelper();
  this.setElementInternal(dom.createDom('div',
      {'className': this.class_, 'tabIndex': 0},
      this.titleEl_ = dom.createDom('div',
          {'className': goog.getCssName(this.class_, 'title'),
           'id': this.getId()},
          this.titleTextEl_ = dom.createDom('span',
              goog.getCssName(this.class_, 'title-text'), this.title_),
          this.titleCloseEl_ = dom.createDom('span',
              goog.getCssName(this.class_, 'title-close'))),
      this.contentEl_ = dom.createDom('div',
          goog.getCssName(this.class_, 'content')),
      this.buttonEl_ = dom.createDom('div',
          goog.getCssName(this.class_, 'buttons')),
      this.tabCatcherEl_ = dom.createDom('span', {'tabIndex': 0})));
  this.titleId_ = this.titleEl_.id;
  goog.dom.a11y.setRole(this.getElement(), 'dialog');
  goog.dom.a11y.setState(this.getElement(), 'labelledby', this.titleId_ || '');
  // If setContent() was called before createDom(), make sure the inner HTML of
  // the content element is initialized.
  if (this.content_) {
    this.contentEl_.innerHTML = this.content_;
  }
  goog.style.showElement(this.getElement(), false);

  // Render the buttons.
  if (this.buttons_) {
    this.buttons_.attachToElement(this.buttonEl_);
  }
};


/**
 * Creates and disposes of the DOM for background mask elements.
 * @private
 */
goog.ui.Dialog.prototype.manageBackgroundDom_ = function() {
  if (this.useIframeMask_ && this.modal_ && !this.bgIframeEl_) {
    // IE renders the iframe on top of the select elements while still
    // respecting the z-index of the other elements on the page.  See
    // http://support.microsoft.com/kb/177378 for more information.
    // Flash and other controls behave in similar ways for other browsers
    this.bgIframeEl_ = goog.dom.iframe.createBlank(this.getDomHelper());
    this.bgIframeEl_.className = goog.getCssName(this.class_, 'bg');
    goog.style.showElement(this.bgIframeEl_, false);
    goog.style.setOpacity(this.bgIframeEl_, 0);

  // Removes the iframe mask if it exists and we don't want it to
  } else if ((!this.useIframeMask_ || !this.modal_) && this.bgIframeEl_) {
    goog.dom.removeNode(this.bgIframeEl_);
    this.bgIframeEl_ = null;
  }

  // Create the backgound mask, initialize its opacity, and make sure it's
  // hidden.
  if (this.modal_ && !this.bgEl_) {
    this.bgEl_ = this.getDomHelper().createDom('div',
        goog.getCssName(this.class_, 'bg'));
    goog.style.setOpacity(this.bgEl_, this.backgroundElementOpacity_);
    goog.style.showElement(this.bgEl_, false);

  // Removes the background mask if it exists and we don't want it to
  } else if (!this.modal_ && this.bgEl_) {
    goog.dom.removeNode(this.bgEl_);
    this.bgEl_ = null;
  }
};


/**
 * Renders the component.  Overrides {@link goog.ui.Component#render}.  Accepts
 * an {@code opt_parent} argument for compatibility with the superclass method,
 * but rendering a dialog into anything other than a body element will likely
 * have unexpected results.  The parent element defaults to the current document
 * body if unspecified, which is almost always what you want.
 *
 * @param {Element} opt_parent Element into which the component is to be
 *    rendered; defaults to the current document's body element if unspecified.
 * @throws {goog.ui.Component.Error.ALREADY_RENDERED} If the component is
 *    already rendered.
 */
goog.ui.Dialog.prototype.render = function(opt_parent) {
  // We have to replicate some of the logic from goog.ui.Component#render here,
  // since dialogs are made up of three elements (the bacground mask, the dialog
  // itself, and the optional iframe mask on IE), and all of them must be
  // appended to the parent element before enterDocument is called.
  if (this.isInDocument()) {
    throw Error(goog.ui.Component.Error.ALREADY_RENDERED);
  }

  if (!this.getElement()) {
    // This creates both (or, on IE, possibly all three) elements.
    this.createDom();
  }

  // First, render the background mask...
  var parent = opt_parent || this.getDomHelper().getDocument().body;
  this.renderBackground_(parent);

  // ...then call the superclass method to attach the dialog element and call
  // enterDocument().
  goog.ui.Dialog.superClass_.render.call(this, parent);
};


/**
 * Renders the background mask.
 * @param {Element} parent Parent element; typically the document body.
 * @private
 */
goog.ui.Dialog.prototype.renderBackground_ = function(parent) {
  if (this.bgIframeEl_) {
    parent.appendChild(this.bgIframeEl_);
  }
  if (this.bgEl_) {
    parent.appendChild(this.bgEl_);
  }
};


/**
 * Overrides {@link goog.ui.Component#renderBefore} to throw a NOT_SUPPORTED
 * error, since dialogs don't support being rendered before another DOM element.
 * TODO: Figure out how to do this cleanly between Component and this.
 *
 * @param {Element} sibling Element before which the component is to be
 *    rendered (ignored).
 */
goog.ui.Dialog.prototype.renderBefore = function(sibling) {
  throw Error(goog.ui.Component.Error.NOT_SUPPORTED);
};


/**
 * Determines if the given element can be decorated by this dialog component.
 * Overrides {@link goog.ui.Component#canDecorate}.
 * @param {Element} element Element to decorate.
 * @return {*} True-ish if the element can be decorated, false-ish otherwise.
 */
goog.ui.Dialog.prototype.canDecorate = function(element) {
  // Assume we can decorate any DIV.
  return element && element.tagName && element.tagName == 'DIV' &&
         goog.ui.Dialog.superClass_.canDecorate.call(this, element);
};


/**
 * Decorates the given element as a dialog.  Overrides {@link
 * goog.ui.Component#decorateInternal}.  Considered protected.
 * @param {Element} element Element to decorate.
 * @protected
 */
goog.ui.Dialog.prototype.decorateInternal = function(element) {
  // Decorate the dialog area element.
  goog.ui.Dialog.superClass_.decorateInternal.call(this, element);
  goog.dom.classes.add(this.getElement(), this.class_);

  // Decorate or create the content element.
  var contentClass = goog.getCssName(this.class_, 'content');
  this.contentEl_ = goog.dom.$$(null, contentClass, this.getElement())[0];
  if (this.contentEl_) {
    this.content_ = this.contentEl_.innerHTML;
  } else {
    this.contentEl_ = this.getDomHelper().createDom('div', contentClass);
    if (this.content_) {
      this.contentEl_.innerHTML = this.content_;
    }
    this.getElement().appendChild(this.contentEl_);
  }

  // Decorate or create the title bar element.
  var titleClass = goog.getCssName(this.class_, 'title');
  var titleTextClass = goog.getCssName(this.class_, 'title-text');
  var titleCloseClass = goog.getCssName(this.class_, 'title-close');
  this.titleEl_ = goog.dom.$$(null, titleClass, this.getElement())[0];
  if (this.titleEl_) {
    // Only look for title text & title close elements if a title bar element
    // was found.  Otherwise assume that the entire title bar has to be
    // created from scratch.
    this.titleTextEl_ = goog.dom.$$(null, titleTextClass, this.titleEl_)[0];
    this.titleCloseEl_ = goog.dom.$$(null, titleCloseClass, this.titleEl_)[0];
  } else {
    // Create the title bar element and insert it before the content area.
    // This is useful if the element to decorate only includes a content area.
    this.titleEl_ = this.getDomHelper().createDom('div', titleClass);
    this.getElement().insertBefore(this.titleEl_, this.contentEl_);
  }

  // Decorate or create the title text element.
  if (this.titleTextEl_) {
    this.title_ = goog.dom.getTextContent(this.titleTextEl_);
  } else {
    this.titleTextEl_ = this.getDomHelper().createDom('span', titleTextClass,
        this.title_);
    this.titleEl_.appendChild(this.titleTextEl_);
  }
  goog.dom.a11y.setState(this.getElement(), 'labelledby', this.titleId_ || '');
  // Decorate or create the title close element.
  if (!this.titleCloseEl_) {
    this.titleCloseEl_ = this.getDomHelper().createDom('span', titleCloseClass);
    this.titleEl_.appendChild(this.titleCloseEl_);
  }

  // Decorate or create the button container element.
  var buttonsClass = goog.getCssName(this.class_, 'buttons');
  this.buttonEl_ = goog.dom.$$(null, buttonsClass, this.getElement())[0];
  if (this.buttonEl_) {
    // Button container element found.  Create empty button set and use it to
    // decorate the button container.
    this.buttons_ = new goog.ui.Dialog.ButtonSet(this.getDomHelper());
    this.buttons_.decorate(this.buttonEl_);
  } else {
    // Create new button container element, and render a button set into it.
    this.buttonEl_ = this.getDomHelper().createDom('div', buttonsClass);
    this.getElement().appendChild(this.buttonEl_);
    if (this.buttons_) {
      this.buttons_.attachToElement(this.buttonEl_);
    }
  }

  // Create the background mask...
  this.manageBackgroundDom_();

  // ...and render it.
  this.renderBackground_(goog.dom.getOwnerDocument(this.getElement()).body);

  // Make sure the decorated dialog is hidden.
  goog.style.showElement(this.getElement(), false);
};


/**
 * Initializes the component just after its DOM has been rendered into the
 * document.  Overrides {@link goog.ui.Component#enterDocument}.
 */
goog.ui.Dialog.prototype.enterDocument = function() {
  goog.ui.Dialog.superClass_.enterDocument.call(this);

  // Add drag support.
  if (this.draggable_ && !this.dragger_) {
    this.dragger_ = this.createDraggableTitleDom_();
  }

  // Add event listeners to the close box and the button container.
  this.getHandler().
      listen(this.titleCloseEl_, goog.events.EventType.CLICK,
          this.onTitleCloseClick_).

      // We need to watch the entire document so that we can detect when the
      // focus is moved out of this dialog.
      listen(this.focusHandler_, goog.events.FocusHandler.EventType.FOCUSIN,
          this.onFocus_);

  goog.dom.a11y.setRole(this.getElement(), 'dialog');
  if (this.titleTextEl_.id !== '') {
    goog.dom.a11y.setState(
        this.getElement(), 'labelledby', this.titleTextEl_.id);
  }
};


/**
 * Cleans up the dialog component just before it is disposed of.  Overrides
 * {@link goog.ui.Component#exitDocument}.
 */
goog.ui.Dialog.prototype.exitDocument = function() {
  if (this.isVisible()) {
    this.setVisible(false);
  }

  // Remove drag support.
  if (this.dragger_) {
    this.dragger_.dispose();
    this.dragger_ = null;
  }

  goog.ui.Dialog.superClass_.exitDocument.call(this);
};


/**
 * Sets the visibility of the dialog box and moves focus to the default button.
 * Lazily renders the component if needed.
 * @param {boolean} visible Whether the dialog should be visible.
 */
goog.ui.Dialog.prototype.setVisible = function(visible) {
  if (visible == this.visible_) {
    return;
  }

  // TODO:  Add utility methods to Component to get window & document?
  var doc = this.getDomHelper().getDocument();

  // Older versions of Safari did not know how to get a window for a given
  // document, so just fall up to the window we're running in.
  var win = goog.dom.getWindow(doc) || window;

  // If the dialog hasn't been rendered yet, render it now.
  if (!this.isInDocument()) {
    this.render(doc.body);
  }

  if (visible) {
    this.resizeBackground_();
    this.reposition();
    // Listen for keyboard and resize events while the dialog is visible.
    this.getHandler().
        listen(this.getElement(), goog.events.EventType.KEYDOWN,
            this.onKeyDown_, true).
        listen(win, goog.events.EventType.RESIZE,
            this.onResize_, true);
  } else {
    // Stop listening for keyboard and resize events while the dialog is hidden.
    this.getHandler().
        unlisten(this.getElement(), goog.events.EventType.KEYDOWN,
            this.onKeyDown_, true).
        unlisten(win, goog.events.EventType.RESIZE,
            this.onResize_, true);
  }

  // Show/hide the iframe mask (on IE), the background mask, and the dialog.
  if (this.bgIframeEl_) {
    goog.style.showElement(this.bgIframeEl_, visible);
  }
  if (this.bgEl_) {
    goog.style.showElement(this.bgEl_, visible);
  }
  goog.style.showElement(this.getElement(), visible);

  if (visible) {
    if (goog.userAgent.GECKO) {
      // In FF, start with the focus on the dialog itself.  Otherwise if we
      // focus on a sub-element first, then hitting tab moves the focus outside
      // of the dialog, which we don't want.
      this.getElement().focus();
    }
    // Move focus to the default button (if any).
    if (this.getButtonSet()) {
      var defaultButton = this.getButtonSet().getDefault();
      if (defaultButton) {
        var buttons = this.buttonEl_.getElementsByTagName('button');
        for (var i = 0, button; button = buttons[i]; i++) {
          if (button.name == defaultButton) {
            try {
              // Reopening a dialog can cause focusing the button to fail in
              // WebKit and Opera. Shift the focus to a temporary <input>
              // element to make refocusing the button possible.
              if (goog.userAgent.WEBKIT || goog.userAgent.OPERA) {
                var temp = doc.createElement('input');
                temp.style.cssText = 'position:fixed;width:0;height:0';
                this.getElement().appendChild(temp);
                temp.focus();
                this.getElement().removeChild(temp);
              }
              button.focus();
            } catch (e) {
              // Swallow this. Could be the button is disabled
              // and IE6 wishes to throw an error.
            }
            break;
          }
        }
      }
    }
  }

  this.visible_ = visible;

  if (!visible) {
    this.getHandler().unlisten(this.buttonEl_,
        goog.events.EventType.CLICK, this.onButtonClick_);
    this.dispatchEvent(goog.ui.Dialog.EventType.AFTER_HIDE);
    if (this.disposeOnHide_) {
      this.dispose();
    }
  } else {
    // NOTE: see bug 1163154 for an example of an edge case where making the
    // dialog visible in response to a KEYDOWN will result in a CLICK event
    // firing on the default button (immediately closing the dialog) if the key
    // that fired the KEYDOWN is also normally used to activate controls
    // (i.e. SPACE/ENTER).
    //
    // This could be worked around by attaching the onButtonClick_ handler in a
    // setTimeout, but that was deemed undesirable.
    this.getHandler().listen(this.buttonEl_,
        goog.events.EventType.CLICK, this.onButtonClick_);
  }
};


/**
 * @return {boolean} Whether the dialog box is visible.
 */
goog.ui.Dialog.prototype.isVisible = function() {
  return this.visible_;
};


/**
 * Make the background element the size of the document.
 *
 * NOTE: We must hide the background element before measuring the
 * document, otherwise the size of the background will stop the document from
 * shrinking to fit a smaller window.  This does cause a slight flicker in Linux
 * browsers, but should not be a common scenario.
 * @private
 */
goog.ui.Dialog.prototype.resizeBackground_ = function() {
  if (this.bgIframeEl_) {
    goog.style.showElement(this.bgIframeEl_, false);
  }
  if (this.bgEl_) {
    goog.style.showElement(this.bgEl_, false);
  }

  var doc = this.getDomHelper().getDocument();
  var win = goog.dom.getWindow(doc) || window;

  // Take the max of scroll height and view height for cases in which document
  // does not fill screen.  Don't worry about width.
  var viewSize = goog.dom.getViewportSize(win);
  var w = doc.body.scrollWidth;
  var h = Math.max(doc.body.scrollHeight, viewSize.height);

  if (this.bgIframeEl_) {
    goog.style.showElement(this.bgIframeEl_, true);
    goog.style.setSize(this.bgIframeEl_, w, h);
  }
  if (this.bgEl_) {
    goog.style.showElement(this.bgEl_, true);
    goog.style.setSize(this.bgEl_, w, h);
  }

  if (this.draggable_) {
    var dialogSize = goog.style.getSize(this.getElement());
    this.dragger_.limits =
        new goog.math.Rect(0, 0, w - dialogSize.width, h - dialogSize.height);
  }
};


/**
 * Centers the dialog in the viewport, taking scrolling into account.
 */
goog.ui.Dialog.prototype.reposition = function() {
  // Get the current viewport to obtain the scroll offset.
  var doc = this.getDomHelper().getDocument();
  var win = goog.dom.getWindow(doc) || window;
  if (goog.style.getComputedPosition(this.getElement()) == 'fixed') {
    var x = 0;
    var y = 0;
  } else {
    var scroll = this.getDomHelper().getDocumentScroll();
    var x = scroll.x;
    var y = scroll.y;
  }

  var dialogSize = goog.style.getSize(this.getElement());
  var viewSize = goog.dom.getViewportSize(win);

  // Make sure left and top are non-negatives.
  var left = Math.max(x + viewSize.width / 2 - dialogSize.width / 2, 0);
  var top = Math.max(y + viewSize.height / 2 - dialogSize.height / 2, 0);

  goog.style.setPosition(this.getElement(), left, top);
};


/**
 * Handles a click on the title close area.
 * @param {goog.events.BrowserEvent} e Browser's event object.
 * @private
 */
goog.ui.Dialog.prototype.onTitleCloseClick_ = function(e) {
  var bs = this.getButtonSet();
  var key = bs && bs.getCancel();
  // Only if there is a valid cancel button is an event dispatched.
  if (key) {
    var caption = /** @type {Element|string} */(bs.get(key));
    if (this.dispatchEvent(new goog.ui.Dialog.Event(key, caption))) {
      this.setVisible(false);
    }
  } else {
    this.setVisible(false);
  }
};


/**
 * Sets whether the dialog should be disposed when it is hidden.  By default
 * dialogs are not disposed when they are hidden.
 * @param {boolean} b Whether the dialog should get disposed when it gets
 *     hidden.
 */
goog.ui.Dialog.prototype.setDisposeOnHide = function(b) {
  this.disposeOnHide_ = b;
};


/**
 * @return {boolean} Whether the dialog should be disposed when it is hidden.
 */
goog.ui.Dialog.prototype.getDisposeOnHide = function() {
  return this.disposeOnHide_;
};


/** @inheritDoc */
goog.ui.Dialog.prototype.disposeInternal = function() {
  // The superclass method calls exitDocument, which in turn calls
  // setVisible(false).  Between them they clean up all event handlers.
  goog.ui.Dialog.superClass_.disposeInternal.call(this);

  if (this.focusHandler_) {
    this.focusHandler_.dispose();
    this.focusHandler_ = null;
  }

  // The superclass method disposes of the element and its children,
  // unless the dialog was decorated.  We only have to worry about
  // background mask elements.
  if (this.bgEl_) {
    goog.dom.removeNode(this.bgEl_);
    this.bgEl_ = null;
  }
  if (this.bgIframeEl_) {
    goog.dom.removeNode(this.bgIframeEl_);
    this.bgIframeEl_ = null;
  }

  this.titleCloseEl_ = null;
  this.buttonEl_ = null;
  this.tabCatcherEl_ = null;
};


/**
 * Sets the button set to use.
 * Note: Passing in null will cause no button set to be rendered.
 * @param {goog.ui.Dialog.ButtonSet?} buttons The button set to use.
 */
goog.ui.Dialog.prototype.setButtonSet = function(buttons) {
  this.buttons_ = buttons;
  if (this.buttonEl_) {
    if (this.buttons_) {
      this.buttons_.attachToElement(this.buttonEl_);
    } else {
      this.buttonEl_.innerHTML = '';
    }
  }
};


/**
 * Returns the button set being used.
 * @return {goog.ui.Dialog.ButtonSet?} The button set being used.
 */
goog.ui.Dialog.prototype.getButtonSet = function() {
  return this.buttons_;
};


/**
 * Handles a click on the button container.
 * @param {goog.events.BrowserEvent} e Browser's event object.
 * @private
 */
goog.ui.Dialog.prototype.onButtonClick_ = function(e) {
  var button = this.findParentButton_(/** @type {Element} */ (e.target));
  if (button && !button.disabled) {
    var key = button.name;
    var caption = /** @type {Element|string} */(
        this.getButtonSet().get(key));
    if (this.dispatchEvent(new goog.ui.Dialog.Event(key, caption))) {
      this.setVisible(false);
    }
  }
};

/**
 * Finds the parent button of an element (or null if there was no button
 * parent).
 * @param {Element} element The element that was clicked on.
 * @return {Element?} Returns the parent button or null if not found.
 * @private
 */
goog.ui.Dialog.prototype.findParentButton_ = function(element) {
  var el = element;
  while (el != null && el != this.buttonEl_) {
    if (el.tagName == 'BUTTON') {
      return /** @type {Element} */(el);
    }
    el = el.parentNode;
  }
  return null;
};


/**
 * Handles keydown events, and dismisses the popup if cancel is pressed.  If
 * there is a cancel action in the ButtonSet, than that will be fired.
 * @param {goog.events.BrowserEvent} e Browser's event object.
 * @private
 */
goog.ui.Dialog.prototype.onKeyDown_ = function(e) {
  var close = false;
  var hasHandler = false;
  var buttonSet = this.getButtonSet();
  var target = e.target;
  if (e.keyCode == goog.events.KeyCodes.ESC) {
    // Only if there is a valid cancel button is an event dispatched.
    var cancel = buttonSet && buttonSet.getCancel();

    // Users may expect to hit escape on a SELECT element.
    var isSpecialFormElement =
        target.tagName == 'SELECT' && !target.disabled;

    if (cancel && !isSpecialFormElement) {
      hasHandler = true;

      var caption = buttonSet.get(cancel);
      close = this.dispatchEvent(
          new goog.ui.Dialog.Event(cancel,
              /** @type {Element|null|string} */(caption)));
    } else if (!isSpecialFormElement) {
      close = true;
    }
  } else if (e.keyCode == goog.events.KeyCodes.ENTER) {
    var key;
    if (target.tagName == 'BUTTON') {
      // If focus was on a button, it must have been enabled, so we can fire
      // that button's handler.
      key = target.name;
    } else if (buttonSet) {
      // Try to fire the default button's handler (if one exists), but only if
      // the button is enabled.
      var defaultKey = buttonSet.getDefault();
      var defaultButton = defaultKey && buttonSet.getButton(defaultKey);

      // Users may expect to hit enter on a TEXTAREA or a SELECT element.
      var isSpecialFormElement =
          (target.tagName == 'TEXTAREA' || target.tagName == 'SELECT') &&
          !target.disabled;

      if (defaultButton && !defaultButton.disabled && !isSpecialFormElement) {
        key = defaultKey;
      }
    }
    if (key) {
      hasHandler = true;
      close = this.dispatchEvent(
          new goog.ui.Dialog.Event(key, String(buttonSet.get(key))));
    }
  } else if (e.keyCode == goog.events.KeyCodes.TAB && e.shiftKey &&
      target == this.getElement()) {
    // Prevent the user from shift-tabbing backwards out of the dialog box.
    // TODO: Instead, we should move the focus to the last tabbable
    // element inside the dialog.
    hasHandler = true;
  }

  if (close || hasHandler) {
    e.stopPropagation();
    e.preventDefault();
  }

  if (close) {
    this.setVisible(false);
  }
};


/**
 * Handles window resize events.
 * @param {goog.events.BrowserEvent} e Browser's event object.
 * @private
 */
goog.ui.Dialog.prototype.onResize_ = function(e) {
  this.resizeBackground_();
};


/**
 * Handles focus events.  Makes sure that if the user tabs past the
 * elements in the dialog, the focus wraps back to the beginning.
 * @param {goog.events.BrowserEvent} e Browser's event object.
 * @private
 */
goog.ui.Dialog.prototype.onFocus_ = function(e) {
  if (this.tabCatcherEl_ == e.target) {
    goog.Timer.callOnce(this.focusElement_, 0, this);
  }
};


/**
 * Moves the focus to the dialog.
 * @private
 */
goog.ui.Dialog.prototype.focusElement_ = function() {
  if (goog.userAgent.IE) {
    // In IE, we must first focus on the body or else focussing on a
    // sub-element will not work.
    this.getDomHelper().getDocument().body.focus();
  }
  this.getElement().focus();
};


/**
 * Dialog event class.
 * @param {string} key Key identifier for the button.
 * @param {string|Element} caption Caption on the button (might be i18nlized).
 * @constructor
 * @extends {goog.events.Event}
 */
goog.ui.Dialog.Event = function(key, caption) {
  this.type = goog.ui.Dialog.EventType.SELECT;
  this.key = key;
  this.caption = caption;
};
goog.inherits(goog.ui.Dialog.Event, goog.events.Event);


/**
 * Event type constant for dialog events.
 * TODO: Change this to goog.ui.Dialog.EventType.SELECT.
 * @type {string}
 * @deprecated Use goog.ui.Dialog.EventType.SELECT.
 */
goog.ui.Dialog.SELECT_EVENT = 'dialogselect';


/**
 * Events dispatched by dialogs.
 * @enum {string}
 */
goog.ui.Dialog.EventType = {
  /**
   * Dispatched when the user closes the dialog.
   * The dispatched event will always be of type {@link goog.ui.Dialog.Event}.
   * Canceling the event will prevent the dialog from closing.
   */
  SELECT: 'dialogselect',

  /**
   * Dispatched after the dialog is closed. Not cancelable.
   */
  AFTER_HIDE: 'afterhide'
};


/**
 * A button set defines the behaviour of a set of buttons that the dialog can
 * show.  Uses the {@link goog.structs.Map} interface.
 * @param {goog.dom.DomHelper} opt_domHelper Optional DOM helper; see {@link
 *    goog.ui.Component} for semantics.
 * @constructor
 * @extends {goog.structs.Map}
 */
goog.ui.Dialog.ButtonSet = function(opt_domHelper) {
  // TODO:  Refactor ButtonSet to extend goog.ui.Component?
  this.dom_ = opt_domHelper || goog.dom.getDomHelper();
  goog.structs.Map.call(this);
};
goog.inherits(goog.ui.Dialog.ButtonSet, goog.structs.Map);


/**
 * A CSS className for this component.
 * @type {string}
 * @private
 */
goog.ui.Dialog.ButtonSet.prototype.class_ = goog.getCssName('goog-buttonset');


/**
 * The button that has default focus (references key in buttons_ map).
 * @type {string?}
 * @private
 */
goog.ui.Dialog.ButtonSet.prototype.defaultButton_ = null;


/**
 * Optional container the button set should be rendered into.
 * @type {Element?}
 * @private
 */
goog.ui.Dialog.ButtonSet.prototype.element_ = null;


/**
 * The button whose action is associated with the escape key and the X button
 * on the dialog.
 * @type {string?}
 * @private
 */
goog.ui.Dialog.ButtonSet.prototype.cancelButton_ = null;


/**
 * Adds a button to the button set.  Buttons will be displayed in the order they
 * are added.
 *
 * @param {string} key Key used to identify the button in events.
 * @param {string|Element} caption A string caption or a DOM node that can be
 *     appended to a button element.
 * @param {boolean} opt_isDefault Whether this button is the default button,
 *     Dialog will dispatch for this button if enter is pressed.
 * @param {boolean} opt_isCancel Whether this button has the same behaviour as
 *    cancel.  If escape is pressed this button will fire.
 * @return {goog.ui.Dialog.ButtonSet} The button set, to make it easy to chain
 *    "set" calls and build new ButtonSets.
 */
goog.ui.Dialog.ButtonSet.prototype.set = function(key, caption,
      opt_isDefault, opt_isCancel) {
  goog.structs.Map.prototype.set.call(this, key, caption);

  if (opt_isDefault) {
    this.defaultButton_ = key;
  }
  if (opt_isCancel) {
    this.cancelButton_ = key;
  }

  return this;
};


/**
 * Attaches the button set to an element, rendering it inside.
 * @param {Element} el Container.
 */
goog.ui.Dialog.ButtonSet.prototype.attachToElement = function(el) {
  this.element_ = el;
  this.render();
};


/**
 * Renders the button set inside its container element.
 */
goog.ui.Dialog.ButtonSet.prototype.render = function() {
  if (this.element_) {
    this.element_.innerHTML = '';
    var domHelper = goog.dom.getDomHelper(this.element_);
    goog.structs.forEach(this, function(caption, key) {
      var button = domHelper.createDom('button', {'name': key}, caption);
      if (key == this.defaultButton_) {
        button.className = goog.getCssName(this.class_, 'default');
      }
      this.element_.appendChild(button);
    }, this);
  }
};


/**
 * Decorates the given element by adding any {@code button} elements found
 * among its descendants to the button set.  The first button found is assumed
 * to be the default and will receive focus when the button set is rendered.
 * If a button with a name of {@link goog.ui.Dialog.DefaultButtonKeys.CANCEL}
 * is found, it is assumed to have "Cancel" semantics.
 * TODO:  ButtonSet should be a goog.ui.Component.  Really.
 * @param {Element} element The element to decorate; should contain buttons.
 */
goog.ui.Dialog.ButtonSet.prototype.decorate = function(element) {
  if (!element || element.nodeType != goog.dom.NodeType.ELEMENT) {
    return;
  }

  this.element_ = element;
  var buttons = this.element_.getElementsByTagName('button');
  for (var i = 0, button, key, caption; button = buttons[i]; i++) {
    // Buttons should have a "name" attribute and have their caption defined by
    // their innerHTML, but not everyone knows this, and we should play nice.
    key = button.name || button.id;
    caption = goog.dom.getTextContent(button) || button.value;
    if (key) {
      var isDefault = i == 0;
      var isCancel = button.name == goog.ui.Dialog.DefaultButtonKeys.CANCEL;
      this.set(key, caption, isDefault, isCancel);
      if (isDefault) {
        goog.dom.classes.add(button, goog.getCssName(this.class_,
            'default'));
      }
    }
  }
};


/**
 * Sets the default button.
 * @param {string?} key The default button.
 */
goog.ui.Dialog.ButtonSet.prototype.setDefault = function(key) {
  this.defaultButton_ = key;
};


/**
 * Returns the default button.
 * @return {string?} The default button.
 */
goog.ui.Dialog.ButtonSet.prototype.getDefault = function() {
  return this.defaultButton_;
};


/**
 * Sets the cancel button.
 * @param {string?} key The cancel button.
 */
goog.ui.Dialog.ButtonSet.prototype.setCancel = function(key) {
  this.cancelButton_ = key;
};


/**
 * Returns the cancel button.
 * @return {string?} The cancel button.
 */
goog.ui.Dialog.ButtonSet.prototype.getCancel = function() {
  return this.cancelButton_;
};


/**
 * Returns the HTML Button element.
 * @param {string} key The button to return.
 * @return {Element?} The button, if found else null.
 */
goog.ui.Dialog.ButtonSet.prototype.getButton = function(key) {
  var buttons = this.getAllButtons();
  for (var i = 0, nextButton; nextButton = buttons[i]; i++) {
    if (nextButton.name == key || nextButton.id == key) {
      return nextButton;
    }
  }
  return null;
};


/**
 * Returns all the HTML Button elements in the button set container.
 * @return {NodeList} A live NodeList of the buttons.
 */
goog.ui.Dialog.ButtonSet.prototype.getAllButtons = function() {
  return this.element_.getElementsByTagName(goog.dom.TagName.BUTTON);
};


/**
 * The keys used to identify standard buttons in events.
 * @enum {string}
 */
goog.ui.Dialog.DefaultButtonKeys = {
  OK: 'ok',
  CANCEL: 'cancel',
  YES: 'yes',
  NO: 'no',
  SAVE: 'save',
  CONTINUE: 'continue'
};


// Construct some default sets
(function() {

  // TODO: Sharing the button set between instances does not work. We
  // should create factory methods for these instead.

  /** @desc label for a dialog button. */
  var MSG_DIALOG_OK = goog.getMsg('OK');

  /** @desc label for a dialog button. */
  var MSG_DIALOG_CANCEL = goog.getMsg('Cancel');

  /** @desc label for a dialog button. */
  var MSG_DIALOG_YES = goog.getMsg('Yes');

  /** @desc label for a dialog button. */
  var MSG_DIALOG_NO = goog.getMsg('No');

  /** @desc label for a dialog button. */
  var MSG_DIALOG_SAVE = goog.getMsg('Save');

  /** @desc label for a dialog button. */
  var MSG_DIALOG_CONTINUE = goog.getMsg('Continue');

  goog.ui.Dialog.ButtonSet.OK = new goog.ui.Dialog.ButtonSet()
      .set(goog.ui.Dialog.DefaultButtonKeys.OK, MSG_DIALOG_OK, true);

  goog.ui.Dialog.ButtonSet.OK_CANCEL = new goog.ui.Dialog.ButtonSet()
      .set(goog.ui.Dialog.DefaultButtonKeys.OK, MSG_DIALOG_OK, true)
      .set(goog.ui.Dialog.DefaultButtonKeys.CANCEL,
          MSG_DIALOG_CANCEL, false, true);

  goog.ui.Dialog.ButtonSet.YES_NO = new goog.ui.Dialog.ButtonSet()
      .set(goog.ui.Dialog.DefaultButtonKeys.YES, MSG_DIALOG_YES, true)
      .set(goog.ui.Dialog.DefaultButtonKeys.NO, MSG_DIALOG_NO, false, true);

  goog.ui.Dialog.ButtonSet.YES_NO_CANCEL = new goog.ui.Dialog.ButtonSet()
      .set(goog.ui.Dialog.DefaultButtonKeys.YES, MSG_DIALOG_YES)
      .set(goog.ui.Dialog.DefaultButtonKeys.NO, MSG_DIALOG_NO, true)
      .set(goog.ui.Dialog.DefaultButtonKeys.CANCEL, MSG_DIALOG_CANCEL,
          false, true);

  goog.ui.Dialog.ButtonSet.CONTINUE_SAVE_CANCEL =
      new goog.ui.Dialog.ButtonSet()
      .set(goog.ui.Dialog.DefaultButtonKeys.CONTINUE, MSG_DIALOG_CONTINUE)
      .set(goog.ui.Dialog.DefaultButtonKeys.SAVE, MSG_DIALOG_SAVE)
      .set(goog.ui.Dialog.DefaultButtonKeys.CANCEL, MSG_DIALOG_CANCEL,
          true, true);

  goog.ui.Dialog.ButtonSet.SAVE_CANCEL =
      new goog.ui.Dialog.ButtonSet()
      .set(goog.ui.Dialog.DefaultButtonKeys.SAVE, MSG_DIALOG_SAVE)
      .set(goog.ui.Dialog.DefaultButtonKeys.CANCEL, MSG_DIALOG_CANCEL,
          true, true);

})();
