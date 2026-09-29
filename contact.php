<?php
/**
 * Contact form handler — Syed Rahid Ahmed Career Site
 * --------------------------------------------------
 * Replaces the Netlify Forms dependency. Drop this in the web root via SFTP
 * and point the form's fetch() at /contact.php.
 *
 * Security model:
 *   - Honeypot field (bot-field) rejects automated submissions.
 *   - Strict field validation + length caps server-side (client checks are
 *     cosmetic and trivially bypassed).
 *   - Per-IP rate limit so the form can't be used to spam *from* this domain.
 *   - Reply-To is the submitter's own address; From is always the site owner,
 *     so a forged email header can't spoof the sender identity.
 *   - Submissions are logged to a local file so you can review them even if
 *     email fails.
 *
 * Response: 200 OK on success (JS then redirects to /thank-you.html),
 * 4xx with a JSON error body on failure.
 */

header('Content-Type: application/json; charset=utf-8');

// --- Configuration -----------------------------------------------------------
$TO_EMAIL      = 'rahid905@gmail.com';
$TO_NAME       = 'Syed Rahid Ahmed';
$SUBJECT_PREFIX = 'RESUME: Inquery:';   // name & phone appended after validation
$LOG_FILE      = __DIR__ . '/contact-submissions.log';
$RATE_FILE     = __DIR__ . '/.contact-rate-limit';
$MAX_SUBS_PER_IP_PER_HOUR = 5;
$ALLOWED_ORIGIN = '';                        // e.g. 'https://syedrahidahmed.com' or '' to allow all

// Field caps (must mirror the maxlength attrs in index.html)
$LIMITS = ['name' => 100, 'email' => 254, 'phone' => 20, 'subject' => 200, 'message' => 5000];

// --- CORS / origin guard (optional) ------------------------------------------
if ($ALLOWED_ORIGIN !== '') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $ref    = $_SERVER['HTTP_REFERER'] ?? '';
    $host   = $_SERVER['HTTP_HOST'] ?? '';
    $ok = ($origin === $ALLOWED_ORIGIN)
        || (strpos($ref, $ALLOWED_ORIGIN) === 0)
        || (parse_url($ref, PHP_URL_HOST) === $host);
    if (!$ok) {
        http_response_code(403);
        echo json_encode(['error' => 'Not allowed']);
        exit;
    }
}

// Only POST.
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// --- Honeypot ----------------------------------------------------------------
// Bots fill this off-screen field; humans never see it.
$bot = $_POST['bot-field'] ?? '';
if (trim($bot) !== '') {
    http_response_code(400);
    echo json_encode(['error' => 'Bad request']);
    exit;
}

// --- Rate limiting (per-IP, sliding window stored in a file) -----------------
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$now = time();
$window = 3600;
$rate = [];
if (file_exists($RATE_FILE)) {
    $raw = @file_get_contents($RATE_FILE);
    $rate = $raw ? (json_decode($raw, true) || []) : [];
}
// Prune old entries.
foreach ($rate as $k => $v) {
    if ($v < $now - $window) unset($rate[$k]);
}
$rate[$ip] = ($rate[$ip] ?? 0) + 1;
@file_put_contents($RATE_FILE, json_encode($rate), LOCK_EX);
if ($rate[$ip] > $MAX_SUBS_PER_IP_PER_HOUR) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many requests. Please try again later.']);
    exit;
}

// --- Field validation --------------------------------------------------------
function fail($msg) {
    http_response_code(400);
    echo json_encode(['error' => $msg]);
    exit;
}

$name    = trim($_POST['name']    ?? '');
$email   = trim($_POST['email']   ?? '');
$phone   = trim($_POST['phone']   ?? '');
$subject = trim($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');

if ($name === '' || $email === '' || $subject === '' || $message === '') {
    fail('All fields are required.');
}
foreach ($LIMITS as $field => $max) {
    $$field = mb_substr($$field, 0, $max);
    if (mb_strlen($$field) > $max) fail("'$field' is too long.");
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Please enter a valid email address.');
}
// Reject obviously fake/bot emails.
if (preg_match('/@(?:test|example|localhost|invalid)\b/i', $email)) {
    fail('Please enter a valid email address.');
}
// Phone is optional, but if provided it must look like a phone number.
if ($phone !== '' && !preg_match('/^[+]?[\d\s().-]{6,20}$/', $phone)) {
    fail('Please enter a valid phone number.');
}

// --- Send email --------------------------------------------------------------
$body  = "Name: $name\n";
$body .= "Email: $email\n";
$body .= "Phone: " . ($phone !== '' ? $phone : '(not provided)') . "\n";
$body .= "Subject: $subject\n";
$body .= "Message:\n$message\n";
$body .= "\n---\nSubmitted: " . date('Y-m-d H:i:s T') . "\n";

$subjectLine = $SUBJECT_PREFIX . ' ' . $name . ' & ' . ($phone !== '' ? $phone : 'no phone') . ' — ' . $subject;
$headers  = "From: $TO_NAME <$TO_EMAIL>\r\n";
$headers .= "Reply-To: $name <$email>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = @mail($subjectLine, $body, $headers);

// --- Log ---------------------------------------------------------------------
$entry = [
    'time' => date('c'),
    'ip'   => $ip,
    'name' => $name,
    'email'=> $email,
    'phone' => $phone,
    'subject' => $subject,
    'message' => $message,
    'sent' => $sent ? 1 : 0,
];
@file_put_contents($LOG_FILE, json_encode($entry, JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND);

if (!$sent) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not send message. Please try again later.']);
    exit;
}

// Success — the form JS redirects to /thank-you.html.
http_response_code(200);
echo json_encode(['ok' => true]);