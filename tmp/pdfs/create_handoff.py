from pathlib import Path
import os, re
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from xml.sax.saxutils import escape
root=Path('/Users/organicsoft/projects/kelpie')
fontroot=Path('/Users/organicsoft/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/standard_fonts')
for name,file in [('Body','LiberationSans-Regular.ttf'),('Bold','LiberationSans-Bold.ttf')]: pdfmetrics.registerFont(TTFont(name,str(fontroot/file)))
try:
 from fontTools.ttLib import TTFont as Font
 from fontTools.varLib.instancer import instantiateVariableFont
 for name,weight in [('Body',400),('Bold',600)]:
  f=Font(str(root/'applications/quiz/public/fonts/instrument-sans-latin.woff2')); f.flavor=None
  f=instantiateVariableFont(f,{'wght':weight},inplace=True); fp=root/f'tmp/pdfs/{name}.ttf'; f.save(fp); pdfmetrics.registerFont(TTFont(name,str(fp)))
except ImportError: pass
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold')
PAPER='#f6efe3'; INK='#29211c'; RUST='#a8401d'; MUTED='#6b5a4c'; LINE='#ddd4c6'; WASH='#eee5d7'
W,H=595.28,841.89; M=48; CW=W-2*M
out=root/'output/pdf/Kelpie_Reviewer_Guide.pdf'
c=canvas.Canvas(str(out),pagesize=(W,H)); c.setTitle('Kelpie | Reviewer guide'); c.setAuthor('Kelpie'); c.setSubject('Funnel Runtime handoff, access and review instructions')
page=0; y=0
base='https://github.com/mikalaiulasevich/kelpie'
public='https://kelpie-c5oj.onrender.com'
password=os.getenv('KELPIE_REVIEWER_PASSWORD','Pending: existing password required')
def text(s,x,y,size=10,font='Body',color=INK):
 c.setFillColor(HexColor(color));c.setFont(font,size);c.drawString(x,y,s)
def para(s,size=10.5,color=INK,after=12):
 global y
 style=ParagraphStyle('p',fontName='Body',fontSize=size,leading=size*1.45,textColor=HexColor(color))
 p=Paragraph(s,style); _,h=p.wrap(CW,700);p.drawOn(c,M,y-h);y-=h+after
 assert y>53, f'Page {page} overflows at {s[:35]}'
def label(s):
 global y
 text(s.upper(),M,y,9,'Bold',RUST);y-=23

def title(s):
 global y
 para(s,29,INK,18)
def heading(s):
 global y
 para(s,15,'#29211c',8)
def link(name,url):
 para(f'<b>{name}</b><br/><link href="{escape(url)}" color="{RUST}">{escape(url)}</link>',10.5,after=12)
def code(lines):
 global y
 rows=lines.split('\n'); h=18+len(rows)*15
 c.setFillColor(HexColor(WASH));c.roundRect(M,y-h,CW,h,9,fill=1,stroke=0)
 for i,line in enumerate(rows): text(line,M+13,y-20-i*15,8.7,'Body')
 y-=h+15

def note(s):
 para(s,9.4,MUTED,14)
def brand():
 c.saveState();c.translate(M,H-69);c.scale(.29,.29)
 svg=(root/'applications/quiz/source/components/kelpie-mark.tsx').read_text()
 for col,pts in re.findall(r'fill="([#a-zA-Z0-9]+)"\s+points="([^"]+)"',svg):
  coords=[tuple(map(float,p.split(','))) for p in pts.split()];p=c.beginPath();p.moveTo(coords[0][0],96-coords[0][1])
  for x1,y1 in coords[1:]:p.lineTo(x1,96-y1)
  p.close();c.setFillColor(HexColor(col));c.drawPath(p,fill=1,stroke=0)
 c.restoreState();text('Kelpie',M+35,H-63,23,'Bold');text('Reviewer guide',M+130,H-59,9,color=MUTED)
def start(kicker,head):
 global page,y
 if page:c.showPage()
 page+=1;c.setFillColor(HexColor(PAPER));c.rect(0,0,W,H,fill=1,stroke=0);brand()
 c.setStrokeColor(HexColor(LINE));c.line(M,47,W-M,47);text('Funnel Runtime  /  08 October 2026',M,30,8,color=MUTED);text(f'{page:02d} / 06',W-M-33,30,8,color=MUTED)
 y=H-111;label(kicker);title(head)

