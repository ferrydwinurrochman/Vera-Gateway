<?php
/* VERA GATE - Payment Gateway (PHP + SQLite). Tanpa Python, tinggal upload ke cPanel.
   Fitur: landing top-up, QRIS (+QR asli saat LIVE Golden Pay), login/daftar, role admin/operator,
   dashboard (filter API/status/metode/periode/rentang tgl + cari + pagination + aksi),
   Payment Link, Report(+PDF), Tools (CSV/JSON/reset), User & Merchant Management,
   Pengaturan Provider (Golden Pay), webhook /callback, dark mode. */
error_reporting(E_ALL); ini_set('display_errors', '0');
date_default_timezone_set('Asia/Jakarta');
session_start();
/* ====== flypay.php (inlined) ====== */
function flypay_sign($data, $secret) {
    ksort($data); // Urutkan abjad a-z sesuai dokumen
    $arr = [];
    foreach ($data as $k => $v) {
        // notifyUrl dan sn tidak ikut dienkripsi
        if ($k === 'sn' || $k === 'notifyUrl') continue; 
        $arr[] = "{$k}=" . urlencode($v); 
    }
    $arr[] = "secret={$secret}";
    $str = join('', $arr);
    // WAJIB: Dokumen meminta spasi (%20) diubah menjadi tanda plus (+)
    $str = str_replace('%20', '+', $str); 
    return md5($str);
}

function flypay_create_deposit($ref, $amount, $customer, $cb_url) {
    $appid = '4183'; 
    $secret = 'XEsiyowsnSBiDvYXFBLEPHnjhwlSIpMo';
    $url = 'https://api.idmapi66.com/app/pay/pay.php';

    $payload = [
        'appid' => $appid,
        'order' => $ref,
        'payType' => 'QRIS',
        'price' => (string)$amount,
        'uid' => $customer ?: 'user',
        'notifyUrl' => $cb_url
    ];
    $payload['sn'] = flypay_sign($payload, $secret);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    
    // Wajib URL-Encoded
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload)); 
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4); 
    curl_setopt($ch, CURLOPT_INTERFACE, '145.79.14.43'); 

    $res = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($res, true);
    if (!$data || (isset($data['e']) && $data['e'] != 0)) {
        throw new Exception('Flypay Error: ' . ($data['m'] ?? $res));
    }

    
    $qr = '';
    if (!empty($data['d']['gr'])) {
        $qr = $data['d']['gr'];
    } elseif (!empty($data['d']['h5'])) {
        $qr = $data['d']['h5'];
    } elseif (!empty($data['data']['qr'])) {
        $qr = $data['data']['qr'];
    }
    
    return [$qr, $ref, $data];
}

function flypay_parse_callback($p) {
    // Callback deposit Flypay tidak mengirim parameter 'status', hanya memanggil URL jika sukses
    $ref = $p['order'] ?? ($p['orderId'] ?? '');
    $pengirim = $p['uid'] ?? '-';
    $metode = 'QRIS'; 
    $status = 'menunggu';

    if (isset($p['status'])) {
        if ($p['status'] == 3 || $p['status'] == 4 || $p['status'] == 5 || strtolower($p['status']) === 'success') {
            $status = 'sukses'; 
        } elseif ($p['status'] == 0 || $p['status'] == 6) {
            $status = 'gagal';
        }
    } elseif (isset($p['transaction_id'])) {
        $status = 'sukses';
    } else {
        $status = 'sukses'; 
    }
    return [$ref, $status, $metode, $pengirim];
}

function flypay_create_withdrawal($ref, $bankCode, $accountNumber, $accountName, $amount) {
    $appid = '4181'; 
    $secret = 'ljB6NAygp7J2RQ6NyRYACyaTeNVfcc7e'; 
    $url = 'https://api.idmstars.com/api/banksub.php';

    $payload = [
        'appid' => $appid,
        'bankMark' => $bankCode,
        'money' => (string)$amount, // Wajib 'money' untuk Withdrawal
        'name' => $accountName,
        'orderId' => $ref, // Wajib 'orderId' untuk Withdrawal
        'recAcc' => $accountNumber
    ];
    $payload['sn'] = flypay_sign($payload, $secret);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload); 
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4); 
    curl_setopt($ch, CURLOPT_INTERFACE, '145.79.14.43'); 

    $res = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($res, true);
    if (!$data || (isset($data['code']) && $data['code'] != 0)) {
        throw new Exception('Flypay Withdrawal Error: ' . ($data['desc'] ?? $data['msg'] ?? $res));
    }
    return $data;
}

function flypay_check_status($ref) {
    $is_wd = (substr($ref, 0, 3) === 'WD-');
    
    if ($is_wd) {
        $appid = '4181'; 
        $secret = 'ljB6NAygp7J2RQ6NyRYACyaTeNVfcc7e'; 
        $url = 'https://api.idmstars.com/api/bankfind.php';
        $payload = ['appid' => $appid, 'orderId' => $ref];
    } else {
        $appid = '4183'; 
        $secret = 'XEsiyowsnSBiDvYXFBLEPHnjhwlSIpMo';
        $url = 'https://api.idmapi66.com/app/pay/search.php';
        $payload = ['appid' => $appid, 'order' => $ref];
    }
    
    $payload['sn'] = flypay_sign($payload, $secret);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload); 
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4); 
    curl_setopt($ch, CURLOPT_INTERFACE, '145.79.14.43'); 

    $res = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($res, true);
    
    if ($is_wd) {
        if ($data && isset($data['data']['status'])) {
            $st = $data['data']['status'];
            if ($st == 4) return 'sukses';
            if ($st == 5 || $st == 0) return 'gagal';
        }
    } else {
        if ($data && isset($data['d']['status'])) {
            $st = $data['d']['status'];
            if ($st == 3 || $st == 5) return 'sukses';
            if ($st == 0 || $st == 6) return 'gagal';
        }
    }
    return 'menunggu';
}
/* ====== end flypay.php ====== */
if (file_exists(__DIR__.'/config.local.php')) require __DIR__.'/config.local.php'; // kredensial opsional (jangan dibagikan)

define('DB_PATH', __DIR__.'/data/veragate.sqlite');
define('ADMIN_PASS', getenv('VERAGATE_ADMIN_PASSWORD') ?: 'veragate');

define('VG_CSS', <<<'VGCSS'
*{margin:0;padding:0;box-sizing:border-box}
:root{
 --navy:#16304F;--navy-2:#0F2238;--blue:#2C5C92;--blue-deep:#1E456F;--blue-50:#ECF1F7;--blue-100:#D6E1EF;
 --ink:#13243A;--muted:#5E6B80;--line:#E4E9F1;--bg:#F3F6FB;--surface:#FFFFFF;
 --green:#1E7E4C;--green-bg:#E3F3EA;--amber:#B97D0A;--amber-bg:#FBEFD2;--red:#C5362B;--red-bg:#FBE6E6;
 --grad:linear-gradient(135deg,#3D6CA6,#16304F);
}
.dark{
 --ink:#E8EEF7;--muted:#8C99AE;--line:#1C2A3C;--bg:#070D16;--surface:#0E1A2A;--blue-50:#122740;--blue-100:#173153;
 --green-bg:#0E2418;--amber-bg:#2A2008;--red-bg:#2A1212;--navy:#0E1A2A;
}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;transition:background .3s,color .3s}
a{text-decoration:none;color:inherit}
.mono{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}
img{max-width:100%}

.brand{display:flex;align-items:center;gap:11px}
.brand .chip{width:42px;height:42px;border-radius:11px;background:#fff;display:grid;place-items:center;box-shadow:0 4px 12px -5px rgba(19,36,58,.4);flex:none}
.brand .chip img{width:30px;height:30px;object-fit:contain}
.brand .wm{font-weight:800;font-size:18px;letter-spacing:-.3px;line-height:1.05}
.brand .wm small{display:block;font-size:10px;font-weight:700;letter-spacing:.16em;color:var(--muted);margin-top:3px}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;background:var(--grad);color:#fff;font-weight:700;font-size:15px;padding:14px 20px;border-radius:12px;border:none;cursor:pointer;width:100%}
.btn svg{width:17px;height:17px}
.btn.alt{background:var(--surface);color:var(--ink);border:1.5px solid var(--line)}
.btn.sm{padding:9px 16px;font-size:13px;border-radius:9px;width:auto}
.field{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.field label{font-size:13px;font-weight:700}
.field input,.field select{font-family:inherit;font-size:15px;color:var(--ink);background:var(--surface);border:1.5px solid var(--line);border-radius:12px;padding:13px 15px;width:100%}
.field input:focus,.field select:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 4px var(--blue-50)}
.ip-rp{position:relative}.ip-rp input{padding-left:42px}.ip-rp .pre{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--muted);font-weight:600}

.center{min-height:100vh;display:grid;place-items:center;padding:40px;position:relative;overflow:hidden}
.center:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 0% 0%,var(--blue-50),transparent 42%),radial-gradient(circle at 100% 100%,var(--blue-50),transparent 42%)}
.card{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:36px;width:430px;box-shadow:0 30px 70px -42px rgba(19,36,58,.45)}
.card .logo-top{display:flex;justify-content:center;margin-bottom:8px}.card .logo-top img{height:60px;object-fit:contain}
.card h1{font-size:23px;font-weight:800;letter-spacing:-.5px;text-align:center;margin:14px 0 4px}
.card .sub{font-size:14px;color:var(--muted);margin-bottom:24px;text-align:center}
.backlink{display:block;text-align:center;margin-top:16px;font-size:13px;color:var(--muted);font-weight:600}
.flash{padding:12px 15px;border-radius:11px;font-size:13px;font-weight:600;margin-bottom:16px}
.flash.err{background:var(--red-bg);color:var(--red)}.flash.ok{background:var(--green-bg);color:var(--green)}

