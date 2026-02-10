# API Docs Index

## OpenAPI Specs

- Main spec: ./openapi.yaml
- Auth: ./openapi-auth.yaml
- Videos: ./openapi-videos.yaml
- Channels: ./openapi-channels.yaml
- Comments: ./openapi-comments.yaml
- Users: ./openapi-users.yaml
- Analytics: ./openapi-analytics.yaml
- Recommendations: ./openapi-recommendations.yaml

## Postman

- Collection: ./postman-collection.json

## Notes

- Comment like/delete routes include videoId:
  - POST /videos/{videoId}/comments/{commentId}/like
  - DELETE /videos/{videoId}/comments/{commentId}