start('01 / Start here','A thoughtful flow.<br/>A clear review.')
para('Configurable funnels, stable A/B assignments and session-based analytics. This guide brings together the live demo, local setup and the checks that matter.',12,after=20)
link('Public quiz - no sign-in required',public+'/')
link('Administration - configurations, history and analytics',public+'/administration/')
heading('Reviewer access')
code('Username: admin\nPassword: '+password)
note('The username was read from Render. The existing password is not retained in Render environment variables. '+('Password supplied by the owner.' if 'KELPIE_REVIEWER_PASSWORD' in os.environ else 'The access section must be completed before handoff.'))
link('Source repository',base)
note('The repository is private. The reviewer needs a GitHub invitation before cloning or opening source links. Application credentials do not grant GitHub access.')
heading('What is available remotely?')
para('The quiz, administration UI and backend share one HTTPS origin. Render Free runs the application; Turso keeps the hosted database. A sleeping free instance may need time to wake up.',10.5)
note('Checked on 08 October 2026: quiz, administration and API readiness responded. Render reports release commit 2dc3e3e as live. This availability check does not repeat the complete functional test suite.')

start('02 / Local setup','Run your own copy.')
para('Use Node.js 24 and npm 11. The commands below run the Node backend with a local SQLite file. No Render or Turso account is needed.',11)
heading('1. Clone the deployed baseline')
code('git clone --branch release \\\n  https://github.com/mikalaiulasevich/kelpie.git\ncd kelpie\nnpm ci\nnpm run database:generate\nnpm run database:migrate')
heading('2. Create a local administrator')
para('Copy the example environment file, then open the new file in your editor:',10.5,after=8)
code('cp applications/backend/.env.example applications/backend/.env')
para('Add the following values. Replace the password text with your own local password of at least 12 characters.',10.5,after=8)
code('ADMINISTRATION_USERNAME=reviewer\nADMINISTRATION_PASSWORD=<your-local-password>')
code('npm run administration:provision')
note('Run this once on a fresh database. Running provisioning again changes the existing administrator credentials and revokes administrator sessions. The .env file is Git-ignored; remove its password entry after provisioning.')
heading('3. Import the supplied configurations')
code('npm run configurations:import -- "$PWD/configurations/funnel-v1.json"\nnpm run configurations:import -- "$PWD/configurations/funnel-v2.json"\nnpm run configurations:import -- "$PWD/configurations/funnel-v3.json"')
note('Import creates immutable drafts. A file marked active in JSON does not publish itself; activate v3 in the administration UI after starting the applications.')

start('03 / Local access','Three applications.<br/>One local database.')
code('npm run development')
para('Keep the terminal open. The command starts the backend, quiz and administration application. Stop them together with Ctrl+C.',10.5)
link('Quiz', 'http://127.0.0.1:3001')
link('Administration - use the local account from page 2','http://127.0.0.1:5173')
link('Backend readiness','http://127.0.0.1:3000/api/health/ready')
para('Open Configurations, select workstyle-planner and publish v3. Then open the quiz. Use 127.0.0.1 consistently for both interfaces so that cookie and origin checks match.',10.5)
heading('Where the data lives')
para('<b>Local:</b> applications/backend/data/funnel-runtime.sqlite. Your local sessions, administrator and analytics are separate from the public demo.<br/><br/><b>Remote:</b> the Render service uses hosted Turso storage. Restarting your local apps does not affect the hosted application.',10.5)
heading('Optional Bun path')
para('Bun 1.3.14 is the primary project runtime; Node/npm remain necessary for compilation and migrations. After the same setup, start with:',10.5,after=8)
code('bun run development:bun')
heading('Release versus development')
para('<b>release</b> reproduces the hosted baseline. <b>development</b> contains later recovery fixes, compatibility checks and traffic profiling. The public demo does not automatically include that branch.',10.5)
note('To inspect later work, use a separate clone with --branch development and repeat the fresh local setup. Do not reuse a database across arbitrary older application revisions.')

start('04 / Review walkthrough','Follow the state,<br/>not just the screens.')
for head,body in [
 ('01  Complete the v3 journey','Choose Hybrid and Compliance to exercise the conditional questions. Test an invalid required answer, then correct it. Continue to the result and open the recommendation CTA.'),
 ('02  Check Back and refresh','Change an unfinished answer and reload: the browser draft should return. Continue saves the answer. Go Back and forward again; the backend retains the session version and variant.'),
 ('03  Compare A and B','Use separate fresh browser profiles with ?variant=A and ?variant=B. Overrides apply when creating a new session. In v3, variant B omits the tool-count question. Forced assignments are excluded from experiment comparisons by default.'),
 ('04  Publish and roll back locally','Keep an unfinished v3 session open. Publish v2 in administration. A fresh browser profile starts v2; the existing session continues v3. Roll back and check activation history. No redeploy or schema edit is needed.'),
 ('05  Inspect the analytics','Select the relevant version, period and traffic origin. Compare A/B, campaign, step reach, completion, result and CTA metrics. Repeated views or Back should not multiply unique-session totals.')]:
 heading(head);para(body,10.4,after=16)
