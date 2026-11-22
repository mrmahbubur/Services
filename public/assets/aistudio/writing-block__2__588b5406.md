# M R S — COMPLETE PRODUCTION COMMUNICATION SYSTEM
## Full WhatsApp-Style Features, WebRTC Video-Call Fix, Interface, Security, Backend, Notifications & Real User Experience

**Product:** M R S  
**Brand:** PRIVATE COMMUNICATION NETWORK  
**Platform:** Production-ready browser-based communication website  
**Development environment:** Google AI Studio  
**Implementation type:** Update and extend the existing application  
**Target:** Real users, real accounts, real communication, real-time services.

# PART 1 — CRITICAL DEVELOPMENT RULES

## 1. Inspect and preserve the existing application

Before making any changes, inspect the entire existing project.

Identify:
- Existing frontend framework.
- Backend architecture.
- Firebase configuration.
- Authentication implementation.
- Firestore collections.
- Storage configuration.
- WebRTC implementation.
- Signaling mechanism.
- Push notification system.
- Service worker.
- PWA configuration.
- Existing UI components.
- Existing user accounts and stored data.
- Current security rules.
- Existing deployment configuration.

Create a technical report identifying existing features, broken features, incomplete functionality, and missing components.

**Mandatory rules:**

1. Do not rebuild the application from scratch.
2. Do not delete existing user accounts.
3. Do not delete existing conversations or attachments.
4. Do not reset existing databases.
5. Do not replace working functionality with demo functionality.
6. Do not create fake users, simulated calls, or placeholder conversations.
7. Reuse existing components and services where practical.
8. Use safe database migrations when schema changes are required.
9. Back up important data before performing migrations.
10. Test each modification before moving to the next stage.

Every feature must work with real backend data.

---

# PART 2 — CRITICAL WEBRTC VIDEO-CALL BUG FIX

## 2. Fix the problem: Caller video appears, recipient video is missing

**Current issue:** During a video call, the calling person's video appears, but the video of the person receiving the call does not appear correctly.

Investigate and fix the underlying WebRTC implementation.

Do not solve this problem by simply changing the video layout or displaying the caller's video twice.

### 2.1 Correct two-way video architecture

Every one-to-one video call must support two independent video streams:

- Local video: camera stream captured from the current user.
- Remote video: camera stream received from the other participant.

For example:

When User A calls User B:

- User A sees User A's local preview and User B's remote video.
- User B sees User B's local preview and User A's remote video.

When the call is connected, both participants must receive each other's audio and video, subject to camera and microphone permissions.

### 2.2 Investigate the actual root cause

Inspect all of the following:

- RTCPeerConnection creation.
- Media device acquisition.
- Audio and video track creation.
- addTrack or addTransceiver implementation.
- SDP offer generation.
- SDP answer generation.
- setLocalDescription.
- setRemoteDescription.
- ICE candidate generation.
- ICE candidate exchange.
- ICE candidate queueing before remote description.
- ontrack event handling.
- Track-to-participant association.
- Remote MediaStream construction.
- Video element references.
- React component lifecycle.
- Connection cleanup.
- Duplicate peer connections.
- Call ID and participant ID validation.
- Signaling message ordering.
- Firestore listener lifecycle.
- WebSocket reconnection, if used.
- Browser autoplay restrictions.

Identify the actual failure using browser console logs, WebRTC connection statistics, signaling events, and network diagnostics.

Do not assume the problem is only a frontend rendering issue.

### 2.3 Correct local media acquisition

When a user accepts or initiates a video call:

1. Verify the user has explicitly initiated or accepted the call.
2. Request camera and microphone permissions.
3. Acquire the real media stream using getUserMedia.
4. Verify the required tracks exist and are enabled.
5. Attach the appropriate tracks to the correct peer connection.
6. Handle permission denial and unavailable devices.
7. Display the local preview using the local video element.

For audio-only calls, do not unnecessarily request camera access.

Use appropriate video constraints and provide fallback constraints when a device does not support the preferred resolution.

Do not assume that every camera supports the same resolution or frame rate.

