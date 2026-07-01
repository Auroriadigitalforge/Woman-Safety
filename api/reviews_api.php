<?php
header('Content-Type: application/json; charset=utf-8');

$storageFile = __DIR__ . DIRECTORY_SEPARATOR . 'reviews.json';

if (!file_exists($storageFile)) {
    file_put_contents($storageFile, json_encode([], JSON_PRETTY_PRINT), LOCK_EX);
}

function read_reviews($filePath)
{
    $raw = file_get_contents($filePath);
    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function write_reviews($filePath, $reviews)
{
    return file_put_contents($filePath, json_encode($reviews, JSON_PRETTY_PRINT), LOCK_EX) !== false;
}

function sorted_reviews($reviews)
{
    usort($reviews, function ($a, $b) {
        $aTime = isset($a['createdAt']) ? (int)$a['createdAt'] : 0;
        $bTime = isset($b['createdAt']) ? (int)$b['createdAt'] : 0;
        return $bTime <=> $aTime;
    });

    return $reviews;
}

function respond($statusCode, $payload)
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $reviews = read_reviews($storageFile);
    respond(200, ['ok' => true, 'reviews' => sorted_reviews($reviews)]);
}

if ($method !== 'POST') {
    respond(405, ['ok' => false, 'message' => 'Method not allowed']);
}

$inputRaw = file_get_contents('php://input');
$input = json_decode($inputRaw ?: '{}', true);
if (!is_array($input)) {
    $input = [];
}

$action = isset($input['action']) ? trim((string)$input['action']) : 'create';
$reviews = read_reviews($storageFile);

if ($action === 'create') {
    $rating = isset($input['rating']) ? (int)$input['rating'] : 0;
    $text = isset($input['text']) ? trim((string)$input['text']) : '';
    $userId = isset($input['userId']) ? trim((string)$input['userId']) : '';

    if ($rating < 1 || $rating > 5) {
        respond(422, ['ok' => false, 'message' => 'Rating must be between 1 and 5']);
    }

    if ($text === '') {
        respond(422, ['ok' => false, 'message' => 'Review text is required']);
    }

    $now = time();
    $reviews[] = [
        'id' => uniqid('rev_', true),
        'userId' => $userId,
        'rating' => $rating,
        'text' => $text,
        'createdAt' => $now,
        'updatedAt' => $now,
    ];

    if (!write_reviews($storageFile, $reviews)) {
        respond(500, ['ok' => false, 'message' => 'Failed to save review']);
    }

    respond(200, ['ok' => true, 'reviews' => sorted_reviews($reviews)]);
}

if ($action === 'update') {
    $id = isset($input['id']) ? trim((string)$input['id']) : '';
    $rating = isset($input['rating']) ? (int)$input['rating'] : 0;
    $text = isset($input['text']) ? trim((string)$input['text']) : '';
    $userId = isset($input['userId']) ? trim((string)$input['userId']) : '';

    if ($id === '') {
        respond(422, ['ok' => false, 'message' => 'Review id is required']);
    }

    if ($rating < 1 || $rating > 5) {
        respond(422, ['ok' => false, 'message' => 'Rating must be between 1 and 5']);
    }

    if ($text === '') {
        respond(422, ['ok' => false, 'message' => 'Review text is required']);
    }

    $updated = false;
    foreach ($reviews as &$review) {
        if (isset($review['id']) && $review['id'] === $id) {
            if (($review['userId'] ?? '') !== $userId) {
                respond(403, ['ok' => false, 'message' => 'Unauthorized', 'error' => 'Unauthorized']);
            }

            $review['rating'] = $rating;
            $review['text'] = $text;
            $review['updatedAt'] = time();
            $updated = true;
            break;
        }
    }
    unset($review);

    if (!$updated) {
        respond(404, ['ok' => false, 'message' => 'Review not found']);
    }

    if (!write_reviews($storageFile, $reviews)) {
        respond(500, ['ok' => false, 'message' => 'Failed to update review']);
    }

    respond(200, ['ok' => true, 'reviews' => sorted_reviews($reviews)]);
}

if ($action === 'delete') {
    $id = isset($input['id']) ? trim((string)$input['id']) : '';
    $userId = isset($input['userId']) ? trim((string)$input['userId']) : '';

    if ($id === '') {
        respond(422, ['ok' => false, 'message' => 'Review id is required']);
    }

    $target = null;
    foreach ($reviews as $review) {
        if (isset($review['id']) && $review['id'] === $id) {
            $target = $review;
            break;
        }
    }

    if (!$target) {
        respond(404, ['ok' => false, 'message' => 'Review not found']);
    }

    if (($target['userId'] ?? '') !== $userId) {
        respond(403, ['ok' => false, 'message' => 'Unauthorized', 'error' => 'Unauthorized']);
    }

    $reviews = array_values(array_filter($reviews, function ($review) use ($id) {
        return !isset($review['id']) || $review['id'] !== $id;
    }));

    if (!write_reviews($storageFile, $reviews)) {
        respond(500, ['ok' => false, 'message' => 'Failed to delete review']);
    }

    respond(200, ['ok' => true, 'reviews' => sorted_reviews($reviews)]);
}

respond(422, ['ok' => false, 'message' => 'Unsupported action']);
