SELECT u.id, u.username, c.id as channel_id, c.handle 
FROM users u 
LEFT JOIN channels c ON c."userId" = u.id;