### 2.4 Correct remote-track reception

Implement the WebRTC `ontrack` event correctly.

When a remote audio or video track arrives:

- Identify the correct call.
- Identify the correct remote participant.
- Add the received track to the correct remote MediaStream.
- Update the remote video state.
- Attach the stream to the remote video element.
- Call play() when appropriate.
- Handle autoplay rejection.
- Display an explicit user action to start remote media playback if required.
- Update the connection interface when the remote track becomes available.

Do not depend on receiving audio and video tracks in one event. Browsers may deliver separate track events.

Maintain the remote MediaStream across multiple track events so that receiving a later audio track does not replace an already received video track.

Use the correct `event.streams` information when available. If the stream array is empty, construct and maintain an appropriate remote MediaStream using the received track and its identity.

### 2.5 Correct video element mapping

Use separate, persistent video elements:

**Local video element**
- Displays the current user's camera.
- Uses the local stream.
- Uses muted playback.
- Uses playsInline.
- Can be mirrored for a natural self-preview.

**Remote video element**
- Displays the other participant's camera.
- Uses the remote stream.
- Uses playsInline.
- Must not be muted by default when audio is expected.
- Must not accidentally receive the local stream.

Never assign the same MediaStream to both local and remote video elements.

Do not use a React state update that accidentally replaces the remote stream with the local stream.

Use stable element references and clean up only the relevant call's media resources.

### 2.6 Correct signaling sequence

Implement a reliable signaling state machine.

The caller must:

1. Create the peer connection.
2. Acquire local media.
3. Add local media tracks or negotiate transceivers.
4. Create an SDP offer.
5. Set the local description.
6. Send the offer through authenticated signaling.
7. Receive and validate the remote answer.
8. Set the remote description.
9. Process queued remote ICE candidates.
10. Continue exchanging ICE candidates until connectivity is established.

The recipient must:

1. Receive and validate the invitation.
2. Accept the call.
3. Create its own peer connection.
4. Acquire its own permitted local media.
5. Add its own media tracks or negotiate transceivers.
6. Set the caller's offer as the remote description.
7. Process any queued ICE candidates.
8. Create an SDP answer.
9. Set the local description.
10. Send the answer through authenticated signaling.
11. Continue exchanging ICE candidates.
12. Receive and render the caller's remote tracks.

Do not create an answer before successfully applying the offer as the remote description.

### 2.7 ICE candidate handling

Implement correct ICE candidate processing.

- Exchange candidates through authenticated signaling.
- Associate candidates with the correct call and participant.
- Queue candidates received before setRemoteDescription succeeds.
- Process queued candidates after the remote description is applied.
- Handle duplicate candidates safely.
- Handle candidate errors.
- Monitor ICE gathering state.
- Monitor ICE connection state.
- Support ICE restart when appropriate.
- Reconnect after temporary network interruption.

Configure appropriate STUN servers and a TURN fallback.

Do not assume STUN alone works across all mobile networks, NATs, firewalls, and restricted networks.

### 2.8 Prevent simultaneous-offer and renegotiation bugs

Implement a controlled negotiation process.

- Handle simultaneous offers.
- Use an appropriate perfect-negotiation strategy.
- Prevent duplicated SDP negotiations.
- Handle glare conditions.
- Manage offer collision safely.
- Avoid creating multiple peer connections for one call.
- Synchronize camera and microphone changes through renegotiation when needed.

### 2.9 Video-call diagnostics

Create a diagnostic system for development and support.

Record technical events such as:

- Peer connection created.
- Local media acquired.
- Local tracks attached.
- Offer created.
- Answer received.
- Remote description applied.
- ICE candidate received.
- ICE connected.
- Remote audio track received.
- Remote video track received.
- Remote video element attached.
- Playback started.
- Connection interrupted.
- ICE restart attempted.
- Call ended.

Do not log private media, decrypted messages, encryption keys, or sensitive content.

Create a development-only diagnostic panel showing:

