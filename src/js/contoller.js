// FILE: src/js/controller.js  (compat: no private methods)
import { ChatModel } from './model.js';
import { ChatView } from './view.js';
import { generateReply } from './eliza.js';

export class ChatController {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    // bind methods (no private methods needed)
    this.handleSend = this.handleSend.bind(this);
    this.handleExport = this.handleExport.bind(this);
    this.handleImport = this.handleImport.bind(this);
    this.handleClear = this.handleClear.bind(this);
    this.handleEditSave = this.handleEditSave.bind(this);
    this.handleDelete = this.handleDelete.bind(this);

    // Model → View
    this.model.subscribe(({ messages, lastSaved, count }) => {
      this.view.setStats(count, lastSaved);
      this.view.render(messages);
    });

    // View → Controller
    this.view.onSend(this.handleSend);
    this.view.onExport(this.handleExport);
    this.view.onImport(this.handleImport);
    this.view.onClear(this.handleClear);
    this.view.onEdit((id) => this.view.setEditing(id, true));
    this.view.onCancelEdit((id) => this.view.setEditing(id, false));
    this.view.onSaveEdit(this.handleEditSave);
    this.view.onDelete(this.handleDelete);
  }

  handleSend(text){
    if(!text) return;
    try{
      const user = this.model.createMessage(text, true);
      const reply = generateReply(user.text);
      this.model.createMessage(reply, false);
    }catch(err){ alert(err.message); }
  }

  handleEditSave(id,text){ try{ this.model.updateMessage(id,text);}catch(err){ alert(err.message);} }

  handleDelete(id){ if(!confirm('Delete this message?')) return; this.model.deleteMessage(id); }

  handleClear(){ if(!confirm('Clear the entire chat history? This cannot be undone.')) return; this.model.clear(); }

  handleExport(){
    const json=this.model.exportJSON();
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=Object.assign(document.createElement('a'),{href:url,download:`chat-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`});
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  handleImport(json){
    try{ if(!confirm('Import will replace current chat. Continue?')) return; this.model.importJSON(json); }
    catch(err){ alert(`Import failed: ${err.message}`); }
  }
}
