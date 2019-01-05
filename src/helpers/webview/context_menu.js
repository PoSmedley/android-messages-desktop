// Provide context menus (copy, paste, save image, etc...) for right-click interaction.
// Must not contain certain newer JS syntaxes to allow use inside a webview.

const remote = require('electron').remote;

const Menu = remote.Menu, MenuItem = remote.MenuItem;

const standardMenuTemplate = [
  {
    label: 'Copy',
    role: 'copy',
  },
  {
    type: 'separator',
  },
  {
    label: 'Select All',
    role: 'selectall',
  }
];

const textMenuTemplate = [
  {
    label: 'Undo',
    role: 'undo',
  },
  {
    label: 'Redo',
    role: 'redo',
  },
  {
    type: 'separator',
  },
  {
    label: 'Cut',
    role: 'cut',
  },
  {
    label: 'Copy',
    role: 'copy',
  },
  {
    label: 'Paste',
    role: 'paste',
  },
  {
    type: 'separator',
  },
  {
    label: 'Select All',
    role: 'selectall',
  }
];

const standardInputMenu = Menu.buildFromTemplate(standardMenuTemplate);

const popupContextMenu = async (event, params) => {
  switch (params.mediaType) {
    case 'video':
    case 'image':
      if (params.srcURL && params.srcURL.length) {
        let mediaType = params.mediaType[0].toUpperCase() + params.mediaType.slice(1);
        const mediaInputMenu = Menu.buildFromTemplate([{
          label: `Save ${mediaType} As...`,
          click: () => {
            // This call *would* do this in one line, but is only a thing in IE (???)
            // document.execCommand('SaveAs', true, params.srcURL);
            const link = document.createElement('a');
            link.href = params.srcURL;
            // Leaving the URL root results in the file extension being truncated.
            // The resulting filename from this also appears to be consistent with
            // saving the image via dragging or the Chrome context menu...winning!
            link.download = params.srcURL.replace('blob:https://messages.android.com/', '');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }]);
        mediaInputMenu.popup({
          window: remote.getCurrentWindow(),
          callback: () => {
            mediaInputMenu = null; // Unsure if memory would leak without this (Clean up, clean up, everybody do your share)
          }
        });
      }
      break;
    default:
      if (params.isEditable) {
        const textMenuTemplateCopy = [ ...textMenuTemplate ];
        // TODO: Add guards here to prevent crashes/errors
        // TODO: Possibly gate add to dictionary for non-macOS based on comments in electron-spellchecker source
        // See: context-menu-builder.js and spell-check-handler.js
        if (params.misspelledWord) {
          const booboo = params.selectionText;
          textMenuTemplateCopy.unshift({
            type: 'separator'
          });
          textMenuTemplateCopy.unshift({
            label: `Add ${booboo} to Dictionary`,
            click: function () {
              console.log('wanna get away?', window.spellCheckHandler);
              event.sender.replaceMisspelling(booboo);
              window.spellCheckHandler.currentSpellchecker.add(booboo);
            }
          });
          let corrections = await window.spellCheckHandler.getCorrectionsForMisspelling(params.misspelledWord);
          if (corrections && corrections.length) {
            textMenuTemplateCopy.unshift({
              type: 'separator'
            });
            corrections.forEach(function (correction) {
              let item = {
                label: correction,
                click: function () {
                  return event.sender.replaceMisspelling(correction);
                }
              };

              textMenuTemplateCopy.unshift(item);
            });
          }
        }
        const textInputMenu = Menu.buildFromTemplate(textMenuTemplateCopy);
        textInputMenu.popup(remote.getCurrentWindow());
      } else { // Omit options pertaining to input fields if this isn't one
        standardInputMenu.popup(remote.getCurrentWindow());
      }
  }
};

module.exports = popupContextMenu;