- Local camera status.
- Local microphone status.
- Remote video track status.
- Remote audio track status.
- Signaling connection state.
- ICE connection state.
- Peer connection state.
- Current video resolution.
- Frame rate where available.
- Packet loss where available.
- Network connectivity.

Never expose detailed diagnostic information to unauthorized users.

### 2.10 Video-call acceptance tests

Test using two different accounts and two real devices.

Test all these cases:

1. User A calls User B.
2. User B answers.
3. User A sees User B's video.
4. User B sees User A's video.
5. Both users hear each other.
6. Both users see their local previews.
7. User A disables the camera.
8. User B disables the camera.
9. Both cameras can be enabled again.
10. Microphone mute works independently.
11. User switches camera where supported.
12. User changes network.
13. One device temporarily disconnects.
14. Both users reconnect.
15. One user ends the call.
16. Browser permissions are denied.
17. Camera is unavailable or already in use.
18. Call is accepted on another registered device.
19. Call invitation expires.
20. Repeated calls do not reuse stale media streams.

**Acceptance requirement:** A video call is not complete until both participants can receive and render each other's real video and audio correctly on supported browsers.

---

# PART 3 — COMPLETE M R S APPLICATION STRUCTURE

## 3. Main navigation

Use exactly these primary sections:

1. Chats
2. Calls
3. Status
4. Contacts
5. Settings

Do not introduce group chats or communities.

The interface must be responsive and work on desktop, tablet, and mobile browsers.

## 4. Main desktop layout

Create a professional three-panel communication interface.

### Left navigation panel

Approximate width: 340–390 px.

Include:
- M R S logo.
- User profile.
- Main navigation.
- Search.
- Recent chats.
- Unread counts.
- New chat action.
- Notification indicator.

### Center workspace

Flexible width.

Show:
- Conversation list when appropriate.
- Active one-to-one conversation.
- Call history.
- Status feed.
- Contacts.
- Settings.

### Right contextual panel

Optional and collapsible.

Include:
- Contact information.
- Shared media.
- Shared documents.
- Conversation settings.
- Search results.

### Mobile layout

Use a separate mobile navigation design.

- Compact header.
- One main screen at a time.
- Bottom navigation.
- Full-screen conversation.
- Full-screen call interface.
- Responsive media previews.
- Large touch controls.
- Correct keyboard and safe-area behavior.

Never squeeze all desktop panels into a mobile viewport.

---

# PART 4 — VISUAL DESIGN AND BRAND

## 5. Professional design system

Create a genuine premium technology identity.

### Colors

| Purpose | HEX |
|---|---|
| Deep Navy | `#101C35` |
| Near Black | `#111827` |
| Electric Blue | `#2563EB` |
| Cyan | `#22D3EE` |
| White | `#FFFFFF` |
| Soft Background | `#F8FAFC` |
| Slate Gray | `#64748B` |
| Border | `#E2E8F0` |
| Success | `#16A34A` |
| Warning | `#D97706` |
| Error | `#DC2626` |

Support light mode, dark mode, and system-default mode.

### Typography

Use Inter or a comparable professional sans-serif typeface.

Maintain consistent text sizes, line heights, weights, and spacing.

### Graphics

Use:
- Approved M R S logo.
- High-quality SVG icons.
- Consistent profile avatars.
- Neutral initials-based avatar fallbacks.
- Professional document icons.
- Clean attachment thumbnails.
- Minimal empty-state illustrations.
- Subtle loading indicators.
- Carefully designed notification icons.

Do not use random stock graphics or fake profile photographs.

### Interface details

Use:
- Consistent 8-point spacing system.
- 8–14 px component corner radii where appropriate.
- Subtle borders.
- Restrained shadows.
- Consistent hover and focus states.
- Smooth transitions.
- Clear active-state indicators.

Prioritize usability over decoration.

---

# PART 5 — AUTHENTICATION AND USER ACCOUNTS

## 6. Registration

Support real self-registration.

Fields:
- Unique M R S ID.
- Display name.
- Password.
- Confirm password.
- Verified recovery email.
- Optional profile picture.

Validate all inputs on the frontend and backend.

Use case-insensitive unique IDs.

