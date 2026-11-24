
/* Skinz & Bubbles v32: Supabase Auth guest integration.
   Public publishable key only. No private credentials are embedded.
   This preview requires HTTPS and an active internet connection. */
(function(){
  'use strict';
  const PROJECT_URL=window.SB_CONFIG?.url||'';
  const PUBLISHABLE_KEY=window.SB_CONFIG?.publishableKey||'';
  let client=null, user=null, busy=false, initialized=false, tickets=[], error='';
  function warn(e){return String(e?.message||e||'Something went wrong. Please try again.').replace(/\s+/g,' ').slice(0,260)}
  function safeRender(){try{render()}catch(e){console.error('App render issue:',e)}}
  function notice(msg){guestMessage=msg;safeRender()}
  function userPublic(){if(!user)return null;const name=String(user.user_metadata?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Guest');return {id:user.id,name,email:user.email||'',supabase:true}}
  // All guest screens now read ONLY the verified Supabase session.
  guestUser=function(){return userPublic()};
  guestOrders=function(){return tickets.map(t=>({id:t.id,guestId:t.user_id,ticket:t.ticket_type,ticketName:t.ticket_type,status:t.purchase_status,created:t.purchased_at||t.created_at,source:'supabase'}))};
  window.sbSupabase=()=>client; // public SDK handle for developer inspection only.
  function clientReady(){if(client)return true;notice('Could not reach the secure sign-in service. Check your internet connection and reopen the app.');return false}
  guestCreate=async function(ev){
    ev.preventDefault();if(busy||!clientReady())return;
    const f=new FormData(ev.target),name=String(f.get('name')||'').trim(),email=String(f.get('email')||'').trim().toLowerCase(),password=String(f.get('password')||''),confirm=String(f.get('confirm')||'');
    if(name.length<2)return guestFormError('Enter your full name.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return guestFormError('Enter a valid email address.');
    if(password.length<8)return guestFormError('Use a password of at least 8 characters.');
    if(password!==confirm)return guestFormError('Your passwords do not match.');
    if(f.get('privacy')!=='on')return guestFormError('Please acknowledge the Privacy Policy.');
    busy=true;const button=ev.target.querySelector('button[type="submit"]');if(button){button.disabled=true;button.textContent='CREATING ACCOUNT…'}
    try{
      const {data,error:authError}=await client.auth.signUp({email,password,options:{data:{display_name:name,marketing_opt_in:f.get('marketing')==='on',privacy_acknowledged_at:new Date().toISOString()}}});
      if(authError)throw authError;
      if(data.session){user=data.user;await refreshTickets();guestView(db.pendingTicketCheckout&&db.ticket?'Guest Checkout':'Guest Dashboard');flash('Your secure account is ready!')}
      else{db.view='Guest Login';notice('Check your email for a confirmation link. After confirming, return here to sign in. If an account already exists, use Sign In or reset your password.')}
    }catch(e){guestFormError(warn(e))}finally{busy=false;if(button){button.disabled=false;button.textContent='CREATE MY BUBBLES ACCOUNT →'}}
  };
  guestSignIn=async function(ev){
    ev.preventDefault();if(busy||!clientReady())return;
    const f=new FormData(ev.target),email=String(f.get('email')||'').trim().toLowerCase(),password=String(f.get('password')||'');
    busy=true;const button=ev.target.querySelector('button[type="submit"]');if(button){button.disabled=true;button.textContent='SIGNING IN…'}
    try{
      const {data,error:authError}=await client.auth.signInWithPassword({email,password});if(authError)throw authError;
      user=data.user;await refreshTickets();guestView(db.pendingTicketCheckout&&db.ticket?'Guest Checkout':'Guest Dashboard');flash('Signed in securely!')
    }catch(e){guestFormError(warn(e))}finally{busy=false;if(button){button.disabled=false;button.textContent='SIGN IN →'}}
  };
  guestSignOut=async function(){
    if(!clientReady())return;
    const {error:authError}=await client.auth.signOut();if(authError)return notice(warn(authError));
    user=null;tickets=[];db.guestSession=null;db.guests=[];save();guestView('Guest Access');flash('Signed out');
  };
  window.guestResetPassword=async function(){
    if(!clientReady())return;
    const email=document.getElementById('sb-reset-email')?.value?.trim()||'';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return notice('Please enter your email address first.');
    const {error:authError}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(authError)return notice(warn(authError));
    notice('If an account exists, a password reset email has been sent. Check your inbox and spam folder.');
  };
  // Preserve the original design, but replace the old demo-security messages.
  const previousGuestAccount=guestAccount;
  guestAccount=function(){return previousGuestAccount().replace('Preview access only: use fictional details and a unique password. This browser does not securely store real accounts.','Guest accounts use Supabase Authentication. Confirm your email if prompted. Ticket purchases are not yet connected.')};
  const previousGuestLogin=guestLogin;
  guestLogin=function(){return previousGuestLogin()
    .replace('Account recovery and access across devices will be available at launch.','Your guest login is secured by Supabase Authentication. Ambassador and staff demo logins are separate and not connected yet.')
    .replace('</form><p class="guest-notice">','</form><div style="margin:12px 0"><label style="display:block;font-size:13px">Forgot password? Enter your account email<input id="sb-reset-email" type="email" autocomplete="email" placeholder="you@example.com" style="margin-top:6px;width:100%"></label><button type="button" class="btn aqua small" onclick="guestResetPassword()" style="margin-top:8px">SEND RESET EMAIL</button><button type="button" class="btn aqua small" onclick="sbSetNewPassword()" style="margin:8px 0 0 8px">SET NEW PASSWORD (EMAIL LINK)</button></div><p class="guest-notice">')};
  const previousGuestDashboard=guestDashboard;
  guestDashboard=function(){return previousGuestDashboard().replace('Your saved ticket selections appear under My Tickets. Real paid orders and scannable QR tickets will only be available once Eventin Pro is securely connected.','Your My Tickets page will display verified Supabase ticket records after secure Eventin Pro checkout integration. No demo selection is treated as a paid ticket.')};
  const previousAccountHome=accountHome;
  accountHome=function(){return previousAccountHome().replace('Ticket purchases and shared accounts will be available when secure checkout is connected. This version is for testing only.','Guest accounts now use Supabase Authentication. Ticket checkout and ambassador/staff access are still preview features.')};
  // The legacy My Tickets view expected local demo order fields; render only verified read-only database records.
  const oldGuestExtras=guestExtras;
  guestExtras=function(kind){
    if(kind!=='Guest Orders')return oldGuestExtras(kind);
    if(!guestUser())return oldGuestExtras(kind);
    return `<button class="back" onclick="navigate('Account')">← My Account</button><h1>My <em>Tickets</em></h1><div class="guest-panel"><h3>Ticket records</h3>${tickets.length?tickets.map(t=>`<div class="guest-ticket"><span class="guest-em">🎟</span><div><strong>${E(t.ticket_type)}</strong><small>Order status: ${E(t.purchase_status)} · ${E(t.id)}</small></div></div>`).join(''):'<p>No verified tickets are linked to this account yet.</p>'}<div class="guest-status warn">Tickets will appear after Eventin Pro has been securely connected and the order verified. This app does not sell tickets yet.</div>${btn('EXPLORE TICKETS',"navigate('Tickets')")}</div>`;
  };
  async function refreshTickets(){
    tickets=[];if(!client||!user)return;
    const {data,error:ticketError}=await client.from('tickets').select('id,user_id,ticket_type,purchase_status,purchased_at,created_at').eq('user_id',user.id).order('created_at',{ascending:false});
    if(!ticketError&&Array.isArray(data))tickets=data;
    else if(ticketError)console.info('Ticket table is not configured yet (expected until SQL setup):',ticketError.message);
    safeRender();
  }
  // No local guest password checking is allowed: all calls have been overridden above.
  async function init(){
    // Remove any legacy, insecure guest passwords from the saved demo state.
    db.guests=[];db.guestSession=null;db.guestOrders=[];save();
    if(!window.supabase?.createClient){error='Supabase sign-in library did not load. Open this app online with an internet connection.';notice(error);return}
    client=window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
    const {data:{session},error:authError}=await client.auth.getSession();
    if(authError)console.warn('Supabase session:',authError.message);
    user=session?.user||null;initialized=true;
    client.auth.onAuthStateChange((event,session)=>{
      user=session?.user||null;
      if(event==='PASSWORD_RECOVERY'){guestView('Guest Login');notice('Password recovery link received. Click Set New Password below.');}
      if(!user)tickets=[];
      safeRender();
      if(user)setTimeout(refreshTickets,0);
    });
    if(user)await refreshTickets();
    safeRender();
  }
  // After account recovery link, allow setting a new password.
  window.sbSetNewPassword=async function(){const pwd=prompt('Enter a new password (at least 8 characters)');if(!pwd)return;if(pwd.length<8)return notice('Password must contain at least 8 characters.');const {error:e}=await client.auth.updateUser({password:pwd});if(e)return notice(warn(e));notice('Password updated. You can now sign in.')};
  init();
})();
