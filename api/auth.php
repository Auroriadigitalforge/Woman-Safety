<?php
header('Content-Type: application/json; charset=utf-8');

$usersFile = __DIR__ . DIRECTORY_SEPARATOR . 'users.json';

if (!file_exists($usersFile)) {
    file_put_contents($usersFile, json_encode([], JSON_PRETTY_PRINT), LOCK_EX);
}

function read_users($filePath)
{
    $raw = file_get_contents($filePath);
    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function write_users($filePath, $users)
{
    return file_put_contents($filePath, json_encode($users, JSON_PRETTY_PRINT), LOCK_EX) !== false;
}

function respond($statusCode, $payload)
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(405, ['ok' => false, 'message' => 'Method not allowed']);
}

$inputRaw = file_get_contents('php://input');
$input = json_decode($inputRaw ?: '{}', true);
if (!is_array($input)) {
    $input = [];
}

$action = isset($input['action']) ? trim((string)$input['action']) : '';
$email = isset($input['email']) ? trim((string)$input['email']) : '';
$password = isset($input['password']) ? (string)$input['password'] : '';

if ($email === '' || $password === '') {
    respond(422, ['ok' => false, 'message' => 'Email and password are required']);
}

$users = read_users($usersFile);

if ($action === 'register') {
    foreach ($users as $user) {
        if (($user['email'] ?? '') === $email) {
            respond(409, ['ok' => false, 'message' => 'Email already exists']);
        }
    }

    $users[] = [
        'id' => uniqid('usr_', true),
        'name' => isset($input['name']) ? trim((string)$input['name']) : '',
        'email' => $email,
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        'createdAt' => time(),
    ];

    if (!write_users($usersFile, $users)) {
        respond(500, ['ok' => false, 'message' => 'Failed to save user']);
    }

    respond(200, ['ok' => true, 'message' => 'Registered']);
}

if ($action === 'login') {
    foreach ($users as $user) {
        if (($user['email'] ?? '') === $email && password_verify($password, (string)($user['passwordHash'] ?? ''))) {
            respond(200, [
                'ok' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $user['id'] ?? '',
                    'name' => $user['name'] ?? '',
                    'email' => $user['email'] ?? '',
                ],
            ]);
        }
    }

    respond(401, ['ok' => false, 'message' => 'Invalid credentials']);
}

respond(422, ['ok' => false, 'message' => 'Unsupported action']);