Use Firebase Authentication or the existing secure authentication provider to manage passwords.

Never store plaintext passwords or manually store password hashes in Firestore.

## 7. Login

Users sign in using:

- M R S ID.
- Password.

The backend securely resolves the M R S ID to its authentication identity.

Support:
- Login.
- Logout.
- Session management.
- Session expiration.
- Brute-force protection.
- Rate limiting.
- Secure authentication errors.
- Recent-login verification for sensitive actions.

## 8. Password recovery

- User enters M R S ID.
- Backend securely finds the associated verified recovery address.
- Send a single-use, time-limited password-reset link.
- Avoid revealing whether an account exists.
- Revoke existing sessions where supported after a successful reset.
- Notify the recovery email.

Never allow an administrator to retrieve an existing password.

---

# PART 6 — PRIVATE CONTACT SYSTEM

## 9. M R S ID-based contacts

Use exact M R S ID discovery.

Features:
- Search by exact ID.
- Send contact request.
- Accept request.
- Reject request.
- Cancel sent request.
- Remove contact.
- Block contact.
- Unblock contact.
- View approved contacts.

Do not create a public user directory or phone-number discovery.

Only approved contacts can start private conversations or calls.

## 10. Contact profiles

Display:
- Profile image.
- Display name.
- M R S ID.
- Optional profile description.
- Online status when permitted.
- Message action.
- Audio-call action.
- Video-call action.
- Block action.

Respect the user's privacy settings.

---

# PART 7 — COMPLETE PRIVATE MESSAGING

## 11. One-to-one chat

Support:
- Real-time text messages.
- Emoji.
- Replies.
- Reactions.
- Editing.
- Deleting.
- Forwarding.
- Copying.
- Pinning.
- Searching.
- Sent indicators.
- Delivered indicators.
- Read receipts.
- Typing indicators.
- Unread counts.
- Conversation archive.
- Mute.
- Disappearing messages.
- Message timestamps.
- Date separators.

No group chats or communities.

## 12. Message composer

Include:
- Text input.
- Emoji selector.
- Attachment selector.
- Image upload.
- Document upload.
- Voice recording.
- Send button.
- Upload progress.
- Upload cancellation.
- Retry after failure.

Desktop keyboard behavior:
- Enter sends.
- Shift+Enter inserts a new line.

Mobile must use natural keyboard behavior.

## 13. Attachments

Supported formats:

- PDF.
- DOC/DOCX.
- XLS/XLSX.
- PPT/PPTX.
- TXT.
- ZIP.
- JPG/JPEG.
- PNG.
- WebP.
- MP3.
- WAV.
- MP4.

Provide:
- File previews.
- Image previews.
- Audio playback.
- Video playback.
- Document information.
- Download.
- Upload progress.
- Retry.
- Delete where authorized.

Enforce file size, MIME type, extension, storage quota, and authorization checks on the backend.

Use private encrypted storage.

Do not expose permanent public URLs.

## 14. Voice messages

Implement:
- Microphone permission.
- Start recording.
- Stop recording.
- Cancel recording.
- Preview.
- Send.
- Playback.
- Playback progress.
- Duration display.
- Download where permitted.

Never activate the microphone without explicit user action.

---

# PART 8 — COMPLETE AUDIO AND VIDEO CALLING

## 15. Calling architecture

Use real one-to-one WebRTC.

Support:
- Audio calls.
- Video calls.
- Incoming calls.
- Outgoing calls.
- Accept.
- Decline.
- Cancel.
- End.
- Missed calls.
- Call duration.
- Reconnection.
- Call history.
- Microphone control.
- Camera control.
- Camera switching.
- Speaker selection where supported.
- Fullscreen video.
- Network status.

No group calling.

## 16. Call duration and stability

Do not introduce arbitrary application-level duration limits.

Use:
- Live call-duration counter.
- Connection-state monitoring.
- ICE restart.
- Signaling recovery.
- Network interruption handling.
- Correct call termination.
- Resource cleanup.

Actual call duration depends on browser, network, and infrastructure availability.

Do not falsely promise unlimited uninterrupted calling.

