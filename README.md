# Taskly — מערכת ניהול משימות בסיסית

Taskly היא אפליקציית Frontend קלה ומהירה לניהול משימות יומיות. הממשק בעברית ובכיוון RTL, רספונסיבי למחשב ולמובייל, ואינו תלוי בשרת או במסד נתונים.

המערכת מאפשרת:

- הוספת משימה חדשה ועריכת משימה קיימת.
- מחיקת משימה בודדת או ניקוי כל המשימות שהושלמו.
- סימון משימה כהושלמה והחזרתה לרשימת הביצוע.
- סינון לפי הכול, לביצוע או הושלמו.
- חיפוש חופשי ברשימת המשימות.
- שמירה אוטומטית ב־`LocalStorage`, כך שהמידע נשמר גם לאחר רענון הדף.
- התאמה למסכים קטנים, ניווט מקלדת ותמיכה ב־`prefers-reduced-motion`.

> המידע נשמר בדפדפן וב־origin הנוכחי בלבד. אין סנכרון בין מכשירים, משתמשים, דומיינים או בין `localhost` לאתר Firebase.

## ארכיטקטורה

```text
public/ (HTML + CSS + JavaScript)
             │
             ▼
     npm run build
             │
             ▼
          dist/
        ┌────┴────┐
        ▼         ▼
  Docker/Nginx   Firebase Hosting
        ▲         ▲
        └────┬────┘
             │
       GitHub Actions
  PR = Preview | main = Live
```

- **Frontend:** HTML5, CSS ו־JavaScript נקי, ללא framework וללא תלויות runtime. הנתונים נשמרים כ־JSON ב־`LocalStorage`.
- **Build:** הסקריפט `scripts/build.mjs` יוצר מחדש את `dist` ומעתיק אליו את נכסי ה־production מתוך `public`.
- **Docker:** build רב־שלבי. Node מייצר את `dist`, ולאחר מכן Nginx Alpine מגיש רק את התוצר הסטטי ומוסיף headers בסיסיים לאבטחה ול־cache.
- **CI/CD:** כל Pull Request ל־`main` עובר בדיקות ומקבל Firebase Preview Channel. כל Push ל־`main` נפרס לערוץ `live`.
- **Firebase Hosting:** מגיש את `dist` דרך CDN ו־HTTPS. ההגדרות נמצאות ב־`firebase.json`.

## מבנה הפרויקט

```text
.
├── .github/
│   └── workflows/
│       └── firebase-deployment.yml
├── docs/
│   └── screenshots/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── scripts/
│   ├── build.mjs
│   └── check-files.mjs
├── .dockerignore
├── .gitignore
├── Dockerfile
├── firebase.json
├── nginx.conf
├── package-lock.json
├── package.json
└── README.md
```

## דרישות מוקדמות

- Node.js 22 LTS ומעלה.
- Git.
- Docker Desktop.
- חשבון GitHub ו־repository שבו יש לך הרשאת Admin.
- חשבון Google ופרויקט Firebase.
- Firebase CLI ו־GitHub CLI לצורך חיבור ה־pipeline.

ב־Windows PowerShell אפשר להתקין את כלי העבודה כך:

```powershell
winget install --exact --id Git.Git
winget install --exact --id Docker.DockerDesktop
winget install --exact --id GitHub.cli
npm install --global firebase-tools
```

לאחר התקנת Git, Docker או `gh`, יש לסגור ולפתוח מחדש את PowerShell. יש גם להפעיל את Docker Desktop לפני הרצת פקודות Docker.

## 1. פתיחת התיקייה המקומית

```powershell
Set-Location -LiteralPath "C:\Users\ASUS\Desktop\מערכת לניהול משימות"
code .
```

אם הפקודה `code` אינה זמינה, אפשר לפתוח את התיקייה ידנית ב־VS Code באמצעות **File → Open Folder**.

## 2. התקנה, בדיקה ו־build מקומי

```powershell
npm ci
npm run check
npm run build
```

התוצר נוצר בתיקייה `dist`. להפעלה מקומית מהירה דרך Firebase CLI:

```powershell
firebase serve --only hosting
```

האתר יהיה זמין בדרך כלל בכתובת `http://localhost:5000`.

## 3. בנייה והרצה עם Docker

בניית image:

```powershell
docker build --tag taskly:1.0.0 .
```

הרצת container ברקע וחשיפתו בפורט `8080`:

```powershell
docker run --detach --name taskly --publish 8080:80 taskly:1.0.0
docker ps
docker inspect --format='{{.State.Health.Status}}' taskly
Start-Process "http://localhost:8080"
```