note('Use the local copy for publication/rollback checks so other reviewers retain a stable public demo. For forced A/B sessions, explicitly include forced assignments in the report. Synthetic previews appear under synthetic traffic.')
link('Example: new forced B session',public+'/?variant=B&utm_campaign=reviewer')

start('05 / How it works','Data, events & evidence.')
heading('A small, explicit data model')
para('<b>Funnel + FunnelVersion:</b> active pointer and immutable configuration snapshots. <b>Publication:</b> activation history and revisions. <b>Session:</b> pinned version, experiment, variant, UTM and expiry. <b>SessionAnswer:</b> raw answers. <b>Event + SessionTransition:</b> observations and authoritative navigation. <b>SessionOperation:</b> idempotent command receipts.',10.3)
heading('Events and safe retries')
para('The backend emits session_started, answer_submitted, step_completed and back_clicked. The browser reports step_viewed, result_viewed, cta_clicked and the v3 recommendation_expanded event.',10.3)
para('POST /api/events/batches accepts 1-50 events. Each has event_id, session_id, name, client_timestamp, step_id, observationRevision and properties. The server adds its timestamp and derives pinned version, variant and UTM metadata. Raw answers remain outside analytics.',10.3)
para('An identical event replay is deduplicated. Different content under the same identifier is rejected. Invalid elements receive individual receipts without discarding valid siblings. After a timeout, retry the same identifiers and payload.',10.3)
heading('Experiment hypothesis')
para('Variant B increases recommendation opens through question order and result framing. Compare variants within one version and experiment; synthetic sessions validate calculations, not the hypothesis.',10.3)
code('Primary conversion = unique CTA clickers / unique starters\nResult completion = unique result viewers / unique starters\nCTA CTR = result viewers who clicked / unique result viewers')
para('Step completion intersects observed viewers with authoritative forward transitions. Reports separate open sessions from expired dropout and account for repeated views, Back and out-of-order delivery. Empty denominators are unavailable, not a measured zero.',10.3)
link('Schema and detailed aggregation rules',base+'/tree/development/applications/backend/prisma')

start('06 / Delivery notes','Reproduce. Inspect.<br/>Know the boundaries.')
heading('Verification and synthetic traffic')
code('npm run verify\n# With Bun 1.3.14 installed:\nnpm run verify:bun')
para('On a separate development checkout, generate an isolated 100-session dataset with a real local HTTP backend:',10.3,after=8)
code('npm run traffic:profile -- --sessions=100 --concurrency=8 \\\n  --seed=20261008 --output=test-results/reviewer-traffic')
note('The profile produces reports and a SQLite snapshot; it does not populate the public dashboard or your default local database. For an interactive report, use local quiz sessions or authorized previews. Seed tooling is evolving separately from the last full verification gate.')
heading('Recorded milestones')
para('<b>06 October:</b> contracts, routing runtime, configuration checks and database foundation.<br/><b>07 October:</b> authentication, publication/rollback, events, analytics, administration and quiz.<br/><b>08 October:</b> public deployment; local traffic profiling, recovery and v1/v2/v3 compatibility checks.',10.1)
heading('Scope and known limits')
para('Local Node + SQLite satisfies the self-contained execution path. The hosted demo uses Bun, Render and Turso: this differs from a literal Node-only / no-third-party-services reading of the assignment. The agreed 48-hour start was not recorded, so no elapsed-time claim is made.',10.1)
para('The recorded later local gate passed 868 Node tests and 442 Bun backend tests; later seed edits are outside that gate. Hosted backup/restore, public load capacity, physical-device coverage and exhaustive accessibility are not established. GitHub Actions is disabled. The administrator supports one active session; another sign-in replaces it.',10.1)
para(f'<b>Review references:</b> <link href="{base}/blob/development/README.md" color="{RUST}">README</link> · <link href="{base}/blob/development/documentation/development-log.md" color="{RUST}">Development timeline</link> · <link href="{base}/blob/development/documentation/foundation-review.md" color="{RUST}">Engineering review</link> · <link href="{base}/blob/development/IMPLEMENTATION_PLAN.md" color="{RUST}">Acceptance and metrics</link>',10.3)
c.save();os.chmod(out,0o600);print(out)