## 17. Incoming-call notifications

Use:
- Real-time signaling.
- Web Push.
- Push subscriptions.
- Service workers.
- Browser notifications.
- PWA support where available.

Notify registered recipient devices where supported.

The recipient must explicitly accept the call.

Do not claim a website can force a browser to open or guarantee ringing after the operating system has suspended or restricted it.

Do not activate microphone or camera automatically.

---

# PART 9 — 24-HOUR STATUS SYSTEM

## 18. Status creation

Allow:
- Text status.
- Image status.
- Video status.

Support:
- Captions.
- Background selection.
- Media preview.
- Audience selection.
- Publishing.
- Deleting own status.

## 19. Status viewing

Display:
- Contact avatar.
- Contact name.
- Unseen indicator.
- Update time.
- Progress indicator.
- Viewer list for the status owner.

Automatically expire every status after 24 hours.

Support:
- Next status.
- Previous status.
- Pause.
- Resume.
- Reply through private chat.
- Mute status updates where appropriate.

Audience options:
- All approved contacts.
- Selected contacts.
- Exclude selected contacts.

Use private storage and enforce status audience permissions on the backend.

---

# PART 10 — COMPLETE CALL HISTORY

## 20. Calls page

Display:
- All calls.
- Incoming calls.
- Outgoing calls.
- Missed calls.

Each item includes:
- Contact.
- Profile image.
- M R S ID.
- Call type.
- Call time.
- Duration.
- Final call status.

Actions:
- Call back.
- Open profile.
- Remove history entry.
- Clear history.

Keep records private to the relevant account.

---

# PART 11 — SETTINGS AND PERSONALIZATION

## 21. Account settings

- Profile picture.
- Display name.
- M R S ID.
- About.
- Recovery email.
- Password.
- Active sessions.
- Logout.
- Account deletion request.

## 22. Privacy settings

- Last-seen visibility.
- Online visibility.
- Profile-photo visibility.
- About visibility.
- Read receipts.
- Blocked contacts.
- Status audience.
- Notification privacy.

## 23. Security settings

- Active devices.
- Session management.
- Device removal.
- Login activity.
- Security alerts.
- Device verification.
- Encryption information.

## 24. Notification settings

- Message notifications.
- Incoming-call notifications.
- Ringtone.
- Sound volume.
- Vibration where supported.
- Browser permission status.
- Notification preview privacy.
- Test notification.
- Registered devices.

## 25. Appearance settings

- Light theme.
- Dark theme.
- System theme.
- Chat wallpaper.
- Font size.
- Reduced motion.
- Compact or comfortable conversation density.

Persist preferences securely.

---

# PART 12 — SEARCH AND PRODUCTIVITY FEATURES

## 26. Search

Provide separate search for:

- Contacts.
- Conversations.
- Messages.
- Shared documents.
- Shared media.

Search must respect authentication, contact relationships, and conversation permissions.

Do not expose private content through public search engines.

## 27. Conversation organization

Support:
- Pinned chats.
- Archived chats.
- Muted chats.
- Unread filters.
- Message bookmarks.
- Shared-media browser.
- Conversation search.

## 28. Message convenience

Provide:
- Reply to message.
- Copy text.
- Forward message.
- React.
- Edit own message.
- Delete own message.
- Pin message.
- Share attachment.
- View message details where supported.

Do not expose another user's private information through message actions.

---

# PART 13 — NOTIFICATION CENTER

## 29. Notification types

Support:
- New message.
- Contact request.
- Contact acceptance.
- Incoming audio call.
- Incoming video call.
- Missed call.
- Status reply.
- Security alert.
- Account recovery notification.

Provide:
- Read/unread.
- Timestamp.
- Clear.
- Mark read.
- Open destination.

Push payloads must contain only the minimum information needed to route the event.

---

# PART 14 — BACKEND AND DATABASE

## 30. Backend requirements

Use the existing architecture where practical.

Recommended components, if already in use:
- React and TypeScript frontend.
- Firebase Authentication.
- Firestore.
- Private Firebase Storage.
- Secure server-side APIs or Cloud Functions.
- WebRTC.
- Web Push.
- Service Worker.
- PWA manifest.

