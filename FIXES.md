*Bugs to fix*
- The navbar is not centered due to the varying container sizes of each page. Either make the container sizes consistent or fix the centering of the navbar.

*TODO List*
- Add Redis to cache popular queries and search results
- Implement an event/message bus like RabbitMQ or ActiveMQ to move data ingestion out of the request lifecycle
- Remove search algorithm/engine and replace with Elasticsearch
- Check whether lint fails because some tests are designed to fail in order to pass
- Add more symptoms to search by and increase data in database (more remedies)
- Add common prescribed medicines/over-the-counter for medication list
- Add filters to sort by:
    - Tier

*Feedback to implement*
- Add "Consult your doctor" disclaimer on results page
- Add a key/legend explaining what the different tiers mean on results page and remedy details page
- Add photos of what remedies look like