/* shell */
.shell{display:grid;grid-template-columns:250px 1fr;min-height:100vh}
.side{background:var(--surface);border-right:1px solid var(--line);padding:18px 16px;display:flex;flex-direction:column;gap:3px}
.side .merchant{background:var(--blue-50);border:1px solid var(--blue-100);border-radius:14px;padding:12px 15px;margin:14px 0 8px}
.side .merchant .l{font-size:11px;color:var(--muted);font-weight:600}.side .merchant .n{font-size:14px;font-weight:800;color:var(--blue)}
.side .grp{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:13px 12px 6px}
.nav{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:11px;font-size:14px;font-weight:600;color:var(--muted);cursor:pointer}
.nav svg{width:18px;height:18px}.nav.on{background:var(--grad);color:#fff}
.main{display:flex;flex-direction:column;min-width:0}
.topbar{height:64px;background:var(--navy);display:flex;align-items:center;justify-content:space-between;padding:0 24px;color:#fff}
.topbar .r{display:flex;align-items:center;gap:14px;font-size:13px;font-weight:600}
.topbar .pill{background:rgba(255,255,255,.16);padding:5px 12px;border-radius:100px;font-size:12px;font-weight:700;letter-spacing:.05em}
.topbar .ava{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.2);display:grid;place-items:center}
.topbar .tg{cursor:pointer;display:grid;place-items:center}
.content{padding:24px 26px;display:flex;flex-direction:column;gap:18px}

.apis{display:flex;gap:8px;flex-wrap:wrap}
.apitab{display:flex;align-items:center;gap:8px;border:1.5px solid var(--line);background:var(--surface);border-radius:11px;padding:9px 15px;font-size:13px;font-weight:700;color:var(--muted);cursor:pointer}
.apitab .dot{width:8px;height:8px;border-radius:50%;background:#C3CAD8}
.apitab.on{border-color:var(--blue);background:var(--blue-50);color:var(--blue)}.apitab.on .dot{background:var(--blue)}

.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.sc{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px}
.sc .l{font-size:12px;color:var(--muted);font-weight:600;display:flex;align-items:center;gap:7px}
.sc .l .ic{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;font-size:12px}
.sc .v{font-size:22px;font-weight:800;margin-top:9px;letter-spacing:-.5px}

.filters{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px;display:flex;gap:12px;align-items:end;flex-wrap:wrap}
.fg{display:flex;flex-direction:column;gap:6px}.fg label{font-size:11px;color:var(--muted);font-weight:700}
.fg select{border:1.5px solid var(--line);border-radius:10px;padding:9px 13px;font-size:13px;min-width:150px;color:var(--ink);background:var(--surface);font-family:inherit}

.tablecard{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.table-scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{text-align:left;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:14px 16px;background:var(--bg);border-bottom:1px solid var(--line);white-space:nowrap}
tbody td{padding:14px 16px;border-bottom:1px solid var(--line);white-space:nowrap;color:var(--ink)}
tbody tr:last-child td{border-bottom:none}
.uname{display:inline-flex;align-items:center;gap:7px;background:var(--blue-50);color:var(--blue);font-weight:700;padding:4px 10px;border-radius:8px;font-size:12px}
.met{display:inline-flex;align-items:center;gap:7px;font-weight:600}
.met .d{width:8px;height:8px;border-radius:50%}
.met .d.bank{background:var(--blue)}.met .d.ewallet{background:var(--green)}
.amt{font-weight:700}
.badge{font-size:11px;font-weight:800;padding:5px 11px;border-radius:8px;letter-spacing:.03em}
.badge.menunggu{background:var(--amber-bg);color:var(--amber)}.badge.sukses{background:var(--green-bg);color:var(--green)}.badge.gagal{background:var(--red-bg);color:var(--red)}
.muted{color:var(--muted)}
.empty{padding:40px;text-align:center;color:var(--muted);font-size:14px}

/* qris */
.qrwrap{display:grid;place-items:center;margin:4px 0 16px}
.qrbox{background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px;box-shadow:0 10px 30px -18px rgba(19,36,58,.4)}
.qrcap{display:flex;justify-content:space-between;font-size:13px;padding:11px 0;border-bottom:1px dashed var(--line)}.qrcap:last-child{border:none}
.qrcap .k{color:var(--muted);font-weight:600}.qrcap .v{font-weight:700}
.timer{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--amber-bg);color:var(--amber);font-weight:700;font-size:13px;padding:10px;border-radius:11px;margin-bottom:16px}
.success-box{background:var(--green-bg);color:var(--green);border-radius:14px;padding:20px;text-align:center;margin-bottom:8px}
.success-box .ic{width:48px;height:48px;border-radius:50%;background:var(--green);display:grid;place-items:center;margin:0 auto 10px}
.sim{margin-top:18px;border-top:1px dashed var(--line);padding-top:18px}
.sim .lbl{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;text-align:center}

/* action buttons & api settings & logo badge */
.abtn{font-size:11px;font-weight:700;padding:6px 11px;border-radius:8px;border:1.5px solid var(--line);background:var(--surface);color:var(--blue);cursor:pointer;margin-right:6px}
.abtn.del{color:var(--red)}
.act{white-space:nowrap}
.apirow{display:grid;grid-template-columns:1.1fr 1.4fr 1fr auto;gap:12px;align-items:end;padding:14px 0;border-bottom:1px dashed var(--line)}
.apirow:last-of-type{border-bottom:none}
.apirow .field{margin-bottom:0}
.apirow .abtn.del{height:44px;align-self:end;margin-right:0}
.card .logo-top img{background:#fff;border-radius:12px;padding:6px 12px}
.fg input{border:1.5px solid var(--line);border-radius:10px;padding:9px 13px;font-size:13px;color:var(--ink);background:var(--surface);font-family:inherit;min-width:240px}
.fg input:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 4px var(--blue-50)}

/* dark mode: perbaiki kontrol native (select/date) agar teks terlihat */
.dark{color-scheme:dark}
.dark .fg select,.dark .fg input,.dark .field select,.dark .field input{color:var(--ink);background:var(--surface)}
.dark .fg select option,.dark .field select option{background:var(--surface);color:var(--ink)}

/* badge status & role */
.badge.aktif{background:var(--green-bg);color:var(--green)}
.badge.pending{background:var(--amber-bg);color:var(--amber)}
.badge.nonaktif{background:var(--red-bg);color:var(--red)}
.badge.admin{background:var(--blue-50);color:var(--blue)}
.badge.operator{background:var(--line);color:var(--muted)}
.rowform{display:inline;margin:0}
.linkrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* pagination */
.pager{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 4px 2px}
.pager .info{font-size:12px;color:var(--muted)}
.pager .pp{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)}
.pager .pp select{border:1.5px solid var(--line);border-radius:9px;padding:7px 10px;font-size:13px;color:var(--ink);background:var(--surface);font-family:inherit}
.pager .nums{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.pg{min-width:34px;height:34px;display:grid;place-items:center;padding:0 9px;border:1.5px solid var(--line);border-radius:9px;font-size:13px;font-weight:700;color:var(--ink);background:var(--surface);cursor:pointer}
.pg.on{background:var(--grad);color:#fff;border-color:transparent}
.pg.dis{opacity:.45;pointer-events:none}
.pg.dots{border:none;background:transparent;cursor:default;font-weight:600;color:var(--muted)}

/* status kedaluwarsa + label sumber verifikasi */
.badge.kedaluwarsa{background:var(--line);color:var(--muted)}
.verif{font-size:10px;color:var(--muted);margin-top:4px;letter-spacing:.02em}
.verif b{color:var(--blue);font-weight:700}
.verifbox{background:var(--blue-50);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--ink);margin-top:10px;text-align:left}
.verifbox .k{color:var(--muted)}

/* ===== Responsive / mobile ===== */
.hb{display:none;background:transparent;border:0;cursor:pointer;padding:6px;margin-right:6px;color:#fff}
.side-backdrop{display:none;position:fixed;inset:0;background:rgba(8,18,33,.5);z-index:40}
.side-backdrop.show{display:block}
@media (max-width:860px){
  .shell{grid-template-columns:1fr}
  .side{position:fixed;top:0;left:0;bottom:0;width:248px;z-index:50;transform:translateX(-100%);transition:transform .25s ease;box-shadow:0 0 60px -10px rgba(8,18,33,.55);overflow-y:auto}
  .side.open{transform:translateX(0)}
  .hb{display:grid;place-items:center}
  .topbar{padding:0 14px}
  .topbar .r{gap:9px}
  .topbar .r > span:not(.pill):not(.ava):not(.tg){display:none}
  .content{padding:16px 14px;gap:14px}
  .summary{grid-template-columns:repeat(2,1fr)}
  .filters{align-items:stretch}
  .filters .fg{flex:1 1 140px}
  .apirow{grid-template-columns:1fr;gap:10px}
  .pager{flex-direction:column;align-items:stretch;gap:10px}
  .center{padding:18px}
  .card{width:100%;max-width:440px;padding:24px;border-radius:18px}
}
@media (max-width:480px){
  .summary{grid-template-columns:1fr}
  .apis{gap:6px}
  .card h1{font-size:21px}
}

VGCSS
);
define('VG_JS', <<<'VGJS'
// dark mode toggle (persist via localStorage)
(function(){
  var saved = localStorage.getItem('vg-theme');
  if(saved==='dark') document.documentElement && document.body && document.body.classList.add('dark');
})();
function vgToggleTheme(){
  document.body.classList.toggle('dark');
  localStorage.setItem('vg-theme', document.body.classList.contains('dark')?'dark':'light');
}
document.addEventListener('DOMContentLoaded', function(){
  if(localStorage.getItem('vg-theme')==='dark') document.body.classList.add('dark');
  var tg=document.getElementById('themeBtn');
  if(tg) tg.addEventListener('click', vgToggleTheme);
});

// mobile sidebar drawer
document.addEventListener('DOMContentLoaded', function(){
  var hb=document.getElementById('hbBtn'), sn=document.getElementById('sideNav'), bd=document.getElementById('sideBackdrop');
  if(!hb||!sn) return;
  function closeNav(){ sn.classList.remove('open'); if(bd) bd.classList.remove('show'); }
  hb.addEventListener('click', function(){ sn.classList.toggle('open'); if(bd) bd.classList.toggle('show'); });
  if(bd) bd.addEventListener('click', closeNav);
  Array.prototype.forEach.call(sn.querySelectorAll('a'), function(a){ a.addEventListener('click', closeNav); });
});

// auto-refresh (mutasi realtime): aktif kalau halaman set window.__vgRefresh (ms)
(function(){
  var ms = window.__vgRefresh; if(!ms) return;
  var lastType = 0;
  function mark(){ lastType = Date.now(); }
  document.addEventListener('keydown', mark, true);
  document.addEventListener('input', mark, true);
  setInterval(function(){
    if(document.hidden) return;                 // tab nggak aktif -> skip
    if(Date.now() - lastType < 12000) return;   // baru ngetik <12 dtk -> tunda
    var a = document.activeElement;
    if(a && a.tagName === 'SELECT') return;     // lagi buka dropdown -> skip
    location.reload();
  }, ms);
})();

VGJS
);
define('VG_LOGO_FULL', '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');
define('VG_LOGO_MARK', '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');
define('PERMS_ALL', 'dashboard,payment-link,report,tools,users,merchant,provider');
define('PERMS_DEFAULT', 'dashboard,payment-link,report');

function METODE(){ return [
  'BCA'=>'bank','Mandiri'=>'bank','BRI'=>'bank','BNI'=>'bank','BTN'=>'bank','BSI'=>'bank',
  'CIMB Niaga'=>'bank','Permata'=>'bank','Danamon'=>'bank','Panin'=>'bank','OCBC NISP'=>'bank',
  'Maybank'=>'bank','Bank Mega'=>'bank','BTPN'=>'bank','KB Bukopin'=>'bank','Sinarmas'=>'bank',
  'Commonwealth'=>'bank','DBS Indonesia'=>'bank','UOB Indonesia'=>'bank','HSBC Indonesia'=>'bank',
  'Citibank'=>'bank','Bank Jago'=>'bank','SeaBank'=>'bank','Allo Bank'=>'bank','Bank Neo Commerce'=>'bank',
  'Bank Muamalat'=>'bank','Bank DKI'=>'bank','BJB'=>'bank','Bank Jatim'=>'bank','Bank Jateng'=>'bank','Nobu Bank'=>'bank',
  'DANA'=>'ewallet','GoPay'=>'ewallet','OVO'=>'ewallet','ShopeePay'=>'ewallet','LinkAja'=>'ewallet','AstraPay'=>'ewallet','i.saku'=>'ewallet','Jenius'=>'ewallet']; }

function cfgv($k,$d=''){ if(defined($k)) return constant($k); $e=getenv($k); return $e!==false?$e:$d; }
function db_driver(){ return strtolower(cfgv('DB_DRIVER','sqlite'))==='mysql'?'mysql':'sqlite'; }
function pdo(){ static $db=null; if($db===null){
  if(db_driver()==='mysql'){
    $sock=cfgv('DB_SOCKET','');
    if($sock!=='') $dsn='mysql:unix_socket='.$sock.';dbname='.cfgv('DB_NAME','').';charset=utf8mb4';
    else $dsn='mysql:host='.cfgv('DB_HOST','localhost').';port='.cfgv('DB_PORT','3306').';dbname='.cfgv('DB_NAME','').';charset=utf8mb4';
    $db=new PDO($dsn, cfgv('DB_USER',''), cfgv('DB_PASS',''));
  } else {
    if(!is_dir(__DIR__.'/data')) @mkdir(__DIR__.'/data', 0775, true);
    $db=new PDO('sqlite:'.DB_PATH);
  }
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} return $db; }

function ensure_col($table,$col,$decl){
  if(db_driver()==='sqlite'){ foreach(pdo()->query("PRAGMA table_info($table)")->fetchAll() as $c){ if(strcasecmp($c['name'],$col)===0) return; } }
  else { $st=pdo()->prepare("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?"); $st->execute([$table,$col]); if($st->fetchColumn()>0) return; }
  try{ pdo()->exec("ALTER TABLE $table ADD COLUMN $col $decl"); }catch(Exception $e){}
}
function new_ref(){ return 'VG-'.date('ymdHis').sprintf('%03d', random_int(100,999)); }
function e($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function rupiah($n){ return 'Rp '.number_format((int)$n, 0, ',', '.'); }
function jam($s){ if(!$s) return '-'; $t=strtotime($s); return $t?date('d/m/Y H:i',$t):$s; }
function basep(){ $d=rtrim(str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME']??'/')),'/'); return $d==='/'?'':$d; }
function mslug(){ global $MSLUG; return $MSLUG ?: ($_SESSION['mslug'] ?? 'merchant1'); }
function u($p, $q=[]){
  $slug = array_key_exists('_m',$q) ? $q['_m'] : mslug(); unset($q['_m']);
  $bp=basep();
  if($p==='splash') $path=$bp.'/';
  elseif($p==='callback') $path=$bp.'/callback';
  elseif($p==='home') $path=$bp.'/'.$slug;
  else $path=$bp.'/'.$slug.'/'.$p;
  if(!empty($q)) $path.='?'.http_build_query($q);
  return $path!==''?$path:'/';
}
function base_href(){ $bp=basep(); return $bp===''?'/':$bp.'/'; }
function inline_file($rel){ $f=__DIR__.'/'.$rel; if(is_file($f)) return file_get_contents($f); if($rel==='assets/style.css') return VG_CSS; if($rel==='assets/app.js') return VG_JS; return ''; }
function data_uri($rel,$mime){ $f=__DIR__.'/'.$rel; return is_file($f)?('data:'.$mime.';base64,'.base64_encode(file_get_contents($f))):$rel; }
function logo_full(){ $f=__DIR__.'/assets/logo_full.png'; return 'data:image/png;base64,'.(is_file($f)?base64_encode(file_get_contents($f)):VG_LOGO_FULL); }
function logo_mark(){ $f=__DIR__.'/assets/logo_mark.png'; return 'data:image/png;base64,'.(is_file($f)?base64_encode(file_get_contents($f)):VG_LOGO_MARK); }
function redirect($p, $q=[]){ header('Location: '.u($p,$q)); exit; }
function flash($m,$t='ok'){ $_SESSION['flash'][]=[$t,$m]; }
function take_flash(){ $f=$_SESSION['flash']??[]; unset($_SESSION['flash']); return $f; }

function init_db(){
  $drv = db_driver();
  if($drv==='sqlite'){
    if(!is_dir(__DIR__.'/data')) @mkdir(__DIR__.'/data', 0775, true);
    $ht=__DIR__.'/data/.htaccess';
    if(!is_file($ht)) @file_put_contents($ht, "Require all denied\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\n");
  }
  $db = pdo();
  if($drv==='mysql'){ $pk='INT AUTO_INCREMENT PRIMARY KEY'; $tail=' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'; }
  else { $pk='INTEGER PRIMARY KEY AUTOINCREMENT'; $tail=''; }
  $db->exec("CREATE TABLE IF NOT EXISTS transaksi(id $pk, ref_no VARCHAR(64) UNIQUE, username VARCHAR(120),
    nominal INT, api VARCHAR(60), metode VARCHAR(40) DEFAULT '-', pengirim VARCHAR(120) DEFAULT '-',
    status VARCHAR(20) DEFAULT 'menunggu', verifikasi VARCHAR(40) DEFAULT '-', oleh VARCHAR(120) DEFAULT '',
    qr_string TEXT, provider_ref VARCHAR(80) DEFAULT '', dibuat VARCHAR(32), dibayar VARCHAR(32))$tail");
  $db->exec("CREATE TABLE IF NOT EXISTS merchants(id $pk, nama VARCHAR(120), kode VARCHAR(40) DEFAULT '',
    status VARCHAR(20) DEFAULT 'aktif', dibuat VARCHAR(32))$tail");
  $db->exec("CREATE TABLE IF NOT EXISTS users(id $pk, nama VARCHAR(120), email VARCHAR(190) UNIQUE,
    sandi VARCHAR(255), role VARCHAR(20) DEFAULT 'operator', status VARCHAR(20) DEFAULT 'pending',
    merchant_id INT, dibuat VARCHAR(32))$tail");
  $db->exec("CREATE TABLE IF NOT EXISTS pengaturan(k VARCHAR(120) PRIMARY KEY, v VARCHAR(2000) DEFAULT '')$tail");
  // --- migrasi kolom (aman dijalankan berulang) ---
  ensure_col('merchants','slug',"VARCHAR(40) DEFAULT ''");
  ensure_col('transaksi','merchant_id','INT');
  ensure_col('users','permissions',"VARCHAR(255) DEFAULT ''");
  ensure_col('users','reset_minta',"VARCHAR(32) DEFAULT ''");
  $now = date('Y-m-d H:i:s');
  // seed merchant pertama bila kosong
  if($db->query("SELECT COUNT(*) FROM merchants")->fetchColumn()==0)
    $db->prepare("INSERT INTO merchants(nama,kode,slug,status,dibuat) VALUES(?,?,?,?,?)")
       ->execute(['Merchant 1','M1','merchant1','aktif',$now]);
  // beri slug ke merchant lama yg belum punya, lalu pastikan ada sampai merchant5
  $i=0; foreach($db->query("SELECT id,slug FROM merchants ORDER BY id")->fetchAll() as $row){ $i++; if($i>5) break;
    if(empty($row['slug'])) $db->prepare("UPDATE merchants SET slug=? WHERE id=?")->execute(['merchant'.$i,$row['id']]); }
  $names=['Merchant 1','Merchant 2','Merchant 3','Merchant 4','Merchant 5'];
  for($n=1;$n<=5;$n++){ $ex=$db->prepare("SELECT COUNT(*) FROM merchants WHERE slug=?"); $ex->execute(['merchant'.$n]);
    if($ex->fetchColumn()==0) $db->prepare("INSERT INTO merchants(nama,kode,slug,status,dibuat) VALUES(?,?,?,?,?)")->execute([$names[$n-1],'M'.$n,'merchant'.$n,'aktif',$now]); }
  $mids=$db->query("SELECT id FROM merchants WHERE slug IN ('merchant1','merchant2','merchant3','merchant4','merchant5') ORDER BY slug")->fetchAll(PDO::FETCH_COLUMN);
  $m1=$db->query("SELECT id FROM merchants WHERE slug='merchant1'")->fetchColumn();
  if($db->query("SELECT COUNT(*) FROM users")->fetchColumn()==0){
    $st=$db->prepare("INSERT INTO users(nama,email,sandi,role,status,merchant_id,permissions,dibuat) VALUES(?,?,?,?,?,?,?,?)");
    $st->execute(['Administrator','admin@veragate.id',password_hash(ADMIN_PASS,PASSWORD_DEFAULT),'admin','aktif',$m1,PERMS_ALL,$now]);
  }
  // bersihkan akun contoh "Operator Demo" lama bila masih bawaan (belum diutak-atik)
  $db->exec("DELETE FROM users WHERE email='operator@veragate.id' AND nama='Operator Demo' AND status='pending'");
  // migrasi user lama: isi permissions & merchant bila kosong
  $db->exec("UPDATE users SET permissions='".PERMS_ALL."' WHERE role='admin' AND (permissions IS NULL OR permissions='')");
  $db->exec("UPDATE users SET permissions='".PERMS_DEFAULT."' WHERE role<>'admin' AND (permissions IS NULL OR permissions='')");
  $db->prepare("UPDATE users SET merchant_id=? WHERE merchant_id IS NULL OR merchant_id=0")->execute([$m1]);
  // tanpa data dummy: dashboard mulai kosong, isi dari transaksi asli
  $db->prepare("UPDATE transaksi SET merchant_id=? WHERE merchant_id IS NULL OR merchant_id=0")->execute([$m1]);
  // normalisasi sekali jalan
  $mg=$db->prepare("SELECT v FROM pengaturan WHERE k='mig_v2'"); $mg->execute();
  if($mg->fetchColumn()!=='1'){
    try{ $db->exec("UPDATE transaksi SET api='QRIS'"); }catch(Exception $e){}
    try{ $db->exec("UPDATE merchants SET nama='Merchant 1' WHERE slug='merchant1' AND nama='EVE Shopashop'"); }catch(Exception $e){}
    if(db_driver()==='mysql') $db->prepare("INSERT INTO pengaturan(k,v) VALUES('mig_v2','1') ON DUPLICATE KEY UPDATE v='1'")->execute();
    else $db->prepare("INSERT INTO pengaturan(k,v) VALUES('mig_v2','1') ON CONFLICT(k) DO UPDATE SET v='1'")->execute();
  }
  $mg3=$db->prepare("SELECT v FROM pengaturan WHERE k='mig_v3'"); $mg3->execute();
  if($mg3->fetchColumn()!=='1'){
    try{ $db->exec("UPDATE merchants SET kode='M1' WHERE slug='merchant1' AND kode='EVE'"); }catch(Exception $e){}
    if(db_driver()==='mysql') $db->prepare("INSERT INTO pengaturan(k,v) VALUES('mig_v3','1') ON DUPLICATE KEY UPDATE v='1'")->execute();
    else $db->prepare("INSERT INTO pengaturan(k,v) VALUES('mig_v3','1') ON CONFLICT(k) DO UPDATE SET v='1'")->execute();
  }
  $mg4=$db->prepare("SELECT v FROM pengaturan WHERE k='mig_v4'"); $mg4->execute();
  if($mg4->fetchColumn()!=='1'){
    try{ $db->exec("DELETE FROM transaksi"); }catch(Exception $e){}
    if(db_driver()==='mysql') $db->prepare("INSERT INTO pengaturan(k,v) VALUES('mig_v4','1') ON DUPLICATE KEY UPDATE v='1'")->execute();
    else $db->prepare("INSERT INTO pengaturan(k,v) VALUES('mig_v4','1') ON CONFLICT(k) DO UPDATE SET v='1'")->execute();
  }
}

function setting($k,$d=''){ $st=pdo()->prepare("SELECT v FROM pengaturan WHERE k=?"); $st->execute([$k]); $v=$st->fetchColumn(); return $v===false?$d:$v; }
function set_setting($k,$v){ if(db_driver()==="mysql") pdo()->prepare("INSERT INTO pengaturan(k,v) VALUES(?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)")->execute([$k,(string)$v]); else pdo()->prepare("INSERT INTO pengaturan(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v")->execute([$k,(string)$v]); }
function gpdef($k,$d=''){ if(defined($k)) return constant($k); $e=getenv($k); return $e!==false?$e:$d; }
function provider_cfg(){
  $base=setting('gp_base','') ?: gpdef('GP_BASE','https://api.goldenpay.asia');
  $cid =setting('gp_client_id','') ?: gpdef('GP_CLIENT_ID','');
  $cs  =setting('gp_client_secret','') ?: gpdef('GP_CLIENT_SECRET','');
  $lv  =setting('gp_live',''); $live = $lv!=='' ? ($lv==='1') : (gpdef('GP_LIVE','0')==='1');
  $sig =setting('gp_sig_key','') ?: gpdef('GP_SIG_KEY','');
  return ['base'=>$base,'client_id'=>$cid,'client_secret'=>$cs,'sig_key'=>$sig,'live'=>$live,'default_channel'=>setting('gp_channel','') ?: gpdef('GP_CHANNEL','QRIS')]; }

function cur(){ return ['id'=>$_SESSION['uid']??null,'nama'=>$_SESSION['nama']??null,
  'role'=>$_SESSION['role']??null,'merchant'=>$_SESSION['merchant']??'VERA GATE']; }
function cur_row(){ static $r=null; if($r===null){ $r=[]; if(!empty($_SESSION['uid'])){ $st=pdo()->prepare("SELECT * FROM users WHERE id=?"); $st->execute([$_SESSION['uid']]); $r=$st->fetch()?:[]; } } return $r; }
function require_login(){ if(empty($_SESSION['uid'])) redirect('login'); }
function require_admin(){ if(empty($_SESSION['uid'])) redirect('login'); if(($_SESSION['role']??'')!=='admin'){ http_response_code(403); echo view_403(); exit; } }
function user_perms(){ if(($_SESSION['role']??'')==='admin') return explode(',',PERMS_ALL); return array_values(array_filter(array_map('trim',explode(',',$_SESSION['perms']??'')))); }
function can($s){ if(($_SESSION['role']??'')==='admin') return true; return in_array($s,user_perms(),true); }
function require_can($s){ require_login(); if(!can($s)){ http_response_code(403); echo view_403(); exit; } }
function cur_merchant(){ static $m=null; if($m===null){ $st=pdo()->prepare("SELECT * FROM merchants WHERE slug=?"); $st->execute([mslug()]); $m=$st->fetch()?:[]; } return $m; }
function mid(){ $m=cur_merchant(); return (int)($m['id']??0); }
function verif_label($v){ $v=strtolower(trim((string)$v)); if($v===''||$v==='-') return 'Terverifikasi otomatis';
  if(strpos($v,'webhook')!==false) return 'Terverifikasi otomatis';
  if($v==='cek-status') return 'Terverifikasi (cek status)'; if($v==='manual') return 'Dikonfirmasi manual'; return ucfirst($v); }

function mail_cfg(){ return ['host'=>setting('smtp_host',''),'port'=>(int)(setting('smtp_port','')?:0),'user'=>setting('smtp_user',''),
  'pass'=>setting('smtp_pass',''),'secure'=>strtolower(setting('smtp_secure','tls')),
  'from'=>setting('smtp_from','') ?: ('no-reply@'.($_SERVER['HTTP_HOST']??'veragateway.com')),'fromname'=>setting('smtp_from_name','') ?: 'VERA GATE']; }
function send_mail($to,$subject,$body){ $c=mail_cfg();
  if($c['host']===''){ $h='From: '.$c['fromname'].' <'.$c['from'].">\r\nReply-To: ".$c['from']."\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n"; return @mail($to,$subject,$body,$h); }
  return smtp_send($c,$to,$subject,$body); }
function smtp_send($c,$to,$subject,$body){
  $secure=$c['secure']; $port=$c['port']?:($secure==='ssl'?465:587); $tp=($secure==='ssl')?'ssl://':'';
  $fp=@stream_socket_client($tp.$c['host'].':'.$port,$errno,$errstr,15); if(!$fp) return false;
  stream_set_timeout($fp,15);
  $rd=function()use($fp){ $d=''; while(($l=fgets($fp,515))!==false){ $d.=$l; if(strlen($l)<4||$l[3]===' ') break; } return $d; };
  $wr=function($s)use($fp){ fwrite($fp,$s."\r\n"); };
  $rd(); $wr('EHLO veragate'); $rd();
  if($secure==='tls'){ $wr('STARTTLS'); $rd(); if(!@stream_socket_enable_crypto($fp,true,STREAM_CRYPTO_METHOD_TLS_CLIENT)){ fclose($fp); return false; } $wr('EHLO veragate'); $rd(); }
  if($c['user']!==''){ $wr('AUTH LOGIN'); $rd(); $wr(base64_encode($c['user'])); $rd(); $wr(base64_encode($c['pass'])); $r=$rd(); if(strpos($r,'235')===false){ fclose($fp); return false; } }
  $wr('MAIL FROM:<'.$c['from'].'>'); $rd(); $wr('RCPT TO:<'.$to.'>'); $r=$rd();
  if($r===''||(int)substr($r,0,1)>=4){ fclose($fp); return false; }
  $wr('DATA'); $rd();
  $hdr='From: '.$c['fromname'].' <'.$c['from'].">\r\nTo: <".$to.">\r\nSubject: ".$subject."\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n";
  $wr($hdr.str_replace("\n.","\n..",$body)."\r\n."); $r=$rd(); $wr('QUIT'); fclose($fp);
  return strpos($r,'250')!==false; }

function pseudo_qr($seed){ $n=25;$cell=9;$pad=$cell;$size=$n*$cell+$pad*2; mt_srand(crc32($seed));
  $o=['<rect width="'.$size.'" height="'.$size.'" fill="#fff"/>'];
  $finder=function($x,$y)use($cell,$pad){ return
    '<rect x="'.($pad+$x*$cell).'" y="'.($pad+$y*$cell).'" width="'.(7*$cell).'" height="'.(7*$cell).'" fill="#16304F"/>'.
    '<rect x="'.($pad+($x+1)*$cell).'" y="'.($pad+($y+1)*$cell).'" width="'.(5*$cell).'" height="'.(5*$cell).'" fill="#fff"/>'.
    '<rect x="'.($pad+($x+2)*$cell).'" y="'.($pad+($y+2)*$cell).'" width="'.(3*$cell).'" height="'.(3*$cell).'" fill="#16304F"/>'; };
  $inF=function($i,$j)use($n){ foreach([[0,0],[$n-7,0],[0,$n-7]] as $f){ if($i>=$f[0]&&$i<$f[0]+7&&$j>=$f[1]&&$j<$f[1]+7) return true; } return false; };
  for($j=0;$j<$n;$j++)for($i=0;$i<$n;$i++){ if($inF($i,$j))continue; if(mt_rand()/mt_getrandmax()<0.46)
    $o[]='<rect x="'.($pad+$i*$cell).'" y="'.($pad+$j*$cell).'" width="'.$cell.'" height="'.$cell.'" fill="#16304F"/>'; }
  $o[]=$finder(0,0); $o[]=$finder($n-7,0); $o[]=$finder(0,$n-7);
  return '<svg width="'.$size.'" height="'.$size.'" viewBox="0 0 '.$size.' '.$size.'" xmlns="http://www.w3.org/2000/svg">'.implode('',$o).'</svg>'; }

// ================= ROUTER =================
init_db();
$m = $_SERVER['REQUEST_METHOD'];
$bp=basep();
$uriPath=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH) ?: '/';
if($bp!=='' && strpos($uriPath,$bp)===0) $uriPath=substr($uriPath,strlen($bp));
$uriPath=trim($uriPath,'/');
$segs=$uriPath===''?[]:explode('/',$uriPath);
$MSLUG=null;
if(count($segs)>=1 && preg_match('/^[a-z0-9][a-z0-9\-_]{0,59}$/',$segs[0]) && $segs[0]!=='callback' && $segs[0]!=='developer'){ $MSLUG=$segs[0]; $p=$segs[1]??'home'; }
elseif(count($segs)>=1 && $segs[0]==='callback'){ $p='callback'; }
elseif(isset($_GET['p'])){ $p=$_GET['p']; $MSLUG=$_GET['m']??($_SESSION['mslug']??'merchant1'); }
elseif(count($segs)===0){ $p='splash'; }
elseif($segs[0]==='index.php'){ $p='splash'; }
else { http_response_code(404); echo view_404(); exit; }
if($MSLUG!==null){ $chk=pdo()->prepare("SELECT id FROM merchants WHERE slug=?"); $chk->execute([$MSLUG]); if(!$chk->fetchColumn()){ http_response_code(404); echo view_404(); exit; } }

switch($p){

case 'splash': echo view_splash(); break;

case 'home': echo view_landing(); break;

case 'generate':
  $username=trim($_POST['username']??''); $nominal=(int)preg_replace('/[^0-9]/','',$_POST['nominal']??'0');
  if(!$username||$nominal<=0){ flash('Username dan nominal wajib diisi dengan benar.','err'); redirect('home'); }
  $cfg=provider_cfg(); $channel=$_POST['channel']??$cfg['default_channel'];
  $api=$cfg['live']?'Flypay':'QRIS'; $ref=new_ref(); $qr=''; $pref='';
  
  if($cfg['live']){ 
      try{ 
          $cb=abs_url(u('callback'));
          [$qr,$pref,]=flypay_create_deposit($ref,$nominal,$username,$cb); 
          $qr=$qr?:''; 
          unset($_SESSION['gp_err']); // <--- BERSIHKAN ERROR HANTU
      } catch(Exception $ex){ 
          $_SESSION['gp_err']=$ex->getMessage(); 
          flash('Gagal hubungi Flypay ('.$ex->getMessage().'). Pakai mode manual.','err'); 
      } 
  }
  
  pdo()->prepare("INSERT INTO transaksi(ref_no,username,nominal,api,metode,status,qr_string,provider_ref,merchant_id,dibuat) VALUES(?,?,?,?,?, 'menunggu', ?,?,?,?)")
       ->execute([$ref,$username,$nominal,$api,$cfg['live']?$channel:'-',$qr,$pref,mid(),date('Y-m-d H:i:s')]);
  redirect('qris',['ref'=>$ref]); 
  break;

case 'qris': echo view_qris($_GET['ref']??''); break;

case 'bayar': // tandai bayar manual (mode non-live)
  $ref=$_GET['ref']??''; 
  $t=tx($ref); 
  if(!$t){ http_response_code(404); echo view_404(); break; }
  
  $metode=$_POST['metode']??'GoPay'; 
  $pengirim=trim($_POST['pengirim']??'')?:'Tanpa Nama';
  
  pdo()->prepare("UPDATE transaksi SET status='sukses',metode=?,pengirim=?,verifikasi='Manual',dibayar=? WHERE ref_no=?")
       ->execute([$metode,$pengirim,date('Y-m-d H:i:s'),$ref]);
       
  redirect('qris',['ref'=>$ref]); 
  break;

case 'callback': 
  $raw=file_get_contents('php://input'); 
  $data=json_decode($raw,true); 
  if(!is_array($data)) $data=$_POST; 
  
  if(empty($data)){
      http_response_code(404); echo 'error'; break;
  }

  [$ref,$status,$metode,$pengirim]=flypay_parse_callback($data);
  
  $t=tx($ref); 
  if(!$t){ 
      http_response_code(404); echo 'error'; break; 
  }

  $now=date('Y-m-d H:i:s');
  if($status==='sukses') {
      pdo()->prepare("UPDATE transaksi SET status='sukses',metode=?,pengirim=?,verifikasi='webhook (Flypay)',dibayar=? WHERE ref_no=?")->execute([$metode,$pengirim,$now,$ref]);
  } elseif($status==='gagal') {
      pdo()->prepare("UPDATE transaksi SET status='gagal',verifikasi='webhook (Flypay)' WHERE ref_no=?")->execute([$ref]);
  }
  
  header('Content-Type: text/plain'); 
  echo "success"; 
  break;
  
case 'do_withdraw':
  require_admin(); // Keamanan: Pastikan HANYA admin yang bisa cairin dana
  
  $bankCode = trim($_POST['bankCode'] ?? '');
  $accountNumber = trim($_POST['accountNumber'] ?? '');
  $accountName = trim($_POST['accountName'] ?? '');
  $nominal = (int)preg_replace('/[^0-9]/','',$_POST['nominal'] ?? '0');

  if(!$bankCode || !$accountNumber || !$accountName || $nominal <= 0){ 
      flash('Semua form penarikan wajib diisi dengan benar.','err'); 
      redirect('tools'); 
  }
  
  // Buat nomor resi unik khusus penarikan (WD)
  $ref = 'WD-'.date('ymdHis').sprintf('%03d', random_int(100,999)); 
  
  try {
      // Tembak API Flypay
      flypay_create_withdrawal($ref, $bankCode, $accountNumber, $accountName, $nominal);
      
      // Catat ke database sebagai uang keluar (Withdrawal)
      pdo()->prepare("INSERT INTO transaksi(ref_no,username,nominal,api,metode,status,pengirim,merchant_id,dibuat) VALUES(?,?,?,?,?, 'menunggu', ?,?,?)")
           ->execute([$ref, 'Admin (Tarik Dana)', $nominal, 'Flypay WD', $bankCode, $accountName, mid(), date('Y-m-d H:i:s')]);
      
      flash('Permintaan penarikan dana berhasil dikirim ke Flypay! Status: Menunggu proses.','ok');
  } catch(Exception $ex) {
      flash('Gagal narik dana: '.$ex->getMessage(), 'err');
  }
  redirect('tools'); 
  break;

case 'login':
  if(!empty($_SESSION['uid'])) redirect('dashboard');
  if($m==='POST'){ $email=strtolower(trim($_POST['email']??'')); $st=pdo()->prepare("SELECT * FROM users WHERE email=?"); $st->execute([$email]); $usr=$st->fetch();
    if(!$usr||!password_verify($_POST['password']??'',$usr['sandi'])) flash('Email atau kata sandi salah.','err');
    elseif($usr['status']!=='aktif') flash('Akun belum aktif / menunggu persetujuan admin.','err');
    else { $mr=pdo()->prepare("SELECT nama,slug FROM merchants WHERE id=?"); $mr->execute([$usr['merchant_id']]); $mrow=$mr->fetch();
      $ownslug=$mrow['slug']??'merchant1';
      $target = ($usr['role']==='admin') ? mslug() : $ownslug;   // admin ikut merchant di URL, operator ke merchant sendiri
      $_SESSION['uid']=$usr['id']; $_SESSION['nama']=$usr['nama']; $_SESSION['role']=$usr['role'];
      $_SESSION['perms']=$usr['permissions']?:''; $_SESSION['mslug']=$target;
      $mn=pdo()->prepare("SELECT nama FROM merchants WHERE slug=?"); $mn->execute([$target]); $_SESSION['merchant']=$mn->fetchColumn()?:'VERA GATE';
      redirect('dashboard',['_m'=>$target]); } }
  echo view_login(); break;

case 'forgot':
  if($m==='POST'){ $email=strtolower(trim($_POST['email']??'')); $st=pdo()->prepare("SELECT id,nama FROM users WHERE email=?"); $st->execute([$email]); $usr=$st->fetch();
    if($usr){ $tmp='vg'.random_int(1000,9999); pdo()->prepare("UPDATE users SET sandi=?,reset_minta=? WHERE id=?")->execute([password_hash($tmp,PASSWORD_DEFAULT),date('Y-m-d H:i:s'),$usr['id']]);
      $sent=send_mail($email,'Reset Kata Sandi VERA GATE',"Halo ".$usr['nama'].",\n\nKata sandi sementara kamu: ".$tmp."\nLogin: ".abs_url(u('login'))."\n\nSegera ganti setelah masuk. Kalau kamu tidak meminta ini, abaikan email ini.");
      $_SESSION['fp_note']=$sent?'sent':'flagged'; }
    flash('Kalau email terdaftar, kata sandi sementara sudah dikirim ke email tersebut. Cek inbox / folder spam.','ok'); redirect('login'); }
  echo view_forgot(); break;

case 'daftar':
  if($m==='POST'){ $nama=trim($_POST['nama']??''); $email=strtolower(trim($_POST['email']??'')); $pw=$_POST['password']??'';
    $exists=pdo()->prepare("SELECT 1 FROM users WHERE email=?"); $exists->execute([$email]);
    if(!$nama||!$email||!$pw) flash('Nama, email, dan kata sandi wajib diisi.','err');
    elseif($exists->fetch()) flash('Email sudah terdaftar.','err');
    else { $now=date('Y-m-d H:i:s'); $mid=mid();
      pdo()->prepare("INSERT INTO users(nama,email,sandi,role,status,merchant_id,permissions,dibuat) VALUES(?,?,?,?,?,?,?,?)")
           ->execute([$nama,$email,password_hash($pw,PASSWORD_DEFAULT),'operator','pending',$mid?:null,PERMS_DEFAULT,$now]);
      flash('Pendaftaran berhasil! Akun menunggu persetujuan admin sebelum bisa login.','ok'); redirect('login'); } }
  echo view_daftar(); break;

case 'logout': session_destroy(); redirect('login'); break;

case 'ganti-sandi': require_login();
  if($m==='POST'){ $me=cur_row(); $old=$_POST['lama']??''; $new=$_POST['baru']??''; $conf=$_POST['konfirmasi']??'';
    if(!password_verify($old,$me['sandi'])) flash('Kata sandi lama salah.','err');
    elseif(strlen($new)<6) flash('Kata sandi baru minimal 6 karakter.','err');
    elseif($new!==$conf) flash('Konfirmasi kata sandi tidak cocok.','err');
    else { pdo()->prepare("UPDATE users SET sandi=? WHERE id=?")->execute([password_hash($new,PASSWORD_DEFAULT),$me['id']]); flash('Kata sandi berhasil diubah.'); redirect('dashboard'); } }
  echo view_ganti_sandi(); break;

case 'dashboard': require_can('dashboard'); echo view_dashboard(); break;

case 'hapus': require_can('dashboard'); pdo()->prepare("DELETE FROM transaksi WHERE ref_no=? AND merchant_id=?")->execute([$_GET['ref']??'',mid()]); flash('Transaksi dihapus.'); redirect('dashboard'); break;

case 'cek': require_login(); $ref=$_GET['ref']??''; $t=tx($ref); if($t){ $prov=provider_status($t);
    if($prov!==$t['status']){ if($prov==='sukses') pdo()->prepare("UPDATE transaksi SET status='sukses',verifikasi='cek-status',dibayar=? WHERE ref_no=?")->execute([date('Y-m-d H:i:s'),$ref]); else pdo()->prepare("UPDATE transaksi SET status=? WHERE ref_no=?")->execute([$prov,$ref]); }
    elseif($prov==='sukses'&&in_array($t['verifikasi'],[null,'','-'],true)) pdo()->prepare("UPDATE transaksi SET verifikasi='cek-status' WHERE ref_no=?")->execute([$ref]);
    flash('Hasil cek ke provider untuk '.$ref.': status '.strtoupper($prov).'.', $prov==='sukses'?'ok':'err'); }
  redirect_back('dashboard'); break;

case 'konfirmasi': require_admin(); $ref=$_GET['ref']??''; $t=tx($ref); if($t){ $metode=$_POST['metode']??$t['metode']; $pengirim=trim($_POST['pengirim']??'')?:$t['pengirim'];
    pdo()->prepare("UPDATE transaksi SET status='sukses',metode=?,pengirim=?,verifikasi='manual',oleh=?,dibayar=? WHERE ref_no=?")->execute([$metode,$pengirim,cur()['nama'],date('Y-m-d H:i:s'),$ref]);
    flash('Transaksi '.$ref.' dikonfirmasi manual oleh '.cur()['nama'].'.'); }
  redirect_back('qris',['ref'=>$ref]); break;

case 'payment-link': require_can('payment-link'); echo view_payment_link(); break;

case 'report': require_can('report'); echo view_report(); break;
case 'report-print': require_can('report'); echo view_report_print(); break;

case 'tools': require_can('tools'); echo view_tools(); break;
case 'export-csv': require_can('tools'); export_csv(); break;
case 'export-json': require_can('tools'); export_json(); break;
case 'reset': require_can('tools'); pdo()->prepare("DELETE FROM transaksi WHERE merchant_id=?")->execute([mid()]); flash('Transaksi merchant ini di-reset.'); redirect('dashboard'); break;

case 'users': require_can('users'); echo view_users(); break;
case 'user-aksi': require_can('users'); user_aksi(); break;
case 'user-reset': require_can('users'); $id=(int)($_GET['id']??0); $tmp='vg'.random_int(1000,9999);
    pdo()->prepare("UPDATE users SET sandi=?, reset_minta='' WHERE id=?")->execute([password_hash($tmp,PASSWORD_DEFAULT),$id]);
    $em=pdo()->prepare("SELECT nama,email FROM users WHERE id=?"); $em->execute([$id]); $ur=$em->fetch();
    $sent=$ur?send_mail($ur['email'],'Reset Kata Sandi VERA GATE',"Halo ".$ur['nama'].",\n\nKata sandi sementara kamu: ".$tmp."\nLogin: ".abs_url(u('login'))."\n\nSegera ganti setelah masuk."):false;
    flash('Sandi sementara untuk '.($ur['email']??'user').': '.$tmp.'. '.($sent?'Sudah dikirim ke email user.':'(Email tidak terkirim - sampaikan manual, atau atur SMTP di Pengaturan Provider.)')); redirect('users'); break;

case 'user-add': require_can('users');
    $nama=trim($_POST['nama']??''); $email=strtolower(trim($_POST['email']??'')); $pw=$_POST['password']??''; $role=(($_POST['role']??'operator')==='admin')?'admin':'operator';
    $perms=$role==='admin'?PERMS_ALL:implode(',',array_values(array_intersect(explode(',',PERMS_ALL),(array)($_POST['perm']??[]))));
    if(!$nama||!$email||!$pw){ flash('Nama, email, dan password wajib diisi.','err'); redirect('users'); }
    $ex=pdo()->prepare("SELECT 1 FROM users WHERE email=?"); $ex->execute([$email]);
    if($ex->fetch()){ flash('Email sudah terdaftar.','err'); redirect('users'); }
    pdo()->prepare("INSERT INTO users(nama,email,sandi,role,status,merchant_id,permissions,dibuat) VALUES(?,?,?,?,?,?,?,?)")
         ->execute([$nama,$email,password_hash($pw,PASSWORD_DEFAULT),$role,'aktif',mid(),$perms,date('Y-m-d H:i:s')]);
    $msg='User '.$nama.' ditambahkan & langsung aktif.';
    if(!empty($_POST['kirim_email'])){ $sent=send_mail($email,'Akun VERA GATE',"Halo ".$nama.",\n\nAkun kamu sudah dibuat.\nLogin: ".abs_url(u('login'))."\nEmail: ".$email."\nPassword: ".$pw."\n\nSegera ganti password setelah masuk."); $msg.=$sent?' Info login dikirim ke email.':' (Email gagal terkirim - atur SMTP dulu.)'; }
    flash($msg); redirect('users'); break;

case 'merchant': require_can('merchant'); echo view_merchant(); break;
case 'merchant-aksi': require_can('merchant'); merchant_aksi(); break;

case 'provider': require_can('provider'); echo view_provider(); break;

case 'developer': handle_developer(); break;

default: http_response_code(404); echo view_404();
}

// ================= DATA HELPERS =================
function tx($ref){ $st=pdo()->prepare("SELECT * FROM transaksi WHERE ref_no=?"); $st->execute([$ref]); return $st->fetch(); }
function abs_url($rel){ $https=(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO']??'')==='https') || (($_SERVER['REQUEST_SCHEME']??'')==='https')
    || ((string)($_SERVER['SERVER_PORT']??'')==='443'); $sch=$https?'https':'http'; $host=$_SERVER['HTTP_HOST']??'localhost';
  if($rel!=='' && $rel[0]==='/') return $sch.'://'.$host.$rel;
  $bp=basep(); return $sch.'://'.$host.$bp.'/'.$rel; }
function redirect_back($p,$q=[]){ $r=$_SERVER['HTTP_REFERER']??''; if($r){ header('Location: '.$r); exit; } redirect($p,$q); }

function provider_status($t){ 
  $cfg=provider_cfg(); 
  if($cfg['live']){ 
      try{ 
          return flypay_check_status($t['ref_no']); 
      }catch(Exception $e){ 
          return $t['status']; 
      } 
  } 
  return $t['status']; 
}

function user_aksi(){ $id=(int)($_GET['id']??0); $a=$_POST['aksi']??''; $self=$id==(cur()['id']);
  if($self && in_array($a,['hapus','nonaktif','role_operator'])){ flash('Tidak bisa mengubah/menghapus akun sendiri.','err'); redirect('users'); }
  if($a==='perms'){ $sel=array_values(array_intersect(explode(',',PERMS_ALL), (array)($_POST['perm']??[]))); pdo()->prepare("UPDATE users SET permissions=? WHERE id=?")->execute([implode(',',$sel),$id]); flash('Permission user disimpan.'); redirect('users'); }
  $map=['setujui'=>"UPDATE users SET status='aktif' WHERE id=?",'nonaktif'=>"UPDATE users SET status='nonaktif' WHERE id=?",
    'role_admin'=>"UPDATE users SET role='admin' WHERE id=?",'role_operator'=>"UPDATE users SET role='operator' WHERE id=?",'hapus'=>"DELETE FROM users WHERE id=?"];
  if(isset($map[$a])) pdo()->prepare($map[$a])->execute([$id]); flash('Perubahan disimpan.'); redirect('users'); }

function merchant_aksi(){ $id=(int)($_GET['id']??0); $a=$_POST['aksi']??'';
  if($a==='aktif') pdo()->prepare("UPDATE merchants SET status='aktif' WHERE id=?")->execute([$id]);
  elseif($a==='nonaktif') pdo()->prepare("UPDATE merchants SET status='nonaktif' WHERE id=?")->execute([$id]);
  elseif($a==='rename'){
    $nama=trim($_POST['nama']??''); $kode=trim($_POST['kode']??'');
    $new_slug=trim($_POST['slug']??'');
    if($new_slug===''&&$nama!=='') $new_slug=preg_replace('/[^a-z0-9]+/','-',strtolower($nama));
    $new_slug=preg_replace('/[^a-z0-9\-_]/','',strtolower($new_slug));
    $new_slug=trim($new_slug,'-_');
    if($new_slug==='') $new_slug='merchant'.$id;
    if(strlen($new_slug)>60) $new_slug=substr($new_slug,0,60);
    $chk_s=pdo()->prepare("SELECT COUNT(*) FROM merchants WHERE slug=? AND id<>?"); $chk_s->execute([$new_slug,$id]);
    if($chk_s->fetchColumn()>0){ flash('Slug "'.$new_slug.'" sudah dipakai merchant lain. Pilih slug lain.','err'); redirect('merchant'); return; }
    if($nama){
      $old_slug=pdo()->query("SELECT slug FROM merchants WHERE id=".(int)$id)->fetchColumn();
      pdo()->prepare("UPDATE merchants SET nama=?,kode=?,slug=? WHERE id=?")->execute([$nama,$kode,$new_slug,$id]);
      if(($_SESSION['mslug']??'')===$old_slug) $_SESSION['mslug']=$new_slug;
      flash('Merchant diperbarui. URL sekarang: /'.$new_slug.'/');
      global $MSLUG; $MSLUG=$new_slug;
      header('Location: '.u('merchant',['_m'=>$new_slug])); exit;
    }
    redirect('merchant'); }
  elseif($a==='hapus'){ pdo()->prepare("UPDATE users SET merchant_id=NULL WHERE merchant_id=?")->execute([$id]); pdo()->prepare("DELETE FROM merchants WHERE id=?")->execute([$id]); }
  flash('Perubahan merchant disimpan.'); redirect('merchant'); }

function export_csv(){ header('Content-Type: text/csv'); header('Content-Disposition: attachment; filename=veragate_transaksi.csv');
  $out=fopen('php://output','w'); fputcsv($out,['Ref No','Tanggal','Username','Nama Pengirim','Metode','QRIS','Nominal','Status']);
  $st=pdo()->prepare("SELECT * FROM transaksi WHERE merchant_id=? ORDER BY id DESC");$st->execute([mid()]);foreach($st as $r) fputcsv($out,[$r['ref_no'],$r['dibuat'],$r['username'],$r['pengirim'],$r['metode'],$r['api'],$r['nominal'],$r['status']]); fclose($out); }
function export_json(){ header('Content-Type: application/json'); header('Content-Disposition: attachment; filename=veragate_transaksi.json');
  $st=pdo()->prepare("SELECT * FROM transaksi WHERE merchant_id=? ORDER BY id DESC");$st->execute([mid()]);echo json_encode($st->fetchAll(), JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE); }

function report_data(){ $st=pdo()->prepare("SELECT * FROM transaksi WHERE merchant_id=?"); $st->execute([mid()]); $all=$st->fetchAll(); $suk=array_filter($all,fn($r)=>$r['status']==='sukses');
  $met=[]; foreach($suk as $r){ if($r['metode']&&$r['metode']!=='-'){ $met[$r['metode']]['n']=($met[$r['metode']]['n']??0)+1; $met[$r['metode']]['amt']=($met[$r['metode']]['amt']??0)+$r['nominal']; } }
  $per_met=[]; foreach($met as $k=>$v) $per_met[]=['nama'=>$k,'n'=>$v['n'],'amt'=>$v['amt']]; usort($per_met,fn($a,$b)=>$b['amt']-$a['amt']);
  return ['total'=>count($all),'sukses'=>count($suk),'sukses_amt'=>array_sum(array_map(fn($r)=>$r['nominal'],$suk)),
    'menunggu'=>count(array_filter($all,fn($r)=>$r['status']==='menunggu')),'gagal'=>count(array_filter($all,fn($r)=>$r['status']==='gagal')),'per_met'=>$per_met]; }

function id_bulan($m){ static $b=[1=>'Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; return $b[(int)$m]??$m; }
function report_buckets($mode,$start='',$end=''){
  $mode=in_array($mode,['hari','minggu','bulan','tahun','custom'],true)?$mode:'bulan';
  $sql="SELECT * FROM transaksi WHERE merchant_id=?"; $args=[mid()];
  if($start!==''){ $sql.=" AND dibuat>=?"; $args[]=$start.' 00:00:00'; }
  if($end!==''){ $sql.=" AND dibuat<=?"; $args[]=$end.' 23:59:59'; }
  $sql.=" ORDER BY dibuat ASC";
  $st=pdo()->prepare($sql); $st->execute($args); $all=$st->fetchAll();
  $grp = $mode==='custom' ? 'hari' : $mode;
  $bk=[];
  foreach($all as $r){ $t=strtotime($r['dibuat']); if(!$t) continue;
    if($grp==='hari'){ $key=date('Y-m-d',$t); $label=date('d/m/Y',$t); }
    elseif($grp==='minggu'){ $key=date('o-W',$t); $label='Pekan '.date('W',$t).' / '.date('o',$t); }
    elseif($grp==='tahun'){ $key=date('Y',$t); $label=date('Y',$t); }
    else { $key=date('Y-m',$t); $label=id_bulan(date('n',$t)).' '.date('Y',$t); }
    if(!isset($bk[$key])) $bk[$key]=['label'=>$label,'total'=>0,'sukses'=>0,'amt'=>0,'menunggu'=>0,'gagal'=>0];
    $bk[$key]['total']++;
    if($r['status']==='sukses'){ $bk[$key]['sukses']++; $bk[$key]['amt']+=(float)$r['nominal']; }
    elseif($r['status']==='menunggu') $bk[$key]['menunggu']++;
    elseif($r['status']==='gagal') $bk[$key]['gagal']++;
  }
  krsort($bk); return $bk; }
function buckets_total($bk){ $t=['total'=>0,'sukses'=>0,'sukses_amt'=>0,'menunggu'=>0,'gagal'=>0]; foreach($bk as $r){ $t['total']+=$r['total']; $t['sukses']+=$r['sukses']; $t['sukses_amt']+=$r['amt']; $t['menunggu']+=$r['menunggu']; $t['gagal']+=$r['gagal']; } return $t; }

// ================= VIEWS =================
function head($title){ return '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'.
  '<base href="'.e(base_href()).'">'.
  '<title>VERA GATE — '.e($title).'</title><link rel="icon" href="'.logo_mark().'">'.
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">'.
  '<style>'.inline_file('assets/style.css').'</style></head><body>'; }
function foot(){ return '<script>'.inline_file('assets/app.js').'</script></body></html>'; }
function theme_btn(){ return '<span id="themeBtn" title="Mode gelap/terang" style="position:fixed;top:18px;left:18px;z-index:5;width:42px;height:42px;border-radius:11px;background:var(--surface);border:1px solid var(--line);display:grid;place-items:center;color:var(--muted);cursor:pointer;box-shadow:0 6px 18px -10px rgba(19,36,58,.6)"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg></span>'; }
function flash_html(){ $h=''; foreach(take_flash() as $f) $h.='<div class="flash '.e($f[0]).'">'.e($f[1]).'</div>'; return $h; }

function view_splash(){ $h=head('VERA GATE').theme_btn().'<div class="center"><div class="card" style="text-align:center">'.
     '<div class="logo-top" style="margin:8px 0"><img src="'.logo_full().'" alt="VERA GATE" style="max-width:260px"></div>'.
     '<div class="sub">Payment Gateway</div>'.flash_html().'</div></div>';
  return $h.foot(); }

function view_landing(){ $mname=cur_merchant()['nama']??'VERA GATE'; $h=head('Top Up Saldo').theme_btn();
  $h.='<div class="center"><div class="card"><div class="logo-top"><img src="'.logo_full().'" alt="VERA GATE"></div><h1>Top Up Saldo</h1><div class="sub">'.e($mname).' &middot; masukkan username & nominal lalu buat QRIS.</div>'.flash_html();
  $h.='<form method="post" action="'.u('generate').'"><div class="field"><label>Username</label><input name="username" required placeholder="cth: budi_santoso"></div>'.
      '<div class="field"><label>Nominal Deposit</label><div class="ip-rp"><span class="pre">Rp</span><input name="nominal" inputmode="numeric" required placeholder="cth: 50000"></div></div>'.
      '<button class="btn" type="submit">Generate QRIS <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form></div></div>';
  return $h.foot(); }

function view_qris($ref){ 
  $t=tx($ref); if(!$t) return head('404').'<div class="center"><div class="card"><h1>404</h1><p class="sub">Transaksi tidak ditemukan.</p><a class="btn" href="'.u('home').'">Kembali</a></div></div>'.foot();
  
  $c=cur(); 
  $M=METODE(); 
  
  $h=head('QRIS').theme_btn().'<div class="center"><div class="card"><div class="logo-top"><img src="'.logo_full().'" alt="VERA GATE"></div>';
  
  if($t['status']==='sukses'){ 
    $h.='<div class="success-box"><div class="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></div><div style="font-weight:800;font-size:18px">Pembayaran Berhasil</div><div style="font-size:13px;opacity:.85;margin-top:3px">Transaksi Sukses</div></div>'.
    cap('Nama Pengirim',e($t['pengirim'])).cap('Metode',e($t['metode'])).cap('Nominal','<span class="mono">'.rupiah($t['nominal']).'</span>').cap('Ref No','<span class="mono">'.e($t['ref_no']).'</span>').
    '<div class="verifbox"><span class="k">Status terverifikasi:</span> <b>'.e(verif_label($t['verifikasi'])).'</b>'.($t['oleh']?' oleh '.e($t['oleh']):'').'<br><span class="k">Waktu bayar:</span> '.jam($t['dibayar']).'</div>'.
    '<a class="btn" href="'.u('home').'" style="margin-top:18px">Top Up Lagi</a>';
  } else { 
    $h.='<h1>Scan untuk Bayar</h1><div class="sub">Gunakan e-wallet / m-banking apa pun.</div><div class="timer">&#9201; Selesaikan pembayaran sebelum kedaluwarsa</div>';
    
    // --- CEK: Apakah Flypay mengirim Link Web atau Teks Mentah? ---
    $is_link = ($t['qr_string'] && strpos($t['qr_string'], 'http') === 0);
    
    $h.='<div class="qrwrap">';
    if($is_link) {
        // JIKA LINK: Tanam halaman web Flypay langsung di dalam VERA GATE (Tanpa Tombol!)
        $h.='<div style="width:100%; height:450px; overflow:hidden; border-radius:12px; border:1px solid var(--line); margin-bottom:16px; background:#fff;">
               <iframe src="'.e($t['qr_string']).'" scrolling="yes" style="width:100%; height:100%; border:none;"></iframe>
             </div>';
    } else {
        // JIKA TEKS MENTAH: Bikin pakai mesin QR Code JS
        $h.= ($t['qr_string'] ? '<div class="qrbox"><div id="qrcode"></div></div>' : '<div class="qrbox">'.pseudo_qr($t['ref_no']).'</div>');
    }
    $h.='</div>';

    $h.=cap('Username','<span style="color:var(--blue)">'.e($t['username']).'</span>').cap('Nominal','<span class="mono">'.rupiah($t['nominal']).'</span>').cap('Ref No','<span class="mono">'.e($t['ref_no']).'</span>').cap('Status','<span class="badge menunggu">MENUNGGU</span>');
    
    if($c['id']) $h.='<form method="post" action="'.u('cek',['ref'=>$t['ref_no']]).'" style="margin-top:10px"><button class="btn alt" type="submit">Cek Status ke Provider</button></form>';
    
    if(!$t['qr_string']){ 
        $cfgq=provider_cfg(); $geq=$_SESSION['gp_err']??''; 
        if($cfgq['live']){ 
            $hint=(stripos($geq,'ENOTFOUND')!==false||stripos($geq,'HTTP 500')!==false)?'Ini error di SERVER Golden Pay (bukan dari sisi kamu) - laporkan ke CS Golden Pay/FlyPay.':((stripos($geq,'403')!==false||stripos($geq,'forbidden')!==false)?'Kemungkinan IP server belum di-whitelist.':'Cek lagi kredensial & pesan error di atas.'); 
            $h.='<div class="verifbox" style="background:#fdeaea;border:1px solid #f3b6b6;color:#a12626;text-align:left"><b>QR LIVE gagal dibuat.</b> Pesan: <span class="mono">'.e($geq?:'(tidak ada detail)').'</span>. '.e($hint).' QR di bawah cuma contoh, tidak bisa di-scan.</div>'; 
        } 
        $h.='<div class="sim"><div class="lbl">Konfirmasi Pembayaran</div><form method="post" action="'.u('bayar',['ref'=>$t['ref_no']]).'"><div class="field"><label>Bayar via</label><select name="metode">'; 
        foreach($M as $k=>$v) $h.='<option>'.e($k).'</option>'; 
        $h.='</select></div><div class="field"><label>Nama Pengirim</label><input name="pengirim" required placeholder="Nama pemilik rekening / akun"></div><button class="btn" type="submit">Bayar Sekarang</button></form></div>'; 
    }
    if($c['role']==='admin'){ 
        $h.='<div class="sim" style="border-color:var(--amber)"><div class="lbl">Konfirmasi Manual (admin)</div><p style="font-size:11px;color:var(--muted);margin:0 0 10px">Hanya bila uang sudah masuk tapi verifikasi otomatis gagal. Tercatat atas nama kamu.</p><form method="post" action="'.u('konfirmasi',['ref'=>$t['ref_no']]).'" onsubmit="return confirm(\'Konfirmasi manual sebagai SUKSES?\')"><div class="field"><label>Metode</label><select name="metode">'; 
        foreach($M as $k=>$v) $h.='<option>'.e($k).'</option>'; 
        $h.='</select></div><div class="field"><label>Nama Pengirim</label><input name="pengirim" placeholder="opsional"></div><button class="btn alt" type="submit">Tandai Sukses (Manual)</button></form></div>'; 
    }
  }
  if($t['status']==='menunggu') $h.='<script>window.__vgRefresh=5000;</script>';
  $h.='</div></div>';
  
  // Script QR Code JS HANYA dipanggil jika itu bukan link H5
  if($t['qr_string'] && $t['status']!=='sukses' && !($t['qr_string'] && strpos($t['qr_string'], 'http') === 0)) {
      $h.='<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script><script>new QRCode(document.getElementById("qrcode"),{text:'.json_encode($t['qr_string']).',width:220,height:220,correctLevel:QRCode.CorrectLevel.M});</script>';
  }
  return $h.foot(); 
}
function cap($k,$v){ return '<div class="qrcap"><span class="k">'.e($k).'</span><span class="v">'.$v.'</span></div>'; }

function view_login(){ $mname=cur_merchant()['nama']??'VERA GATE'; $h=head('Login').theme_btn().'<div class="center"><div class="card"><div class="logo-top"><img src="'.logo_full().'" alt="VERA GATE"></div><h1>Masuk</h1><div class="sub">Login dashboard '.e($mname).'.</div>'.flash_html();
  $h.='<form method="post" action="'.u('login').'"><div class="field"><label>Email</label><input type="email" name="email" required placeholder="kamu@email.com"></div><div class="field"><label>Password</label><input type="password" name="password" required placeholder="kata sandi"></div><button class="btn" type="submit">Masuk Dashboard <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>';
  $h.='<div class="backlink" style="margin-top:12px"><a href="'.u('forgot').'" style="color:var(--blue);font-weight:700">Lupa password?</a></div>';
  $h.='<div class="backlink" style="margin-top:6px">Belum punya akun? <a href="'.u('daftar').'" style="color:var(--blue);font-weight:700">Daftar di sini</a></div></div></div>';
  return $h.foot(); }

function view_forgot(){ $h=head('Lupa Password').theme_btn().'<div class="center"><div class="card"><div class="logo-top"><img src="'.logo_full().'" alt="VERA GATE"></div><h1>Lupa Password</h1><div class="sub">Masukkan email akun kamu. Kata sandi sementara akan dikirim ke email itu.</div>'.flash_html();
  $h.='<form method="post" action="'.u('forgot').'"><div class="field"><label>Email</label><input type="email" name="email" required placeholder="kamu@email.com"></div><button class="btn" type="submit">Kirim ke Email</button></form>';
  $h.='<div class="backlink" style="margin-top:12px"><a href="'.u('login').'" style="color:var(--blue);font-weight:700">&larr; Kembali ke login</a></div></div></div>';
  return $h.foot(); }

function view_ganti_sandi(){ $b='<div style="font-size:20px;font-weight:800;margin-bottom:4px">Ubah Kata Sandi</div><div style="font-size:13px;color:var(--muted);margin-bottom:18px">Ganti kata sandi akun kamu ('.e(cur_row()['email']??'').').</div>';
  $b.='<div class="tablecard" style="padding:22px;max-width:460px"><form method="post" action="'.u('ganti-sandi').'"><div class="field"><label>Kata sandi lama</label><input type="password" name="lama" required></div><div class="field"><label>Kata sandi baru</label><input type="password" name="baru" required placeholder="minimal 6 karakter"></div><div class="field"><label>Ulangi kata sandi baru</label><input type="password" name="konfirmasi" required></div><button class="btn" type="submit">Simpan Kata Sandi</button></form></div>';
  return layout('','Ubah Kata Sandi',$b); }

function view_daftar(){ $mname=cur_merchant()['nama']??'VERA GATE'; $h=head('Daftar').theme_btn().'<div class="center"><div class="card"><div class="logo-top"><img src="'.logo_full().'" alt="VERA GATE"></div><h1>Daftar Akun</h1><div class="sub">Daftar untuk '.e($mname).'. Akun baru menunggu persetujuan admin.</div>'.flash_html();
  $h.='<form method="post" action="'.u('daftar').'"><div class="field"><label>Nama Lengkap</label><input name="nama" required placeholder="cth: Budi Santoso"></div><div class="field"><label>Email</label><input type="email" name="email" required placeholder="kamu@email.com"></div><div class="field"><label>Password</label><input type="password" name="password" required placeholder="minimal 6 karakter"></div><button class="btn" type="submit">Daftar</button></form>';
  $h.='<div class="backlink">Sudah punya akun? <a href="'.u('login').'" style="color:var(--blue);font-weight:700">Masuk</a></div></div></div>';
  return $h.foot(); }

function nav($active,$role){ $items=[['dashboard','Dashboard'],['payment-link','Payment Link'],['report','Report']];
  $admin=[['tools','Tools'],['users','User Management'],['merchant','Merchant'],['provider','Pengaturan Provider']];
  $ic=['dashboard'=>'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    'payment-link'=>'<path d="M9 12a4 4 0 014-4h2a4 4 0 010 8h-1M15 12a4 4 0 01-4 4H9a4 4 0 010-8h1"/>','report'=>'<path d="M5 4h11l3 3v13H5z"/><path d="M9 13v3M12 11v5M15 9v7"/>',
    'tools'=>'<path d="M14 7a4 4 0 01-5 5l-5 5 2 2 5-5a4 4 0 005-5z"/>','users'=>'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><path d="M16 7a3 3 0 010 6M21 20c0-2.4-1.6-4.2-4-4.8"/>',
    'merchant'=>'<path d="M4 9l1-5h14l1 5M4 9h16v2a4 4 0 01-8 0 4 4 0 01-8 0V9z"/><path d="M5 13v7h14v-7"/>','provider'=>'<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.8 7.8 0 000-2l2-1.5-2-3.4-2.4 1a7.6 7.6 0 00-1.7-1L14.8 3h-3.6l-.5 2.6a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 000 2l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 001.7 1l.5 2.6h3.6l.5-2.6a7.6 7.6 0 001.7-1l2.4 1 2-3.4-2-1.5z"/>'];
  $out=''; foreach($items as $it){ if(!can($it[0])) continue; $out.='<a class="nav '.($active==$it[0]?'on':'').'" href="'.u($it[0]).'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'.$ic[$it[0]].'</svg><span>'.$it[1].'</span></a>'; }
  $av=array_values(array_filter($admin,fn($it)=>can($it[0]))); if($av){ $out.='<div class="grp">Admin</div>'; foreach($av as $it) $out.='<a class="nav '.($active==$it[0]?'on':'').'" href="'.u($it[0]).'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'.$ic[$it[0]].'</svg><span>'.$it[1].'</span></a>'; }
  return $out; }

function layout($active,$title,$body){ $c=cur(); $h=head($title).'<div class="shell"><div class="side-backdrop" id="sideBackdrop"></div><aside class="side" id="sideNav">'.
  '<div class="brand"><span class="chip"><img src="'.logo_mark().'" alt="VG"></span><span class="wm">VERA GATE<small>PAYMENT GATEWAY</small></span></div>'.
  '<div class="merchant"><div class="l">Merchant</div><div class="n">'.e(cur_merchant()['nama'] ?? ($c['merchant']?:'VERA GATE')).'</div></div>'.nav($active,$c['role']).
  '<div style="margin-top:auto;font-size:11px;color:var(--muted);padding:12px">Version 1.0 · Asia/Jakarta<br>VERA GATE © '.date('Y').'</div></aside>'.
  '<div class="main"><div class="topbar"><button class="hb" id="hbBtn" aria-label="Menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button><div class="brand"><span class="chip"><img src="'.logo_mark().'" alt="VG"></span><span class="wm" style="color:#fff">VERA GATE<small style="color:rgba(255,255,255,.7)">PRODUCTION</small></span></div>'.
  '<div class="r"><span class="pill">PRODUCTION</span><span class="tg" id="themeBtn" title="Mode malam"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg></span>'.
  '<span>'.e($c['nama']?:'Admin').'</span><span class="pill" style="text-transform:capitalize">'.e($c['role']).'</span><a href="'.u('ganti-sandi').'" title="Ubah kata sandi" style="color:#fff;opacity:.9;font-weight:600;font-size:13px">Ubah Sandi</a><span class="ava"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/></svg></span><a href="'.u('logout').'" style="color:#fff;opacity:.85">Keluar</a></div></div>'.
  '<div class="content">'.flash_html().$body.'</div></div></div>';
  return $h.foot(); }

function view_403(){ return head('403').'<div class="center"><div class="card" style="text-align:center"><h1 style="font-size:40px">403</h1><p class="sub">Akses ditolak. Khusus admin.</p><a class="btn" href="'.u('dashboard').'">Ke Dashboard</a></div></div>'.foot(); }
function view_404(){ return head('404').'<div class="center"><div class="card" style="text-align:center"><h1 style="font-size:40px">404</h1><p class="sub">Halaman tidak ditemukan.</p><a class="btn" href="'.u('home').'">Ke Beranda</a></div></div>'.foot(); }

function view_dashboard(){ $M=METODE();

  $expired_time = date('Y-m-d H:i:s', strtotime('-10 minutes'));
  pdo()->prepare("UPDATE transaksi SET status='gagal', verifikasi='Kedaluwarsa (10m)' WHERE status='menunggu' AND dibuat <= ?")->execute([$expired_time]);

  $api=$_GET['api']??'all'; $status=$_GET['status']??'all'; $metode=$_GET['metode']??'all'; 
  
  $periode=$_GET['periode']??'hari'; 
  
  $start=trim($_GET['start']??''); $end=trim($_GET['end']??''); $q=trim($_GET['q']??'');
  $per_page=(int)($_GET['per_page']??25); if(!in_array($per_page,[10,25,50,100])) $per_page=25;
  $page=max(1,(int)($_GET['page']??1));
  $today=date('Y-m-d');
  
  if($periode==='hari'){ $es=$today; $ee=$today; } elseif($periode==='bulan'){ $es=date('Y-m-01'); $ee=$today; }
  elseif($periode==='tahun'){ $es=date('Y-01-01'); $ee=$today; } elseif($periode==='custom'){ $es=$start; $ee=$end; } else { $es=''; $ee=''; }
  
  $w=['merchant_id='.(int)mid()]; $pr=[];
  if($api!=='all'){
    if($api==='QRIS'){ $w[]="api IN ('QRIS','Flypay')"; } // gabungkan QRIS (manual) & Flypay jadi 1 tab
    else { $w[]='api=?'; $pr[]=$api; }
  }
  if($metode!=='all'){ $w[]='metode=?'; $pr[]=$metode; }
  if($es){ $w[]='date(dibuat)>=date(?)'; $pr[]=$es; } if($ee){ $w[]='date(dibuat)<=date(?)'; $pr[]=$ee; }
  if($q!==''){ $w[]='(lower(ref_no) LIKE ? OR lower(username) LIKE ? OR lower(pengirim) LIKE ? OR lower(metode) LIKE ? OR lower(api) LIKE ?)'; $like='%'.strtolower($q).'%'; array_push($pr,$like,$like,$like,$like,$like); }
  $cl=$w?('WHERE '.implode(' AND ',$w)):'';
  
  $st=pdo()->prepare("SELECT * FROM transaksi $cl ORDER BY id DESC"); $st->execute($pr); $base=$st->fetchAll();
  $filtered=array_values(array_filter($base,fn($r)=>$status==='all'||$r['status']===$status));
  $total=count($filtered); $pages=max(1,(int)ceil($total/$per_page)); $page=min($page,$pages);
  $lo=($page-1)*$per_page; $rows=array_slice($filtered,$lo,$per_page); $show_lo=$total?$lo+1:0; $show_hi=$lo+count($rows);
  
  $stat=['sukses'=>0,'sukses_amt'=>0,'menunggu'=>0,'gagal'=>0];
  foreach($base as $r){ if($r['status']==='sukses'){ $stat['sukses']++; $stat['sukses_amt']+=$r['nominal']; } elseif($r['status']==='menunggu') $stat['menunggu']++; elseif($r['status']==='gagal') $stat['gagal']++; }
  $common=['status'=>$status,'metode'=>$metode,'periode'=>$periode,'start'=>$start,'end'=>$end,'q'=>$q,'per_page'=>$per_page];
  
  // Tab API
  $stq=pdo()->prepare("SELECT DISTINCT api FROM transaksi WHERE merchant_id=? AND api IS NOT NULL AND api<>'' ORDER BY api"); $stq->execute([mid()]); $dataApis=$stq->fetchAll(PDO::FETCH_COLUMN);
  $apis=['QRIS']; foreach($dataApis as $a){ if($a==='Flypay') continue; if(!in_array($a,$apis,true)) $apis[]=$a; } // Flypay digabung ke tab QRIS
  $b='<div style="font-size:20px;font-weight:800;letter-spacing:-.5px;margin-bottom:12px">Transactions</div><div class="apis">';
  $b.='<a class="apitab '.($api=='all'?'on':'').'" href="'.u('dashboard',$common).'"><span class="dot"></span>Semua</a>';
  foreach($apis as $a){ $lbl=($a==='QRIS')?'QRIS & Manual':e($a); $b.='<a class="apitab '.($api==$a?'on':'').'" href="'.u('dashboard',array_merge($common,['api'=>$a])).'"><span class="dot"></span>'.$lbl.'</a>'; }
  $b.='</div>';
  
  $b.='<div class="summary"><div class="sc"><div class="l"><span class="ic" style="background:var(--green-bg)">&#10003;</span>Total Sukses</div><div class="v">'.$stat['sukses'].'</div></div>'.
    '<div class="sc"><div class="l"><span class="ic" style="background:var(--green-bg)">&#128181;</span>Nominal Sukses</div><div class="v mono" style="font-size:19px">'.rupiah($stat['sukses_amt']).'</div></div>'.
    '<div class="sc"><div class="l"><span class="ic" style="background:var(--amber-bg)">&#9203;</span>Menunggu</div><div class="v">'.$stat['menunggu'].'</div></div>'.
    '<div class="sc"><div class="l"><span class="ic" style="background:var(--red-bg)">&#10005;</span>Gagal</div><div class="v">'.$stat['gagal'].'</div></div></div>';
  
  // filter form
  $sel=fn($a,$v)=>$a==$v?'selected':'';
  $b.='<form class="filters" method="get" id="filterForm"><input type="hidden" name="p" value="dashboard"><input type="hidden" name="api" value="'.e($api).'">'.
    '<div class="fg" style="flex:1;min-width:240px"><label>Cari (Ref No / Username / Nama / Metode)</label><input id="f-search" name="q" value="'.e($q).'" placeholder="ketik untuk mencari semua data..." autocomplete="off"></div>'.
    '<div class="fg"><label>Periode</label><select name="periode" onchange="vgPeriode(this.value)"><option value="semua" '.$sel('semua',$periode).'>Semua</option><option value="hari" '.$sel('hari',$periode).'>Hari ini</option><option value="bulan" '.$sel('bulan',$periode).'>Bulan ini</option><option value="tahun" '.$sel('tahun',$periode).'>Tahun ini</option><option value="custom" '.$sel('custom',$periode).'>Rentang custom</option></select></div>'.
    '<div class="fg"><label>Tgl Mulai</label><input type="date" name="start" value="'.e($start).'"></div><div class="fg"><label>Tgl Akhir</label><input type="date" name="end" value="'.e($end).'"></div>'.
    '<div class="fg"><label>Metode</label><select name="metode"><option value="all" '.$sel('all',$metode).'>Semua</option>';
  foreach($M as $k=>$v) $b.='<option value="'.e($k).'" '.$sel($k,$metode).'>'.e($k).'</option>'; $b.='</select></div>'.
    '<div class="fg"><label>Status</label><select name="status"><option value="all" '.$sel('all',$status).'>Semua</option><option value="sukses" '.$sel('sukses',$status).'>Sukses</option><option value="menunggu" '.$sel('menunggu',$status).'>Menunggu</option><option value="gagal" '.$sel('gagal',$status).'>Gagal</option><option value="kedaluwarsa" '.$sel('kedaluwarsa',$status).'>Kedaluwarsa</option></select></div>'.
    '<div class="fg"><label>Per halaman</label><select name="per_page" onchange="document.getElementById(\'filterForm\').submit()">';
  foreach([10,25,50,100] as $nn) $b.='<option value="'.$nn.'" '.$sel($nn,$per_page).'>'.$nn.'</option>'; $b.='</select></div>'.
    '<button class="btn sm" type="submit">Terapkan</button><a class="btn sm alt" href="'.u('dashboard').'">Reset</a></form>';
  
  // table
  $b.='<div class="tablecard"><div class="table-scroll"><table><thead><tr><th>Tanggal</th><th>Username</th><th>Nama Pengirim</th><th>Metode Bayar</th><th>QRIS</th><th>Nominal</th><th>Status</th><th>Ref No</th><th>Aksi</th></tr></thead><tbody>';
  if($rows) foreach($rows as $t){ $dot=$M[$t['metode']]??'bank';
    $b.='<tr><td class="mono muted">'.jam($t['dibuat']).'</td><td><span class="uname"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>'.e($t['username']).'</span></td>'.
      '<td style="font-weight:600">'.e($t['pengirim']).'</td>'.
      '<td>'.($t['metode']&&$t['metode']!=='-'?'<span class="met"><span class="d '.$dot.'"></span>'.e($t['metode']).'</span>':'<span class="muted">—</span>').'</td>'.
      '<td class="muted" style="font-weight:600">'.e($t['api']).'</td><td class="amt">'.rupiah($t['nominal']).'</td>'.
      '<td><span class="badge '.e($t['status']).'">'.strtoupper(e($t['status'])).'</span>'.($t['status']==='sukses'&&$t['verifikasi']&&$t['verifikasi']!=='-'?'<div class="verif">'.e(verif_label($t['verifikasi'])).($t['oleh']?' ('.e($t['oleh']).')':'').'</div>':'').'</td>'.
      '<td class="mono muted">'.e($t['ref_no']).'</td><td class="act"><a class="abtn" href="'.u('qris',['ref'=>$t['ref_no']]).'">Buka</a>'.
      '<form method="post" action="'.u('cek',['ref'=>$t['ref_no']]).'" style="display:inline"><button class="abtn" type="submit">Cek</button></form></td></tr>';
  } else $b.='<tr><td colspan="9"><div class="empty">'.($q?'Tidak ada hasil untuk "'.e($q).'".':'Belum ada transaksi untuk filter ini.').'</div></td></tr>';
  $b.='</tbody></table></div>';
  
  // pager
  $pl=fn($pg)=>u('dashboard',array_merge($common,['api'=>$api,'page'=>$pg]));
  $b.='<div class="pager"><div class="info">Menampilkan '.$show_lo.'&ndash;'.$show_hi.' dari '.$total.' transaksi</div><div class="nums">';
  $b.='<a class="pg '.($page<=1?'dis':'').'" href="'.$pl($page-1).'">&lsaquo;</a>';
  foreach(page_window($page,$pages) as $pg){ if($pg===null) $b.='<span class="pg dots">&hellip;</span>'; else $b.='<a class="pg '.($pg==$page?'on':'').'" href="'.$pl($pg).'">'.$pg.'</a>'; }
  $b.='<a class="pg '.($page>=$pages?'dis':'').'" href="'.$pl($page+1).'">&rsaquo;</a></div></div></div>';
  $b.='<script>function vgPeriode(v){var f=document.getElementById("filterForm");if(v!=="custom"){f.querySelector("[name=start]").value="";f.querySelector("[name=end]").value="";}f.submit();}document.addEventListener("DOMContentLoaded",function(){var s=document.getElementById("f-search");if(!s)return;s.focus();var v=s.value;s.value="";s.value=v;var t=null;s.addEventListener("input",function(){clearTimeout(t);t=setTimeout(function(){document.getElementById("filterForm").submit();},450);});});</script>';
  $b.='<script>window.__vgRefresh=10000;</script>';
  
  return layout('dashboard','Dashboard',$b); 
}

function page_window($cur,$last,$width=2){ $keep=[1=>1,$last=>1]; for($p=$cur-$width;$p<=$cur+$width;$p++) if($p>=1&&$p<=$last) $keep[$p]=1; ksort($keep); $out=[]; $prev=0; foreach(array_keys($keep) as $p){ if($prev&&$p-$prev>1) $out[]=null; $out[]=$p; $prev=$p; } return $out; }

function view_payment_link(){ 
  $M=METODE(); 
  $b='<div style="font-size:20px;font-weight:800;margin-bottom:4px">Payment Link / QRIS</div><div style="font-size:13px;color:var(--muted);margin-bottom:18px">Buat tagihan untuk customer, lalu bagikan link-nya.</div>';
  
  $link=$ref=null;
  if($_SERVER['REQUEST_METHOD']==='POST'){ 
      $username=trim($_POST['username']??''); 
      $nominal=(int)preg_replace('/[^0-9]/','',$_POST['nominal']??'0');
      
      if($username&&$nominal>0){ 
          $ref=new_ref(); $cfg=provider_cfg(); $qr=''; $pref=''; $api='Flypay'; $channel=$_POST['channel']??$cfg['default_channel'];
          
          if($cfg['live']){ 
                      try{ 
                          [$qr,$pref,]=flypay_create_deposit($ref,$nominal,$username,abs_url(u('callback'))); 
                          $qr=$qr?:''; 
                          unset($_SESSION['gp_err']);
                      } catch(Exception $e){ 
                          $_SESSION['gp_err']=$e->getMessage(); 
                          flash('Flypay gagal: '.$e->getMessage(),'err'); 
                      } 
                  }
          
          pdo()->prepare("INSERT INTO transaksi(ref_no,username,nominal,api,metode,status,qr_string,provider_ref,merchant_id,dibuat) VALUES(?,?,?,?,?, 'menunggu', ?,?,?,?)")
               ->execute([$ref,$username,$nominal,$api,$cfg['live']?$channel:'-',$qr,$pref,mid(),date('Y-m-d H:i:s')]);
               
          $link=abs_url(u('qris',['ref'=>$ref])); 
      } else { 
          flash('Isi username & nominal dulu.','err'); 
      } 
  }
  
  $b.='<div class="tablecard" style="padding:22px;max-width:540px"><form method="post" action="'.u('payment-link').'"><div class="field"><label>Username Customer</label><input name="username" required placeholder="cth: budi_santoso"></div><div class="field"><label>Nominal</label><div class="ip-rp"><span class="pre">Rp</span><input name="nominal" inputmode="numeric" required placeholder="cth: 50000"></div></div><div class="field"><label>Channel</label><select name="channel">';
  foreach($M as $k=>$v) $b.='<option>'.e($k).'</option>'; $b.='</select></div><button class="btn" type="submit">Buat Link Pembayaran</button></form>';
  
  if($link) $b.='<div style="margin-top:18px;border-top:1px dashed var(--line);padding-top:16px"><div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Link Pembayaran</div><div class="mono" id="pl-link" style="font-size:12px;background:var(--blue-50);color:var(--blue);padding:10px 12px;border-radius:10px;word-break:break-all">'.e($link).'</div><div style="display:flex;gap:10px;margin-top:12px"><a class="btn sm" href="'.e($link).'">Buka</a><button class="btn sm alt" type="button" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById(\'pl-link\').innerText);this.textContent=\'Tersalin ✓\'">Salin Link</button></div></div>';
  $b.='</div>';
  return layout('pl','Payment Link',$b); 
}

function view_report(){ 
  $M=METODE();
  
  $expired_time = date('Y-m-d H:i:s', strtotime('-10 minutes'));
  pdo()->prepare("UPDATE transaksi SET status='gagal', verifikasi='Kedaluwarsa (10m)' WHERE status='menunggu' AND dibuat <= ?")->execute([$expired_time]);

  $g=$_GET['g']??'hari'; 
  $g=in_array($g,['hari','minggu','bulan','tahun','custom'],true)?$g:'hari';
  
  $start=preg_match('/^\d{4}-\d{2}-\d{2}$/',$_GET['start']??'')?$_GET['start']:'';
  $end=preg_match('/^\d{4}-\d{2}-\d{2}$/',$_GET['end']??'')?$_GET['end']:'';
  $labels=['hari'=>'Harian','minggu'=>'Mingguan','bulan'=>'Bulanan','tahun'=>'Tahunan','custom'=>'Custom'];
  
  $bk=[]; $d=['total'=>0,'sukses'=>0,'sukses_amt'=>0,'menunggu'=>0,'gagal'=>0];
  
  if($g==='custom'){ 
      $bk=report_buckets('custom',$start,$end); $d=buckets_total($bk); 
  } elseif($g==='hari') {
      $bk=report_buckets($g);
      // KHUSUS HARI INI: Hitung kartu atas HANYA untuk transaksi hari ini saja
      $today = date('Y-m-d');
      $rs=pdo()->prepare("SELECT * FROM transaksi WHERE merchant_id=? AND date(dibuat)=?");
      $rs->execute([mid(), $today]);
      foreach($rs->fetchAll() as $r){
          $d['total']++;
          if($r['status']==='sukses'){ $d['sukses']++; $d['sukses_amt']+=$r['nominal']; }
          elseif($r['status']==='menunggu') $d['menunggu']++;
          elseif($r['status']==='gagal') $d['gagal']++;
      }
  } else { 
      $bk=report_buckets($g); $d=report_data(); 
  }
  
  $pq=['g'=>$g]; if($g==='custom'){ if($start)$pq['start']=$start; if($end)$pq['end']=$end; }
  
  $b='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:4px"><div style="font-size:20px;font-weight:800">Report</div><a class="btn sm" href="'.u('report-print',$pq).'" target="_blank">Cetak / PDF</a></div><div style="font-size:13px;color:var(--muted);margin-bottom:18px">Ringkasan transaksi. Pilih periode untuk rekap per hari, minggu, bulan, tahun, atau rentang tanggal sendiri.</div>';
  $b.='<div class="summary"><div class="sc"><div class="l">Total Transaksi</div><div class="v" style="font-size:20px">'.$d['total'].'</div></div><div class="sc"><div class="l">Sukses</div><div class="v" style="font-size:20px">'.$d['sukses'].'</div></div><div class="sc"><div class="l">Nominal Sukses</div><div class="v" style="font-size:20px">'.rupiah($d['sukses_amt']).'</div></div><div class="sc"><div class="l">Menunggu / Gagal</div><div class="v" style="font-size:20px">'.$d['menunggu'].' / '.$d['gagal'].'</div></div></div>';
  $b.='<div class="apis" style="margin-bottom:14px">'; foreach($labels as $k=>$lab) $b.='<a class="apitab '.($g===$k?'on':'').'" href="'.u('report',['g'=>$k]).'"><span class="dot"></span>'.$lab.'</a>'; $b.='</div>';
  
  if($g==='custom') $b.='<div class="tablecard" style="padding:16px 18px;margin-bottom:14px"><form method="get" style="display:flex;flex-wrap:wrap;gap:12px;align-items:end"><input type="hidden" name="p" value="report"><input type="hidden" name="g" value="custom"><div class="field" style="margin:0"><label>Dari tanggal</label><input type="date" name="start" value="'.e($start).'"></div><div class="field" style="margin:0"><label>Sampai tanggal</label><input type="date" name="end" value="'.e($end).'"></div><button class="btn sm" type="submit">Terapkan</button></form></div>';
  
  $b.='<div class="tablecard"><div style="padding:14px 16px;font-weight:800;font-size:14px;border-bottom:1px solid var(--line)">Ringkasan '.$labels[$g].($g==='custom'&&($start||$end)?' ('.e($start?:'awal').' s/d '.e($end?:'kini').')':'').'</div><div class="table-scroll"><table><thead><tr><th>Periode</th><th>Transaksi</th><th>Sukses</th><th>Nominal Sukses</th><th>Menunggu</th><th>Gagal</th></tr></thead><tbody>';
  
  if($bk) foreach($bk as $row) $b.='<tr><td style="font-weight:700">'.e($row['label']).'</td><td>'.$row['total'].'</td><td>'.$row['sukses'].'</td><td class="amt">'.rupiah($row['amt']).'</td><td>'.$row['menunggu'].'</td><td>'.$row['gagal'].'</td></tr>';
  else $b.='<tr><td colspan="6"><div class="empty">Belum ada transaksi pada periode ini.</div></td></tr>';
  
  $b.='</tbody></table></div></div>';
  
  $b.='<div class="tablecard" style="margin-top:16px"><div style="padding:14px 16px;font-weight:800;font-size:14px;border-bottom:1px solid var(--line)">Per Metode Bayar (sukses, semua waktu)</div><div class="table-scroll"><table><thead><tr><th>Metode</th><th>Transaksi</th><th>Nominal</th></tr></thead><tbody>';
  
  $rd=report_data();
  if($rd['per_met']) foreach($rd['per_met'] as $mm){ $dot=$M[$mm['nama']]??'bank'; $b.='<tr><td><span class="met"><span class="d '.$dot.'"></span>'.e($mm['nama']).'</span></td><td>'.$mm['n'].'</td><td class="amt">'.rupiah($mm['amt']).'</td></tr>'; }
  else $b.='<tr><td colspan="3"><div class="empty">Belum ada pembayaran sukses.</div></td></tr>';
  
  $b.='</tbody></table></div></div>';
  return layout('report','Report',$b); 
}

function view_report_print(){ 
  $expired_time = date('Y-m-d H:i:s', strtotime('-10 minutes'));
  pdo()->prepare("UPDATE transaksi SET status='gagal', verifikasi='Kedaluwarsa (10m)' WHERE status='menunggu' AND dibuat <= ?")->execute([$expired_time]);

  $g=$_GET['g']??'hari'; 
  $g=in_array($g,['hari','minggu','bulan','tahun','custom'],true)?$g:'hari';
  
  $start=preg_match('/^\d{4}-\d{2}-\d{2}$/',$_GET['start']??'')?$_GET['start']:'';
  $end=preg_match('/^\d{4}-\d{2}-\d{2}$/',$_GET['end']??'')?$_GET['end']:'';
  $labels=['hari'=>'Harian','minggu'=>'Mingguan','bulan'=>'Bulanan','tahun'=>'Tahunan','custom'=>'Custom'];
  
  $d=['total'=>0,'sukses'=>0,'sukses_amt'=>0,'menunggu'=>0,'gagal'=>0];
  $bk=[]; $rows=[];

  if($g==='custom'){ 
      $bk=report_buckets('custom',$start,$end); $d=buckets_total($bk);
      $rq="SELECT * FROM transaksi WHERE merchant_id=?"; $ra=[mid()]; 
      if($start){$rq.=" AND dibuat>=?";$ra[]=$start.' 00:00:00';} 
      if($end){$rq.=" AND dibuat<=?";$ra[]=$end.' 23:59:59';} 
      $rq.=" ORDER BY id DESC"; 
      $rs=pdo()->prepare($rq); $rs->execute($ra); $rows=$rs->fetchAll();
  } elseif($g==='hari') {
      $bk=report_buckets($g); 
      $today = date('Y-m-d');
      $rs=pdo()->prepare("SELECT * FROM transaksi WHERE merchant_id=? AND date(dibuat)=? ORDER BY id DESC");
      $rs->execute([mid(), $today]);
      $rows=$rs->fetchAll();
      foreach($rows as $r){
          $d['total']++;
          if($r['status']==='sukses'){ $d['sukses']++; $d['sukses_amt']+=$r['nominal']; }
          elseif($r['status']==='menunggu') $d['menunggu']++;
          elseif($r['status']==='gagal') $d['gagal']++;
      }
  } else { 
      $bk=report_buckets($g); $d=report_data(); 
      $rs=pdo()->prepare("SELECT * FROM transaksi WHERE merchant_id=? ORDER BY id DESC");
      $rs->execute([mid()]);$rows=$rs->fetchAll(); 
  }
  
  $rangetxt = $g==='custom' ? (' ('.($start?:'awal').' s/d '.($end?:'kini').')') : '';
  $mname=cur_merchant()['nama']??'VERA GATE';
  
  $h='<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Laporan VERA GATE</title><style>body{font-family:Arial;padding:26px;color:#13243A}h1{margin:0 0 2px;font-size:20px}h2{font-size:14px;margin:20px 0 4px}.sub{color:#667;margin-bottom:16px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}th,td{border:1px solid #ddd;padding:7px 9px;text-align:left}th{background:#16304F;color:#fff}.cards{display:flex;gap:12px;margin-bottom:14px}.c{border:1px solid #ddd;border-radius:8px;padding:9px 14px;font-size:12px}.c b{display:block;font-size:17px;margin-top:3px}.r{text-align:right}.btn{background:#16304F;color:#fff;border:none;padding:9px 16px;border-radius:8px;font-weight:700;cursor:pointer}@media print{.noprint{display:none}}</style></head><body>';
  $h.='<div class="noprint" style="text-align:right;margin-bottom:10px"><button class="btn" onclick="window.print()">Cetak / Simpan PDF</button></div><h1>VERA GATE — Laporan Transaksi</h1><div class="sub">'.e($mname).' &middot; Rekap '.$labels[$g].e($rangetxt).' &middot; Dicetak: '.date('d/m/Y H:i').' WIB</div>';
  $h.='<div class="cards"><div class="c">Total Transaksi<b>'.$d['total'].'</b></div><div class="c">Sukses<b>'.$d['sukses'].'</b></div><div class="c">Nominal Sukses<b>'.rupiah($d['sukses_amt']).'</b></div><div class="c">Menunggu / Gagal<b>'.$d['menunggu'].' / '.$d['gagal'].'</b></div></div>';
  
  $h.='<h2>Ringkasan '.$labels[$g].e($rangetxt).'</h2><table><thead><tr><th>Periode</th><th>Transaksi</th><th>Sukses</th><th class="r">Nominal Sukses</th><th>Menunggu</th><th>Gagal</th></tr></thead><tbody>';
  if($bk) foreach($bk as $row) $h.='<tr><td>'.e($row['label']).'</td><td>'.$row['total'].'</td><td>'.$row['sukses'].'</td><td class="r">'.rupiah($row['amt']).'</td><td>'.$row['menunggu'].'</td><td>'.$row['gagal'].'</td></tr>';
  else $h.='<tr><td colspan="6">Belum ada transaksi.</td></tr>';
  $h.='</tbody></table>';
  
  $h.='<h2>Detail Transaksi</h2><table><thead><tr><th>Tanggal</th><th>Username</th><th>Nama Pengirim</th><th>Metode</th><th>QRIS</th><th class="r">Nominal</th><th>Status</th><th>Ref No</th></tr></thead><tbody>';
  foreach($rows as $t) $h.='<tr><td>'.jam($t['dibuat']).'</td><td>'.e($t['username']).'</td><td>'.e($t['pengirim']).'</td><td>'.e($t['metode']).'</td><td>'.e($t['api']).'</td><td class="r">'.rupiah($t['nominal']).'</td><td>'.strtoupper(e($t['status'])).'</td><td>'.e($t['ref_no']).'</td></tr>';
  if(!$rows) $h.='<tr><td colspan="8">Belum ada transaksi.</td></tr>';
  
  $h.='</tbody></table><script>window.onload=function(){setTimeout(function(){window.print();},300);}</script></body></html>';
  return $h; 
}

function view_tools(){ 
  $b='<div style="font-size:20px;font-weight:800;margin-bottom:4px">Tarik Dana (Disbursement)</div><div style="font-size:13px;color:var(--muted);margin-bottom:18px">Kirim saldo ke rekening bank / e-wallet via API Flypay.</div>';
  
  $b.='<div class="tablecard" style="padding:22px;max-width:580px;margin-bottom:24px;border:2px solid var(--blue)"><form method="post" action="'.u('do_withdraw').'">';
  $b.='<div class="field"><label>Bank / E-Wallet Tujuan (Sesuai Singkatan Flypay)</label><input name="bankCode" required placeholder="cth: BCA, BRI, MANDIRI, DANA, OVO"></div>';
  $b.='<div class="field"><label>Nomor Rekening / HP E-Wallet</label><input name="accountNumber" required placeholder="cth: 0123456789"></div>';
  $b.='<div class="field"><label>Nama Pemilik Rekening</label><input name="accountName" required placeholder="cth: Budi Santoso"></div>';
  $b.='<div class="field"><label>Nominal Penarikan</label><div class="ip-rp"><span class="pre">Rp</span><input name="nominal" inputmode="numeric" required placeholder="cth: 100000"></div></div>';
  $b.='<button class="btn" type="submit" onclick="return confirm(\'Pastikan nomor rekening dan nominal sudah benar. Lanjutkan pencairan?\')">Cairkan Dana Sekarang</button></form></div>';

  $b.='<div style="font-size:20px;font-weight:800;margin-bottom:4px">Tools</div><div style="font-size:13px;color:var(--muted);margin-bottom:18px">Kelola data & ekspor transaksi.</div>';
  $b.='<div class="tablecard" style="padding:22px;max-width:580px;display:flex;flex-direction:column;gap:16px">';
  $b.=trow('Ekspor CSV','Unduh semua transaksi (Excel-friendly).','<a class="btn sm" href="'.u('export-csv').'">Unduh CSV</a>');
  $b.=trow('Ekspor JSON','Cadangan data mentah.','<a class="btn sm" href="'.u('export-json').'">Unduh JSON</a>');
  $b.=trow('Cetak / PDF','Buka tampilan cetak lalu Simpan sebagai PDF.','<a class="btn sm" href="'.u('report-print').'" target="_blank">Buka PDF</a>');
  $b.=trow('<span style="color:var(--red)">Reset Data</span>','Hapus semua transaksi merchant ini.','<form method="post" action="'.u('reset').'" onsubmit="return confirm(\'Reset semua transaksi?\')"><button class="btn sm" style="background:var(--red)">Reset</button></form>');
  $b.='</div>';
  
  return layout('tools','Tools',$b); 
}

function trow($t,$d,$a){ return '<div style="display:flex;justify-content:space-between;align-items:center;gap:14px"><div><div style="font-weight:700">'.$t.'</div><div style="font-size:12px;color:var(--muted)">'.$d.'</div></div>'.$a.'</div>'; }

function view_users(){ $c=cur(); $rows=pdo()->query("SELECT u.*, m.nama AS merchant_nama FROM users u LEFT JOIN merchants m ON m.id=u.merchant_id ORDER BY u.id")->fetchAll();
  $secs=['dashboard'=>'Dashboard','payment-link'=>'Payment Link','report'=>'Report','tools'=>'Tools','users'=>'User Mgmt','merchant'=>'Merchant','provider'=>'Provider'];
  $b='<div style="font-size:20px;font-weight:800;margin-bottom:4px">User Management</div><div style="font-size:13px;color:var(--muted);margin-bottom:18px">Tambah user, atur role & permission per menu, setujui pendaftar, reset kata sandi.</div>';
  // form tambah user
  $b.='<div class="tablecard" style="padding:18px 20px;margin-bottom:16px"><div style="font-weight:800;margin-bottom:12px">+ Tambah User Baru</div><form method="post" action="'.u('user-add').'">'.
    '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:end">'.
      '<div class="field" style="margin:0;flex:1;min-width:150px"><label>Nama</label><input name="nama" required placeholder="Nama user"></div>'.
      '<div class="field" style="margin:0;flex:1;min-width:180px"><label>Email</label><input type="email" name="email" required placeholder="user@email.com"></div>'.
      '<div class="field" style="margin:0;min-width:150px"><label>Password awal</label><input name="password" required placeholder="kata sandi"></div>'.
      '<div class="field" style="margin:0;width:140px"><label>Role</label><select name="role" onchange="document.getElementById(\'uaPerm\').style.display=this.value===\'admin\'?\'none\':\'flex\'"><option value="operator">Operator</option><option value="admin">Admin (akses penuh)</option></select></div>'.
    '</div>'.
    '<div id="uaPerm" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:12px"><span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Permissions</span>';
  foreach($secs as $k=>$lbl) $b.='<label style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;cursor:pointer"><input type="checkbox" name="perm[]" value="'.$k.'" '.(in_array($k,['dashboard','payment-link','report'],true)?'checked':'').'> '.e($lbl).'</label>';
  $b.='</div>'.
    '<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;margin-top:12px;cursor:pointer"><input type="checkbox" name="kirim_email" value="1"> Kirim info login ke email user</label>'.
    '<div style="margin-top:12px"><button class="btn sm" type="submit">Tambah User</button></div></form></div>';
  $b.='<div class="tablecard"><div class="table-scroll"><table><thead><tr><th>Nama</th><th>Email</th><th>Merchant</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
  foreach($rows as $u){ $self=$u['id']==$c['id']; $af=u('user-aksi',['id'=>$u['id']]);
    $act='<div class="linkrow">';
    if($u['status']!=='aktif') $act.=ax($af,'setujui','Setujui','color:var(--green)');
    if($u['role']!=='admin') $act.=ax($af,'role_admin','Jadikan Admin','');
    elseif(!$self) $act.=ax($af,'role_operator','Jadikan Operator','');
    $act.='<a class="abtn" href="'.u('user-reset',['id'=>$u['id']]).'" onclick="return confirm(\'Buat kata sandi sementara untuk user ini?\')">Reset Sandi</a>';
    if(!$self){ if($u['status']==='aktif') $act.=ax($af,'nonaktif','Nonaktifkan','',true); $act.=ax($af,'hapus','Hapus','',true,true); }
    $act.='</div>';
    $req=!empty($u['reset_minta'])?' <span class="badge gagal" title="minta reset '.e(jam($u['reset_minta'])).'">RESET?</span>':'';
    $b.='<tr><td style="font-weight:700">'.e($u['nama']).($self?' <span class="muted" style="font-weight:500">(kamu)</span>':'').$req.'</td><td class="mono muted">'.e($u['email']).'</td><td>'.e($u['merchant_nama']?:'—').'</td><td><span class="badge '.e($u['role']).'">'.strtoupper(e($u['role'])).'</span></td><td><span class="badge '.e($u['status']).'">'.strtoupper(e($u['status'])).'</span></td><td class="act">'.$act.'</td></tr>';
    if($u['role']==='admin'){ $b.='<tr><td colspan="6" style="background:var(--blue-50);font-size:12px;color:var(--muted)">Admin punya akses penuh ke semua menu.</td></tr>'; }
    else { $up=array_filter(array_map('trim',explode(',',$u['permissions']??''))); $b.='<tr><td colspan="6" style="background:var(--blue-50)"><form class="permform" method="post" action="'.$af.'" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center"><input type="hidden" name="aksi" value="perms"><span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Permissions</span>';
      foreach($secs as $k=>$lbl) $b.='<label style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;cursor:pointer"><input type="checkbox" name="perm[]" value="'.$k.'" '.(in_array($k,$up,true)?'checked':'').'> '.e($lbl).'</label>';
      $b.='<button class="btn sm" type="submit">Simpan</button></form></td></tr>'; }
  }
  $b.='</tbody></table></div></div><p style="font-size:12px;color:var(--muted);margin-top:12px"><b>Role:</b> Admin = akses penuh otomatis. Operator = sesuai permission yang dicentang. <b>Reset Sandi</b> membuat kata sandi sementara yang ditampilkan ke kamu untuk diteruskan ke user.</p>';
  return layout('users','User Management',$b); }
function ax($action,$aksi,$label,$style,$del=false,$confirm=false){ return '<form class="rowform" method="post" action="'.$action.'"'.($confirm?' onsubmit="return confirm(\'Hapus akun ini?\')"':'').'><input type="hidden" name="aksi" value="'.$aksi.'"><button class="abtn '.($del?'del':'').'"'.($style?' style="'.$style.'"':'').'>'.$label.'</button></form>'; }

function view_merchant(){
  $slug=mslug();
  $mm=pdo()->prepare("SELECT m.*, (SELECT COUNT(*) FROM users u WHERE u.merchant_id=m.id) AS jml FROM merchants m WHERE m.slug=?"); $mm->execute([$slug]); $mm=$mm->fetch();
  $b='<div style="font-size:20px;font-weight:800;margin-bottom:4px">Merchant</div><div style="font-size:13px;color:var(--muted);margin-bottom:18px">Info & nama merchant yang sedang kamu kelola.</div>';
  if(!$mm){ $b.='<div class="tablecard" style="padding:22px"><div class="empty">Merchant tidak ditemukan.</div></div>'; return layout('merchant','Merchant',$b); }
  $af=u('merchant-aksi',['id'=>$mm['id']]);
  $b.='<div class="tablecard" style="padding:22px;max-width:560px">';
  $b.='<div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:18px">'.
      '<div><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">URL</div><a class="mono" style="color:var(--blue);font-weight:700" href="'.u('home',['_m'=>$mm['slug']]).'" target="_blank">/'.e($mm['slug']).'</a></div>'.
      '<div><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Jumlah User</div><div style="font-weight:700">'.$mm['jml'].'</div></div>'.
      '<div><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Status</div><span class="badge '.e($mm['status']).'">'.strtoupper(e($mm['status'])).'</span></div>'.
      '</div>';
  $b.='<form method="post" action="'.$af.'"><input type="hidden" name="aksi" value="rename">'.
      '<div class="field"><label>Nama Merchant</label><input name="nama" value="'.e($mm['nama']).'" required></div>'.
      '<div class="field"><label>URL Slug <small style="font-weight:500;color:var(--muted)">(huruf kecil, angka, tanda minus — bagian dari URL merchant)</small></label>'.
      '<input name="slug" value="'.e($mm['slug']).'" placeholder="cth: digilink-pulsa" pattern="[a-z0-9][a-z0-9\-_]{0,59}" title="Huruf kecil, angka, tanda minus saja">'.
      '<small style="color:var(--muted);margin-top:4px;display:block">URL saat ini: <b class=\"mono\">/'.e($mm['slug']).'</b> — Ubah slug HANYA jika perlu, link lama tidak akan berfungsi.</small></div>'.
      '<div class="field"><label>Kode Internal</label><input name="kode" value="'.e($mm['kode']).'" placeholder="kode"></div>'.
      '<button class="btn" type="submit">Simpan</button></form>';
  $b.='</div>';
  return layout('merchant','Merchant',$b); }

function view_provider(){ 
  if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['tes_koneksi'])){ 
      try{ 
          // Tombol Tes Koneksi sekarang menembak API Flypay
          list($q,$p,$raw) = flypay_create_deposit('TEST-'.date('YmdHis'), 10000, 'Test User', abs_url(u('callback'))); 
          $_SESSION['gp_test']=['ok'=>true,'msg'=>'BERHASIL. Flypay mengembalikan QR ('.strlen((string)$q).' karakter). Koneksi & Kredensial OK.']; 
      }catch(Exception $e){ 
          $_SESSION['gp_test']=['ok'=>false,'msg'=>$e->getMessage()]; 
      } 
      redirect('provider'); 
  }
  
  if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['simpan_smtp'])){ 
      foreach(['smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from','smtp_from_name'] as $kk) set_setting($kk,trim($_POST[$kk]??'')); 
      set_setting('smtp_secure',$_POST['smtp_secure']??'tls'); 
      flash('Pengaturan email tersimpan.'); 
      redirect('provider'); 
  }
  
  if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['tes_email'])){ 
      $to=trim($_POST['tes_email_to']??'')?:(cur_row()['email']??''); 
      $ok=send_mail($to,'Tes Email VERA GATE',"Halo,\n\nIni email tes dari VERA GATE. Kalau kamu menerima ini, konfigurasi email sudah benar."); 
      flash($ok?('Email tes terkirim ke '.$to.'. Cek inbox/spam.'):'Gagal kirim email tes. Cek konfigurasi SMTP atau pakai SMTP lain.', $ok?'ok':'err'); 
      redirect('provider'); 
  }
  
  if($_SERVER['REQUEST_METHOD']==='POST' && isset($_POST['simpan_provider'])){ 
      set_setting('gp_channel',trim($_POST['gp_channel']??'QRIS')); 
      set_setting('gp_live',isset($_POST['gp_live'])?'1':'0'); 
      flash('Pengaturan provider tersimpan.'); 
      redirect('provider'); 
  }
  
  $cfg=provider_cfg(); $cb=abs_url(u('callback')); $tb=''; 
  if(!empty($_SESSION['gp_test'])){ 
      $r=$_SESSION['gp_test']; unset($_SESSION['gp_test']); 
      $tb='<div class="verifbox" style="text-align:left;margin-bottom:14px;'.($r['ok']?'background:#e8f7ee;border:1px solid #b7e3c6;color:#1c7a3f':'background:#fdeaea;border:1px solid #f3b6b6;color:#a12626').'"><b>'.($r['ok']?'Tes Koneksi BERHASIL':'Tes Koneksi GAGAL').'</b><br><span class="mono" style="font-size:12px;word-break:break-all">'.e($r['msg']).'</span></div>'; 
  }
  
  $b='<div style="font-size:20px;font-weight:800;margin-bottom:4px">Pengaturan Provider — Flypay</div><div style="font-size:13px;color:var(--muted);margin-bottom:18px">Kredensial API Flypay sudah ditanam di dalam kode dengan aman. Gunakan halaman ini untuk mengatur Mode LIVE.</div>'.$tb;
  
  $b.='<div class="tablecard" style="padding:22px;max-width:680px"><form method="post" action="'.u('provider').'">';
  $b.='<div class="field"><label>Channel Deposit Default</label><select name="gp_channel">';
  
  foreach(['QRIS', 'BCA', 'BRI', 'BNI', 'MANDIRI', 'DANA', 'OVO', 'GOPAY', 'SHOPEEPAY'] as $c) {
      $b.='<option value="'.e($c).'" '.($cfg['default_channel']==$c?'selected':'').'>'.e($c).'</option>';
  }
  $b.='</select><p style="font-size:12px;color:var(--muted);margin:6px 0 0">Pilih <b>QRIS</b> sebagai default (mendukung semua e-wallet & m-banking).</p></div>';
  
  $b.='<label style="display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;margin:12px 0 16px;cursor:pointer"><input type="checkbox" name="gp_live" value="1" '.($cfg['live']?'checked':'').' style="width:18px;height:18px"> Mode LIVE (Aktif = Pakai Flypay | Mati = Mode Manual)</label><button class="btn" name="simpan_provider" value="1" type="submit">Simpan Pengaturan</button></form>';
  
  $b.='<form method="post" action="'.u('provider').'" style="margin-top:10px"><button class="btn alt" name="tes_koneksi" value="1" type="submit">Tes Koneksi ke Flypay</button></form>';
  
  $b.='<div style="margin-top:18px;border-top:1px dashed var(--line);padding-top:14px"><div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">URL Webhook / Callback</div><div class="mono" style="font-size:12px;background:var(--blue-50);color:var(--blue);padding:10px 12px;border-radius:10px;word-break:break-all">'.e($cb).'</div><p style="font-size:12px;color:var(--muted);margin-top:8px">Pastikan URL ini sudah kamu daftarkan ke dashboard Flypay agar status deposit/withdraw berubah otomatis.</p></div></div>';
  
  // --- BLOK SMTP EMAIL ---
  $b.='<div class="tablecard" style="padding:22px;max-width:680px;margin-top:16px"><div style="font-weight:800;font-size:15px;margin-bottom:4px">Pengaturan Email (SMTP)</div><div style="font-size:12px;color:var(--muted);margin-bottom:14px">Dipakai untuk kirim sandi sementara (lupa password), reset, & info akun baru. Kosongkan Host kalau mau pakai mail() bawaan server (kurang andal).</div><form method="post" action="'.u('provider').'">';
  $b.='<div class="field"><label>SMTP Host</label><input name="smtp_host" value="'.e(setting('smtp_host','')).'" placeholder="cth: smtp.hostinger.com / smtp.gmail.com"></div>';
  $b.='<div style="display:flex;gap:12px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:120px"><label>Port</label><input name="smtp_port" value="'.e(setting('smtp_port','')).'" placeholder="587 atau 465"></div><div class="field" style="width:170px"><label>Keamanan</label><select name="smtp_secure">';
  foreach(['tls'=>'TLS (587)','ssl'=>'SSL (465)','none'=>'None'] as $kk=>$vv) $b.='<option value="'.$kk.'" '.(setting('smtp_secure','tls')===$kk?'selected':'').'>'.$vv.'</option>'; $b.='</select></div></div>';
  $b.='<div class="field"><label>Username SMTP</label><input name="smtp_user" value="'.e(setting('smtp_user','')).'" placeholder="email@domainmu.com"></div>';
  $b.='<div class="field"><label>Password SMTP</label><input type="password" name="smtp_pass" value="'.e(setting('smtp_pass','')).'" placeholder="password / app password"></div>';
  $b.='<div style="display:flex;gap:12px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:200px"><label>Email Pengirim (From)</label><input name="smtp_from" value="'.e(setting('smtp_from','')).'" placeholder="no-reply@domainmu.com"></div><div class="field" style="flex:1;min-width:150px"><label>Nama Pengirim</label><input name="smtp_from_name" value="'.e(setting('smtp_from_name','')).'" placeholder="VERA GATE"></div></div>';
  $b.='<button class="btn" name="simpan_smtp" value="1" type="submit">Simpan Email</button></form>';
  $b.='<form method="post" action="'.u('provider').'" style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:end"><div class="field" style="margin:0;flex:1;min-width:200px"><label>Kirim email tes ke</label><input name="tes_email_to" placeholder="'.e(cur_row()['email']??'').'"></div><button class="btn alt" name="tes_email" value="1" type="submit">Kirim Tes</button></form></div>';
  
  return layout('provider','Pengaturan Provider',$b); 
}

// ================= DEVELOPER PAGE =================
define('DEV_TOKEN', getenv('VG_DEV_TOKEN') ?: 'veradev2025');

function dev_auth(){ 
  if(!empty($_SESSION['dev_auth'])) return true;
  if(!empty($_POST['dev_token']) && $_POST['dev_token']===DEV_TOKEN){ $_SESSION['dev_auth']=true; return true; }
  return false;
}

function slug_from_name($nama){ 
  $s=preg_replace('/[^a-z0-9]+/','-',strtolower($nama)); 
  $s=trim($s,'-'); 
  return $s===''?'merchant'.time():substr($s,0,60); 
}

function handle_developer(){
  // Auth check
  if(!dev_auth()){
    if($_SERVER['REQUEST_METHOD']==='POST'&&isset($_POST['dev_token'])){
      flash('Token salah.','err');
    }
    echo dev_view_login(); return;
  }
  
  if($_SERVER['REQUEST_METHOD']==='POST'){
    $aksi=$_POST['aksi']??'';
    
    if($aksi==='tambah_merchant'){
      $nama=trim($_POST['nama']??''); $kode=trim($_POST['kode']??'');
      $slug=trim($_POST['slug']??'');
      if($slug==='') $slug=slug_from_name($nama);
      $slug=preg_replace('/[^a-z0-9\-_]/','',strtolower($slug)); $slug=trim($slug,'-_');
      if($slug==='') $slug='merchant'.rand(100,999);
      if(!$nama){ flash('Nama merchant wajib diisi.','err'); header('Location: /developer'); exit; }
      $chk=pdo()->prepare("SELECT COUNT(*) FROM merchants WHERE slug=?"); $chk->execute([$slug]);
      if($chk->fetchColumn()>0){ flash('Slug "'.$slug.'" sudah dipakai.','err'); header('Location: /developer'); exit; }
      pdo()->prepare("INSERT INTO merchants(nama,kode,slug,status,dibuat) VALUES(?,?,?,?,?)")
           ->execute([$nama,$kode,$slug,'aktif',date('Y-m-d H:i:s')]);
      flash('Merchant "'.$nama.'" berhasil ditambahkan. URL: /'.$slug.'/');
    }
    
    elseif($aksi==='edit_merchant'){
      $id=(int)($_POST['id']??0);
      $nama=trim($_POST['nama']??''); $kode=trim($_POST['kode']??'');
      $slug=trim($_POST['slug']??'');
      $status=$_POST['status']??'aktif';
      if($slug==='') $slug=slug_from_name($nama);
      $slug=preg_replace('/[^a-z0-9\-_]/','',strtolower($slug)); $slug=trim($slug,'-_');
      if($slug===''||!$nama){ flash('Nama & slug wajib diisi.','err'); header('Location: /developer'); exit; }
      $chk=pdo()->prepare("SELECT COUNT(*) FROM merchants WHERE slug=? AND id<>?"); $chk->execute([$slug,$id]);
      if($chk->fetchColumn()>0){ flash('Slug "'.$slug.'" sudah dipakai merchant lain.','err'); header('Location: /developer'); exit; }
      pdo()->prepare("UPDATE merchants SET nama=?,kode=?,slug=?,status=? WHERE id=?")->execute([$nama,$kode,$slug,$status,$id]);
      flash('Merchant #'.$id.' diperbarui.');
    }

    elseif($aksi==='hapus_merchant'){
      $id=(int)($_POST['id']??0);
      $chk=pdo()->prepare("SELECT COUNT(*) FROM merchants"); $chk->execute();
      if($chk->fetchColumn()<=1){ flash('Tidak bisa hapus satu-satunya merchant.','err'); header('Location: /developer'); exit; }
      pdo()->prepare("UPDATE users SET merchant_id=NULL WHERE merchant_id=?")->execute([$id]);
      pdo()->prepare("DELETE FROM merchants WHERE id=?")->execute([$id]);
      flash('Merchant dihapus.');
    }
    
    elseif($aksi==='tambah_admin'){
      $mid_t=(int)($_POST['merchant_id']??0);
      $nama=trim($_POST['nama']??''); $email=strtolower(trim($_POST['email']??'')); $pw=$_POST['password']??'';
      if(!$nama||!$email||!$pw||!$mid_t){ flash('Semua kolom wajib diisi.','err'); header('Location: /developer'); exit; }
      $chk=pdo()->prepare("SELECT 1 FROM users WHERE email=?"); $chk->execute([$email]);
      if($chk->fetch()){ flash('Email sudah terdaftar.','err'); header('Location: /developer'); exit; }
      pdo()->prepare("INSERT INTO users(nama,email,sandi,role,status,merchant_id,permissions,dibuat) VALUES(?,?,?,?,?,?,?,?)")
           ->execute([$nama,$email,password_hash($pw,PASSWORD_DEFAULT),'admin','aktif',$mid_t,PERMS_ALL,date('Y-m-d H:i:s')]);
      flash('Admin baru "'.$nama.'" berhasil ditambahkan.');
    }

    elseif($aksi==='dev_logout'){
      unset($_SESSION['dev_auth']);
      flash('Logout berhasil.');
    }
    
    header('Location: /developer'); exit;
  }
  
  echo dev_view_dashboard();
}

function dev_view_login(){
  $bp=basep(); $action=$bp.'/developer';
  return head('Developer Login').'<div class="center"><div class="card" style="text-align:center">'.
    '<div class="logo-top"><img src="'.logo_full().'" alt="VERA GATE"></div>'.
    '<h1>Developer Panel</h1><div class="sub">Masukkan developer token untuk akses.</div>'.flash_html().
    '<form method="post" action="'.$action.'">'.
    '<div class="field"><label>Developer Token</label><input type="password" name="dev_token" required placeholder="token"></div>'.
    '<button class="btn" type="submit">Masuk Developer Panel</button></form></div></div>'.foot();
}

function dev_view_dashboard(){
  $bp=basep(); $action=$bp.'/developer';
  $merchants=pdo()->query("SELECT m.*, (SELECT COUNT(*) FROM users u WHERE u.merchant_id=m.id) AS jml_user, (SELECT COUNT(*) FROM transaksi t WHERE t.merchant_id=m.id) AS jml_tx FROM merchants m ORDER BY m.id")->fetchAll();
  
  $h=head('Developer Panel').'<div class="shell"><div class="main" style="grid-column:1/-1">'.
    '<div class="topbar"><div class="brand"><span class="chip"><img src="'.logo_mark().'" alt="VG"></span><span class="wm" style="color:#fff">VERA GATE <small style="color:rgba(255,255,255,.7)">DEVELOPER PANEL</small></span></div>'.
    '<div class="r"><span class="pill" style="background:rgba(255,80,80,.25);color:#ffaaaa">DEV MODE</span>'.
    '<form method="post" action="'.$action.'" style="display:inline"><input type="hidden" name="aksi" value="dev_logout"><button class="btn sm alt" type="submit" style="color:#fff;border-color:rgba(255,255,255,.3);background:transparent">Logout</button></form></div></div>'.
    '<div class="content">'.flash_html();
  
  // Summary
  $total_m=count($merchants);
  $total_u=pdo()->query("SELECT COUNT(*) FROM users")->fetchColumn();
  $total_tx=pdo()->query("SELECT COUNT(*) FROM transaksi")->fetchColumn();
  $total_ok=pdo()->query("SELECT COUNT(*) FROM transaksi WHERE status='sukses'")->fetchColumn();
  $h.='<div class="summary" style="grid-template-columns:repeat(4,1fr)">'.
    '<div class="sc"><div class="l">Total Merchant</div><div class="v">'.$total_m.'</div></div>'.
    '<div class="sc"><div class="l">Total User</div><div class="v">'.$total_u.'</div></div>'.
    '<div class="sc"><div class="l">Total Transaksi</div><div class="v">'.$total_tx.'</div></div>'.
    '<div class="sc"><div class="l">Transaksi Sukses</div><div class="v">'.$total_ok.'</div></div></div>';
  
  // Merchant list
  $h.='<div style="font-size:20px;font-weight:800;margin-bottom:4px">Daftar Merchant</div>'.
    '<div style="font-size:13px;color:var(--muted);margin-bottom:14px">Kelola semua merchant: ubah nama, slug URL, status, atau hapus.</div>';
  $h.='<div class="tablecard"><div class="table-scroll"><table><thead><tr><th>#</th><th>Nama Merchant</th><th>URL Slug</th><th>Kode</th><th>Status</th><th>User</th><th>Transaksi</th><th>Aksi</th></tr></thead><tbody>';
  foreach($merchants as $mm){
    $ef=$action.'?edit='.$mm['id'];
    $edit_open=isset($_GET['edit'])&&(int)$_GET['edit']==$mm['id'];
    $h.='<tr><td class="mono muted">'.$mm['id'].'</td>'.
      '<td style="font-weight:700">'.e($mm['nama']).'</td>'.
      '<td><a href="'.basep().'/'.$mm['slug'].'/" class="mono" style="color:var(--blue)">/'.e($mm['slug']).'</a></td>'.
      '<td class="mono muted">'.e($mm['kode']).'</td>'.
      '<td><span class="badge '.e($mm['status']).'">'.strtoupper(e($mm['status'])).'</span></td>'.
      '<td>'.$mm['jml_user'].'</td><td>'.$mm['jml_tx'].'</td>'.
      '<td class="act"><a class="abtn" href="'.$action.'?edit='.$mm['id'].'">Edit</a>'.
      '<form method="post" action="'.$action.'" style="display:inline" onsubmit="return confirm(\'Hapus merchant '.e($mm['nama']).'? Semua user merchant ini akan dilepas.\')">'.
      '<input type="hidden" name="aksi" value="hapus_merchant"><input type="hidden" name="id" value="'.$mm['id'].'">'.
      '<button class="abtn del" type="submit">Hapus</button></form></td></tr>';
    if($edit_open){
      $h.='<tr style="background:var(--blue-50)"><td colspan="8" style="padding:16px 18px">'.
        '<form method="post" action="'.$action.'">'.
        '<input type="hidden" name="aksi" value="edit_merchant"><input type="hidden" name="id" value="'.$mm['id'].'">'.
        '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:end">'.
        '<div class="field" style="margin:0;flex:1;min-width:180px"><label>Nama</label><input name="nama" value="'.e($mm['nama']).'" required></div>'.
        '<div class="field" style="margin:0;flex:1;min-width:180px"><label>URL Slug</label><input name="slug" value="'.e($mm['slug']).'" required pattern="[a-z0-9][a-z0-9\\-_]{0,59}"></div>'.
        '<div class="field" style="margin:0;min-width:120px"><label>Kode</label><input name="kode" value="'.e($mm['kode']).'"></div>'.
        '<div class="field" style="margin:0;width:130px"><label>Status</label><select name="status">'.
        '<option value="aktif" '.($mm['status']==='aktif'?'selected':'').'>Aktif</option>'.
        '<option value="nonaktif" '.($mm['status']==='nonaktif'?'selected':'').'>Nonaktif</option></select></div>'.
        '<button class="btn sm" type="submit">Simpan</button>'.
        '<a class="btn sm alt" href="'.$action.'">Batal</a></div></form></td></tr>';
    }
  }
  $h.='</tbody></table></div></div>';
  
  // Add merchant form
  $h.='<div style="font-size:18px;font-weight:800;margin:8px 0 4px">+ Tambah Merchant Baru</div>'.
    '<div class="tablecard" style="padding:20px;max-width:680px">'.
    '<form method="post" action="'.$action.'">'.
    '<input type="hidden" name="aksi" value="tambah_merchant">'.
    '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:end">'.
    '<div class="field" style="margin:0;flex:1;min-width:200px"><label>Nama Merchant</label><input name="nama" required placeholder="cth: Digilink Pulsa" oninput="autoSlug(this)"></div>'.
    '<div class="field" style="margin:0;flex:1;min-width:180px"><label>URL Slug <small style="font-weight:500">(auto dari nama)</small></label><input name="slug" id="slugInput" required pattern="[a-z0-9][a-z0-9\\-_]{0,59}" placeholder="cth: digilink-pulsa"></div>'.
    '<div class="field" style="margin:0;min-width:100px"><label>Kode</label><input name="kode" placeholder="cth: DLP"></div>'.
    '</div><div style="margin-top:12px"><button class="btn sm" type="submit">Tambah Merchant</button></div></form></div>';
  
  // Add admin for merchant form
  $h.='<div style="font-size:18px;font-weight:800;margin:8px 0 4px">+ Tambah Admin untuk Merchant</div>'.
    '<div class="tablecard" style="padding:20px;max-width:680px">'.
    '<form method="post" action="'.$action.'">'.
    '<input type="hidden" name="aksi" value="tambah_admin">'.
    '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:end">'.
    '<div class="field" style="margin:0;flex:1;min-width:180px"><label>Nama</label><input name="nama" required placeholder="Nama admin"></div>'.
    '<div class="field" style="margin:0;flex:1;min-width:200px"><label>Email</label><input type="email" name="email" required placeholder="admin@merchant.com"></div>'.
    '<div class="field" style="margin:0;min-width:150px"><label>Password</label><input name="password" required placeholder="password awal"></div>'.
    '<div class="field" style="margin:0;min-width:180px"><label>Merchant</label><select name="merchant_id">';
  foreach($merchants as $mm) $h.='<option value="'.$mm['id'].'">'.e($mm['nama']).' (/'.e($mm['slug']).')</option>';
  $h.='</select></div></div><div style="margin-top:12px"><button class="btn sm" type="submit">Tambah Admin</button></div></form></div>';
  
  $h.='</div></div></div>'.
    '<script>function autoSlug(el){var s=el.value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");document.getElementById("slugInput").value=s;}</script>'.
    foot();
  echo $h;
}