Do not introduce unnecessary infrastructure or paid services without approval.

## 31. Core data models

Maintain secure records for:

**Users**
- userId
- mrsId
- displayName
- profileImage
- recoveryEmailStatus
- accountStatus
- createdAt
- privacyPreferences

**Contacts**
- requesterId
- recipientId
- requestStatus
- createdAt
- updatedAt

**Conversations**
- conversationId
- participantIds
- createdAt
- updatedAt

**Messages**
- messageId
- conversationId
- senderId
- encryptedPayload
- messageType
- attachmentReference
- createdAt
- editedAt
- deliveryState

**Calls**
- callId
- callerId
- recipientId
- callType
- callState
- createdAt
- acceptedAt
- endedAt
- failureReason

**Device subscriptions**
- subscriptionId
- userId
- deviceSessionId
- pushSubscription
- permissionStatus
- createdAt
- lastActiveAt

**Statuses**
- statusId
- ownerId
- statusType
- encryptedMediaReference
- audienceConfiguration
- createdAt
- expiresAt

**Call history**
- callId
- participantIds
- callType
- finalStatus
- startedAt
- endedAt
- durationSeconds

Use appropriate database indexes and pagination.

Do not allow clients to modify privileged backend state directly.

---

# PART 15 — END-TO-END SECURITY AND PRIVACY

## 32. Encryption

Implement genuine end-to-end encryption for private messages and attachments using established, audited cryptographic protocols.

Requirements:
- Secure key exchange.
- Device identity verification.
- Forward secrecy where supported by the selected protocol.
- Secure key storage.
- Key rotation.
- Encrypted attachments before upload.
- Authenticated message integrity.
- No server-side plaintext message storage.

Do not create a custom cryptographic algorithm.

Do not claim true end-to-end encryption if the server or administrator can decrypt private messages.

## 33. Calling security

Use authenticated signaling and WebRTC's secure media transport.

Do not automatically record calls.

Do not expose call-room credentials.

Do not permit unauthorized users to join existing calls.

## 34. Privacy-safe administration

Maintain separate administrator roles and least-privilege permissions.

Administrative tools should focus on:
- Account management.
- Security events.
- Device sessions.
- Service health.
- Storage usage.
- Notification delivery.
- Technical incident management.
- Audit history.

Require MFA and record privileged administrative actions.

Do not expose private encryption keys or private message contents through ordinary administrator dashboards.

Ensure public privacy documentation accurately explains access and data handling.

---

# PART 16 — BROWSER EXPERIENCE AND PWA

## 35. Website requirements

M R S must remain a real website.

Support:
- Android browsers.
- iPhone/iPad browsers.
- Desktop browsers.
- Tablets.
- Installed PWA where supported.

Include:
- HTTPS.
- Web app manifest.
- Service worker.
- Correct M R S icons.
- Responsive design.
- Push notifications.
- Safe asset caching.
- Install instructions.

Do not use an APK or native wrapper as a substitute.

## 36. Offline behavior

When offline:
- Display an offline indicator.
- Preserve safe unsent drafts locally.
- Do not falsely mark messages as sent.
- Retry when connectivity returns.
- Restore realtime subscriptions.
- Avoid caching sensitive decrypted content in public caches.

---

# PART 17 — ERROR HANDLING AND USER EXPERIENCE

## 37. Every screen must handle

- Loading.
- Empty state.
- Error.
- Offline.
- Permission denied.
- Session expired.
- Upload failure.
- Call failure.
- Reconnection.
- Expired invitation.
- Unsupported browser feature.

Provide understandable messages and appropriate retry actions.

Never display technical stack traces to ordinary users.

## 38. Accessibility

Implement:
- Semantic HTML.
- Keyboard navigation.
- Screen-reader labels.
- Visible focus.
- Contrast compliance.
- Accessible buttons.
- Responsive text.
- Reduced motion.
- Touch-friendly controls.

---

