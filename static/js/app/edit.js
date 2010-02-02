;(function() {

    // jquery
    google.load("jquery", "1");

    // closure
    goog.require('goog.dom');
    goog.require('goog.editor.Command');
    goog.require('goog.editor.SeamlessField');
    // goog.require('goog.editor.Field');
    goog.require('goog.editor.plugins.BasicTextFormatter');
    goog.require('goog.editor.plugins.EnterHandler');
    goog.require('goog.editor.plugins.HeaderFormatter');
    goog.require('goog.editor.plugins.ListTabHandler');
    goog.require('goog.editor.plugins.LoremIpsum');
    goog.require('goog.editor.plugins.RemoveFormatting');
    goog.require('goog.editor.plugins.SpacesTabHandler');
    goog.require('goog.editor.plugins.UndoRedo');
    goog.require('goog.ui.editor.DefaultToolbar');
    goog.require('goog.ui.editor.ToolbarController');

    // MAIN
    var main = function() {
        // Create an editable field.
        // var myField = new goog.editor.Field('edit_content');
        var myField = new goog.editor.SeamlessField('edit_content');

        function updateFieldContents() {
            goog.dom.$('content').value = myField.getCleanContents();
        }

        // Create and register all of the editing plugins you want to use.
        myField.registerPlugin(new goog.editor.plugins.BasicTextFormatter());
        myField.registerPlugin(new goog.editor.plugins.RemoveFormatting());
        myField.registerPlugin(new goog.editor.plugins.UndoRedo());
        myField.registerPlugin(new goog.editor.plugins.ListTabHandler());
        myField.registerPlugin(new goog.editor.plugins.SpacesTabHandler());
        myField.registerPlugin(new goog.editor.plugins.EnterHandler());
        myField.registerPlugin(new goog.editor.plugins.HeaderFormatter());
        myField.registerPlugin(
            new goog.editor.plugins.LoremIpsum('Click here to edit'));
        
        
        // Specify the buttons to add to the toolbar, using built in default buttons.
        var buttons = [
            goog.editor.Command.BOLD,
            goog.editor.Command.ITALIC,
            goog.editor.Command.UNDERLINE,
            goog.editor.Command.FONT_COLOR,
            goog.editor.Command.BACKGROUND_COLOR,
            goog.editor.Command.FONT_FACE,
            goog.editor.Command.FONT_SIZE,
            goog.editor.Command.UNDO,
            goog.editor.Command.REDO,
            goog.editor.Command.UNORDERED_LIST,
            goog.editor.Command.ORDERED_LIST,
            goog.editor.Command.INDENT,
            goog.editor.Command.OUTDENT,
            goog.editor.Command.JUSTIFY_LEFT,
            goog.editor.Command.JUSTIFY_CENTER,
            goog.editor.Command.JUSTIFY_RIGHT,
            goog.editor.Command.SUBSCRIPT,
            goog.editor.Command.SUPERSCRIPT,
            goog.editor.Command.STRIKE_THROUGH,
            goog.editor.Command.REMOVE_FORMAT
        ];
        var myToolbar = goog.ui.editor.DefaultToolbar.makeToolbar(buttons, goog.dom.$('toolbar'));
        
        // Hook the toolbar into the field.
        var myToolbarController = new goog.ui.editor.ToolbarController(myField, myToolbar);
        
        // Watch for field changes, to display below.
        goog.events.listen(myField, goog.editor.Field.EventType.DELAYEDCHANGE, updateFieldContents);
        $('#display_change').click(function() {
            myField.setHtml(false, goog.dom.$('content').value);
        });

        myField.makeEditable();
        updateFieldContents();
    }

    google.setOnLoadCallback(main);

})();