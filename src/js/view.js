// FILE: src/js/view.js  (compat: no private fields)
export class ChatView {
    constructor() {
      // callback placeholders
      this._onEdit = null;
      this._onDelete = null;
      this._onSaveEdit = null;
      this._onCancelEdit = null;
  
      this.$ = {
        messages: document.getElementById('messages'),
        empty: document.getElementById('emptyState'),
        count: document.getElementById('messageCount'),
        lastSaved: document.getElementById('lastSaved'),
        form: document.getElementById('sendForm'),
        input: document.getElementById('messageInput'),
        exportBtn: document.getElementById('exportBtn'),
        importBtn: document.getElementById('importBtn'),
        importFile: document.getElementById('importFile'),
        clearBtn: document.getElementById('clearBtn'),
        chat: document.getElementById('chat'),
      };
  
      this.$.messages.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]'); if (!btn) return;
        const li = btn.closest('li.msg'); if (!li) return;
        const id = li.dataset.id; if (!id) return;
        const action = btn.dataset.action;
        if (action === 'edit'   && this._onEdit)     this._onEdit(id);
        if (action === 'delete' && this._onDelete)   this._onDelete(id);
        if (action === 'save'   && this._onSaveEdit) this._onSaveEdit(id, li.querySelector('.edit-input').value);
        if (action === 'cancel' && this._onCancelEdit) this._onCancelEdit(id);
      });
    }
  
    onSend(cb){ this.$.form.addEventListener('submit', (e)=>{ e.preventDefault(); cb(this.consumeInput()); }); }
    onExport(cb){ this.$.exportBtn.addEventListener('click', cb); }
    onImport(cb){
      this.$.importBtn.addEventListener('click', ()=> this.$.importFile.click());
      this.$.importFile.addEventListener('change', async ()=>{
        const f=this.$.importFile.files?.[0]; if(!f) return;
        const text=await f.text(); cb(text); this.$.importFile.value='';
      });
    }
    onClear(cb){ this.$.clearBtn.addEventListener('click', cb); }
    onEdit(cb){ this._onEdit = cb; }
    onDelete(cb){ this._onDelete = cb; }
    onSaveEdit(cb){ this._onSaveEdit = cb; }
    onCancelEdit(cb){ this._onCancelEdit = cb; }
  
    consumeInput(){ const v=this.$.input.value.trim(); if(v) this.$.input.value=''; return v; }
  
    render(messages){
      this.$.messages.innerHTML='';
      for (const m of messages) this.$.messages.appendChild(this.messageEl(m));
      this.toggleEmpty(messages.length===0);
      this.scrollToBottom();
    }
  
    addMessage(m){ this.toggleEmpty(false); this.$.messages.appendChild(this.messageEl(m)); this.scrollToBottom(); }
    updateMessage(m){
      const li=this.$.messages.querySelector(`li[data-id="${m.id}"]`); if(!li) return;
      li.querySelector('.content').textContent=m.text;
      li.querySelector('.edited-badge').hidden=!m.edited;
      li.classList.remove('editing');
    }
    removeMessage(id){
      const li=this.$.messages.querySelector(`li[data-id="${id}"]`); if(li) li.remove();
      this.toggleEmpty(this.$.messages.children.length===0);
    }
  
    toggleEmpty(on){ this.$.empty.style.display = on ? 'block' : 'none'; }
    setStats(count,lastSavedIso){
      this.$.count.textContent = `${count} ${count===1?'message':'messages'}`;
      this.$.lastSaved.textContent = lastSavedIso ? `Last saved: ${this.fmt(lastSavedIso)}` : 'Not saved yet';
    }
    setEditing(id,on){
      const li=this.$.messages.querySelector(`li[data-id="${id}"]`); if(!li) return;
      li.classList.toggle('editing', !!on);
      if(on){
        const input=li.querySelector('.edit-input');
        input.value=li.querySelector('.content').textContent;
        input.focus();
        input.selectionStart=input.value.length;
      }
    }
    scrollToBottom(){ this.$.chat.scrollTop = this.$.chat.scrollHeight; }
  
    // formerly #messageEl
    messageEl(m){
      const li=document.createElement('li');
      li.className=`msg ${m.isUser?'user':'bot'}`; li.dataset.id=m.id;
      li.innerHTML=`
        <div class="meta">
          <strong>${m.isUser ? 'You' : 'Eliza'}</strong>
          <span>${this.fmt(m.timestamp)}</span>
          <span class="edited-badge"${m.edited?'':' hidden'}>(edited)</span>
          ${m.isUser ? `<span class="controls">
              <button data-action="edit" title="Edit">Edit</button>
              <button data-action="delete" title="Delete">Delete</button>
            </span>` : ''}
        </div>
        <div class="content"></div>
        <div class="edit-row">
          <input class="edit-input" aria-label="Edit message"/>
          <button data-action="save">Save</button>
          <button data-action="cancel">Cancel</button>
        </div>`;
      li.querySelector('.content').textContent=m.text;
      return li;
    }
  
    // formerly #fmt
    fmt(iso){ try{ return new Date(iso).toLocaleString(); }catch{ return iso||''; } }
  }
  