# PART 18 — ADMINISTRATION AND SERVICE HEALTH

## 39. Administrative interface

Keep administration separate from ordinary user screens.

Include:
- User account management.
- Registration controls.
- Account suspension/reactivation.
- Device session management.
- Security event monitoring.
- Notification delivery status.
- Storage monitoring.
- Backend health.
- Error reporting.
- Incident records.
- Audit logs.

Do not expose private content or encryption keys through ordinary administration tools.

---

# PART 19 — TESTING WITH REAL USERS

## 40. Mandatory test environment

Use at least:
- Two separate M R S accounts.
- Two different devices.
- Different browser sessions.
- A real internet connection.
- Real cameras and microphones.

Test actual production flows, not just frontend component previews.

### Messaging tests

- Signup.
- Login.
- Contact request.
- Contact acceptance.
- Text message.
- Reply.
- Reaction.
- Edit.
- Delete.
- Forward.
- Attachment.
- Voice message.
- Delivery status.
- Read status.
- Search.

### Calling tests

- Audio call in both directions.
- Video call in both directions.
- Incoming notification.
- Call acceptance.
- Call rejection.
- Call cancellation.
- Missed call.
- Camera off/on.
- Microphone mute/unmute.
- Camera switching.
- Network interruption.
- Reconnection.
- Browser background.
- PWA background.
- Call history.
- Correct remote video display on both devices.

### Status tests

- Publish.
- View.
- Reply.
- Audience restrictions.
- Delete.
- Automatic 24-hour expiration.

### Security tests

- Unauthorized access.
- Cross-account data leakage.
- Invalid attachment requests.
- Forged signaling.
- Contact restrictions.
- Session expiration.
- Rate limiting.
- Encryption validation.
- Administrative permission enforcement.

---

# PART 20 — DEVELOPMENT ORDER AND DELIVERY

## 41. Required implementation stages

Perform implementation in this order:

**Stage 1 — Audit**
- Inspect the existing system.
- Identify current defects.
- Preserve data.
- Prepare migration and integration plan.

**Stage 2 — Critical video-call correction**
- Fix two-way media.
- Fix signaling.
- Fix remote tracks.
- Fix remote video rendering.
- Test with two devices.

**Stage 3 — Core communication**
- Authentication.
- Contacts.
- Messaging.
- Attachments.
- Voice messages.

**Stage 4 — Calling and notifications**
- WebRTC.
- Push notifications.
- Service worker.
- PWA support.
- Call recovery.

**Stage 5 — Status and productivity**
- 24-hour status.
- Search.
- Call history.
- Message organization.

**Stage 6 — Complete interface**
- Responsive layout.
- Themes.
- Icons.
- Graphics.
- Settings.
- Empty and error states.

**Stage 7 — Security and release**
- Access control.
- Encryption verification.
- Database rules.
- Real-device testing.
- Production deployment.
- Backup and rollback readiness.

## 42. Definition of completion

Do not report the project as complete simply because the website looks attractive.

Every feature must have:
- A real working interface.
- A real backend implementation.
- Correct authorization.
- Persistent data where applicable.
- Error handling.
- Mobile and desktop support.
- Security validation.
- Successful real-device tests.

Provide an implementation report containing:

1. Features successfully completed.
2. Existing features preserved.
3. Bugs fixed.
4. Database changes.
5. Security changes.
6. Browser compatibility.
7. Tests passed.
8. Tests failed.
9. Infrastructure requirements.
10. Remaining limitations.

Do not hide incomplete functionality or claim tests passed without actually running them.

# FINAL PRODUCT REQUIREMENT

Deliver M R S as a complete, reliable, professional, WhatsApp-style private communication website for real users.

It must provide genuine one-to-one communication, secure accounts, private contacts, real-time messaging, attachments, voice messages, audio/video calls, two-way video reception, incoming-call notifications, 24-hour statuses, call history, settings, and responsive browser access.

The existing application must be upgraded rather than replaced.

**The most important immediate task is fixing the two-way WebRTC video problem and proving that both participants can see and hear each other on two separate real devices before declaring video calling complete.**