document.addEventListener('DOMContentLoaded',()=>{
  const path=location.pathname;
  document.querySelectorAll('.admin-nav a,.management-nav a,.site-nav a').forEach(a=>{
    const href=a.getAttribute('href');
    if(!href)return;
    const exact = href==='/' ? path==='/' : path===href || path.startsWith(href+'/');
    if(exact)a.classList.add('active');
  });

  document.querySelectorAll('.flash,.admin-flash').forEach(el=>{
    setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .35s ease'},4200);
  });

  document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',()=>{
    const btn=form.querySelector('button[type="submit"],button:not([type])');
    if(!btn||btn.disabled)return;
    const original=btn.textContent;
    btn.disabled=true;
    if(/save/i.test(original))btn.textContent='Saving...';
    else if(/sign in/i.test(original))btn.textContent='Signing in...';
    else if(/place order/i.test(original))btn.textContent='Placing order...';
    else btn.textContent='Working...';
    setTimeout(()=>{btn.disabled=false;btn.textContent=original},4000);
  }));
});