לצילום מסך פתח את `http://localhost:8080`, הוסף כמה משימות לדוגמה ולחץ `Win + Shift + S`.

צפייה בלוגים ועצירת הסביבה:

```powershell
docker logs taskly
docker stop taskly
docker rm taskly
```

אם כבר קיים container בשם `taskly`, הסר אותו לפני הרצה נוספת:

```powershell
docker rm --force taskly
```

## 4. יצירת Repository ועבודה עם Branch ו־Pull Request

הפקודות הבאות יוצרות repository חדש דרך GitHub CLI, דוחפות `main` התחלתי, פותחות branch ייעודי ומכינות היסטוריית commits מסודרת.

החלף רק את `YOUR_GITHUB_USERNAME` בשם המשתמש שלך:

```powershell
$GitHubUser = "YOUR_GITHUB_USERNAME"
$RepoName = "task-management-system"
$FeatureBranch = "feature/task-management-system"

gh auth login

git init -b main
git config user.name "Your Name"
git config user.email "you@example.com"
git commit --allow-empty -m "chore: initialize repository"

gh repo create "$GitHubUser/$RepoName" --public --source=. --remote=origin --push

git switch -c $FeatureBranch
```

לאחר השלמת הגדרת Firebase שבפרק הבא, צור שלושה commits ממוקדים:

```powershell
git add public scripts package.json package-lock.json
git commit -m "feat: implement local task management application"

git add Dockerfile nginx.conf .dockerignore
git commit -m "chore(docker): add production nginx container"

git add firebase.json .firebaserc .github .gitignore README.md docs
git commit -m "ci: add Firebase Hosting deployment workflow"

git status
git push --set-upstream origin $FeatureBranch
```

פתיחת Pull Request מהטרמינל:

```powershell
gh pr create `
  --base main `
  --head $FeatureBranch `
  --title "feat: add Taskly task management system" `
  --body "Adds the complete RTL task manager, LocalStorage persistence, an Nginx Docker image, and Firebase Hosting CI/CD."
```

פתיחת ה־PR בדפדפן ובדיקת ה־checks:

```powershell
gh pr view --web
gh pr checks --watch
```

לאחר אישור ה־PR אפשר למזג ולמחוק את ה־branch המרוחק:

```powershell
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only
```

## 5. אתחול Firebase Hosting

התחברות ובדיקת הגרסה:

```powershell
npm install --global firebase-tools
firebase --version
firebase login
firebase projects:list
```

אפשר לבחור פרויקט קיים מהרשימה, או ליצור פרויקט חדש עם ID גלובלי וייחודי. ה־ID חייב להיות באותיות לטיניות קטנות, מספרים ומקפים:

```powershell
$FirebaseProjectId = "taskly-YOUR_UNIQUE_SUFFIX"

firebase projects:create $FirebaseProjectId --display-name "Taskly"
firebase use --add $FirebaseProjectId
```

כאשר `firebase use --add` מבקש alias, בחר `default`. הפקודה יוצרת את `.firebaserc`; יש להוסיף אותו ל־Git כדי ש־Firebase Action יזהה את הפרויקט.

הקובץ `firebase.json` כבר מוגדר בפרויקט הזה, ולכן אין צורך להריץ `firebase init hosting` ולדרוס אותו. בצע build ופריסה ידנית ראשונה:

```powershell
npm run check
npm run build
firebase deploy --only hosting
```

בסיום הפקודה Firebase יציג את כתובת האתר תחת `Hosting URL`.

## 6. חיבור GitHub Actions ל־Firebase Secrets

ודא שה־repository כבר נוצר ב־GitHub ושיש לך בו הרשאת Admin. לאחר מכן הפעל את האינטגרציה הרשמית:

```powershell
firebase init hosting:github
```

בחר בתשובות הבאות באשף:

1. ה־repository: `YOUR_GITHUB_USERNAME/task-management-system`.
2. יצירת build לפני deploy: `Yes`.
3. פקודת build: `npm ci && npm run check && npm run build`.
4. Preview לכל Pull Request: `Yes`.
5. פריסה אוטומטית לערוץ live: `Yes`.
6. Branch לפריסה חיה: `main`.

הפקודה יוצרת Service Account מצומצם לפריסה, מעלה את מפתח ה־JSON שלו כ־GitHub Actions Secret מוצפן, ויוצרת שני workflows לדוגמה. בפרויקט זה כבר קיים workflow מאוחד בשם `firebase-deployment.yml`, לכן הפקודות הבאות מעבירות אליו אוטומטית את שם ה־secret ומסירות את שני קבצי הדוגמה כדי למנוע deploy כפול:

```powershell
$GeneratedWorkflows = Get-ChildItem -LiteralPath ".github/workflows" -Filter "firebase-hosting-*.yml"
$SecretMatch = $GeneratedWorkflows |
  Select-String -Pattern 'secrets\.(FIREBASE_SERVICE_ACCOUNT_[A-Z0-9_]+)' |
  Select-Object -First 1

if (-not $SecretMatch) {
  throw "Firebase service-account secret was not found in the generated workflows."
}

$ServiceAccountSecret = $SecretMatch.Matches[0].Groups[1].Value
$WorkflowPath = ".github/workflows/firebase-deployment.yml"
$WorkflowContent = Get-Content -LiteralPath $WorkflowPath -Raw
$WorkflowContent = $WorkflowContent.Replace(
  "secrets.FIREBASE_SERVICE_ACCOUNT",
  "secrets.$ServiceAccountSecret"
)
Set-Content -LiteralPath $WorkflowPath -Value $WorkflowContent -Encoding utf8

$GeneratedWorkflows | Remove-Item

gh secret set FIREBASE_PROJECT_ID --body $FirebaseProjectId
gh secret list
```

בסוף אמורים להופיע ב־GitHub לפחות שני secrets:

- `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` — נוצר ומועלה אוטומטית על ידי Firebase CLI.
- `FIREBASE_PROJECT_ID` — נוצר בפקודת `gh secret set` ומכיל את Project ID בלבד.

אין ליצור `FIREBASE_TOKEN` באמצעות `firebase login:ci`; זו שיטת legacy פחות מאובטחת. אין לשמור קובץ Service Account בתוך ה־repository.

אם כבר יצרת Service Account ידנית ויש ברשותך קובץ JSON, אפשר להשתמש במקום זאת בשם הגנרי שכבר מופיע ב־workflow המקורי:

```powershell
Get-Content -LiteralPath ".\firebase-service-account.json" -Raw |
  gh secret set FIREBASE_SERVICE_ACCOUNT

gh secret set FIREBASE_PROJECT_ID --body $FirebaseProjectId
```

## התנהגות ה־CI/CD

ה־workflow שב־`.github/workflows/firebase-deployment.yml` מבצע:

1. Checkout של ה־repository.
2. התקנת Node.js ו־dependencies באמצעות `npm ci`.
3. בדיקת תחביר JavaScript וקבצים נדרשים.
4. יצירת `dist` באמצעות `npm run build`.
5. ב־Pull Request פנימי: פריסה ל־Preview Channel למשך 7 ימים ופרסום הכתובת בתגובה ל־PR.
6. ב־Push ל־`main`: פריסה לערוץ `live`.

ב־Pull Request שמגיע מ־fork, שלב הבנייה עדיין רץ אך שלב הפריסה מדולג, מכיוון ש־GitHub אינו חושף secrets ל־forks.

## צילומי מסך

### המסך הראשי

![המסך הראשי של Taskly](docs/screenshots/taskly-dashboard.png)

### ניהול משימות

![רשימת משימות, סינון וסטטיסטיקות](docs/screenshots/taskly-tasks.png)

### Firebase Preview Channel

![Taskly פועלת בערוץ Preview של Firebase Hosting](docs/screenshots/taskly-firebase-preview.png)

## פתרון תקלות קצר

- `docker: command not found` — פתח מחדש את הטרמינל וודא ש־Docker Desktop פועל.
- `firebase: command not found` — הרץ `npm install --global firebase-tools` ופתח מחדש את PowerShell.
- ה־workflow נכשל בגלל secret ריק — בדוק `gh secret list` וודא שהשם בשורת `firebaseServiceAccount` זהה בדיוק לשם שנוצר על ידי Firebase CLI.
- `dist` לא קיים — הרץ `npm ci` ואז `npm run build`.
- המשימות לא מופיעות בכתובת אחרת — `LocalStorage` מופרד לפי protocol, host ופורט; זו התנהגות צפויה.

## קישורים רשמיים

- [Firebase CLI reference](https://firebase.google.com/docs/cli)
- [Firebase Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart)
- [Firebase Hosting and GitHub integration](https://firebase.google.com/docs/hosting/github-integration)
- [Firebase Hosting deploy Action](https://github.com/FirebaseExtended/action-hosting-deploy)
