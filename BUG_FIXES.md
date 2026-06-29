*Bugs to fix*
- The navbar is not centered due to the varying container sizes of each page. Either make the container sizes consistent or fix the centering of the navbar.

*TODO List*
- Implement JWT refresh tokens
- Add Redis to cache popular queries and search results
- Implement an event/message bus like RabbitMQ or ActiveMQ to move data ingestion out of the request lifecycle
- Remove search algorithm/engine and replace with Elasticsearch