# Umami Event Tracking

Umami tracker host: `https://bi.rethinkos.com`

Website:

- Name: `gua`
- Domain: `gua.rethinkos.com`
- Website ID: `c354bb50-fba3-4ad6-8681-4f77ffd11802`

## Naming

Event names use `module_action_object` and stay under Umami's 50-character limit.

Dynamic search events do not send raw keywords. They only send keyword length.

## Dashboard

| Event | Trigger | Data |
| --- | --- | --- |
| `dashboard_click_sync_latest` | Click latest Bilibili sample sync button | `module=dashboard`, `action=sync_latest` |
| `dashboard_click_subtitle_backfill` | Click subtitle backfill button | `module=dashboard`, `action=subtitle_backfill` |
| `dashboard_filter_creator` | Change top-level creator/sort filter | `module=dashboard_filters`, `creator_selected`, `sort` |
| `dashboard_search_creator` | Blur top-level creator search input with non-empty value | `module=dashboard_filters`, `keyword_length` |

## Video Library

| Event | Trigger | Data |
| --- | --- | --- |
| `library_filter_creator` | Change library creator filter | `module=video_library`, `creator_selected` |
| `library_change_sort` | Change library sort select | `module=video_library`, `sort` |
| `library_filter_tag_status` | Change tag status filter | `module=video_library`, `tag_status` |
| `library_search_creator` | Blur creator search input with non-empty value | `module=video_library`, `keyword_length` |
| `library_search_title` | Blur title search input with non-empty value | `module=video_library`, `keyword_length` |
| `library_search_tag` | Blur tag search input with non-empty value | `module=video_library`, `keyword_length` |
| `library_paginate` | Click previous/next page | `module=video_library`, `direction`, `page` |

## Video Table

| Event | Trigger | Data |
| --- | --- | --- |
| `video_open_bilibili` | Click video cover or title to open Bilibili | `module=video_table`, `source`, `bvid`, `type` |
| `video_open_subtitle` | Open subtitle modal | `module=video_table`, `bvid` |
| `video_copy_subtitle` | Copy subtitle text from modal | `module=subtitle_modal`, `bvid` |

## Creator And Samples

| Event | Trigger | Data |
| --- | --- | --- |
| `creator_open_bilibili` | Click creator card to open Bilibili profile | `module=creator`, `rank`, `mid`, `video_count` |
| `sample_open_bilibili` | Click learning sample video | `module=learning_sample`, `bvid`, `creator` |

## Implementation Notes

- Static click events use Umami data attributes: `data-umami-event` and `data-umami-event-*`.
- Dynamic events use `trackUmamiEvent()` in `lib/umami-events.ts`, which calls `window.umami.track(eventName, eventData)` when the tracker is loaded.
- Page views are not manually tracked. Umami handles SPA navigation automatically when the tracker script is loaded once in `app/layout.tsx`.
