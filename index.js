/**
 * Initializes a new instance of the `CallManager` class, creating
 * a Daily.co call object and setting initial states for the current room URL. 
 * It then calls the `initialize` method to set up event listeners and UI interactions.
 */
class CallManager {
  constructor() {
    this.call = Daily.createCallObject();
    this.currentRoomUrl = null;
    this.initialize();
  }

  /**
   * Performs initial setup of event listeners and UI component interactions.
   */
  async initialize() {
    this.setupEventListeners();
  }

  /**
   * Configures event listeners for various call-related events.
   */
  setupEventListeners() {
    const events = {
      'active-speaker-change': this.handleActiveSpeakerChange.bind(this),
      error: this.handleError.bind(this),
      'joined-meeting': this.handleJoin.bind(this),
      'left-meeting': this.handleLeave.bind(this),
      'participant-joined': this.handleParticipantJoinedOrUpdated.bind(this),
      'participant-left': this.handleParticipantLeft.bind(this),
      'participant-updated': this.handleParticipantJoinedOrUpdated.bind(this),
      'app-message': this.handleAppMessage.bind(this),
    };

    Object.entries(events).forEach(([event, handler]) => {
      this.call.on(event, handler);
    });
  }

  /**
   * Handler for the local participant joining:
   * - Prints the room URL
   * - Enables the toggle leave button
   * - Gets the initial track states
   * - Sets up and enables the device selectors
   * @param {Object} event - The joined-meeting event object.
   */
  handleJoin(event) {
    const tracks = event.participants.local.tracks;

    console.log(`Successfully joined: ${this.currentRoomUrl}`);

    // Update the participant count
    this.updateAndDisplayParticipantCount();

    // Show video-settings class
    document.getElementById('video-settings').style.display = 'flex';

    // Enable the leave button
    document.getElementById('leave-btn').disabled = false;

    // Initialize the camera and microphone states and UI for the local
    // participant
    Object.entries(tracks).forEach(([trackType, trackInfo]) => {
      this.updateUiForDevicesState(trackType, trackInfo);
    });
  }

  /**
   * Handler for participant leave events:
   * - Confirms leaving with a console message
   * - Updates the call state in the UI
   * - Removes all video containers
   */
  handleLeave() {
    console.log('Successfully left the call');

    // Update the join and leave button states
    document.getElementById('leave-btn').disabled = true;
    document.getElementById('start-btn').disabled = false;

    // Update the call state in the UI
    document.getElementById('camera-state').textContent = 'Camera: Off';
    document.getElementById('mic-state').textContent = 'Mic: Off';
    document.getElementById(
      'participant-count'
    ).textContent = `Participants: 0`;
    document.getElementById(
      'active-speaker'
    ).textContent = `Active Speaker: None`;
    document.getElementById(
      'app-message'
    ).textContent = `App State: None`;

    // Remove all video containers
    const videosDiv = document.getElementById('videos');
    while (videosDiv.firstChild) {
      videosDiv.removeChild(videosDiv.firstChild);
    }

    // Hide video-settings class
    document.getElementById('video-settings').style.display = 'none';
  }

  /**
   * Handles fatal errors emitted from the Daily call object.
   * These errors result in the participant leaving the meeting. A
   * `left-meeting` event will also be sent, so we still rely on that event
   * for cleanup.
   * @param {Object} e - The error event object.
   */
  handleError(e) {
    document.getElementById('error').textContent = "Error: Check developer console for more details.";
    console.error('ERROR!', e.error ? e.error : e.errorMsg);
  }

  /**
   * Handles participant-left event:
   * - Cleans up the video and audio tracks for the participant
   * - Removes the related UI elements
   * @param {Object} event - The participant-left event object.
   */
  handleParticipantLeft(event) {
    const participantId = event.participant.session_id;

    // Clean up the video and audio tracks for the participant
    this.destroyTracks(['video', 'audio'], participantId);

    // Now, remove the related video UI
    document.getElementById(`video-container-${participantId}`)?.remove();

    // Update the participant count
    this.updateAndDisplayParticipantCount();
  }

  /**
   * Handles participant-joined and participant-updated events:
   * - Updates the participant count
   * - Creates a video container for new participants
   * - Creates an audio element for new participants
   * - Manages video and audio tracks based on their current state
   * - Updates device states for the local participant
   * @param {Object} event - The participant-joined, participant-updated
   * event object.
   */
  handleParticipantJoinedOrUpdated(event) {
    const { participant } = event;
    const participantId = participant.session_id;
    const isLocal = participant.local;
    const tracks = participant.tracks;

    // Always update the participant count regardless of the event action
    this.updateAndDisplayParticipantCount();

    // Create a video container if one doesn't exist
    if (!document.getElementById(`video-container-${participantId}`)) {
      this.createVideoContainer(participantId);
    }

    // Create an audio element for non-local participants if one doesn't exist
    if (!document.getElementById(`audio-${participantId}`) && !isLocal) {
      this.createAudioElement(participantId);
    }

    Object.entries(tracks).forEach(([trackType, trackInfo]) => {
      // If a persistentTrack exists...
      if (trackInfo.persistentTrack) {
        // Check if this is the local participant's audio track.
        // If so, we will skip playing it, as it's already being played.
        // We'll start or update tracks in all other cases.
        if (!(isLocal && trackType === 'audio')) {
          this.startOrUpdateTrack(trackType, trackInfo, participantId);
        }
      } else {
        // If the track is not available, remove the media element
        this.destroyTracks([trackType], participantId);
      }

      // Update the video UI based on the track's state
      if (trackType === 'video') {
        this.updateVideoUi(trackInfo, participantId);
      }

      // Update the camera and microphone states for the local user based on
      // the track's state
      if (isLocal) {
        this.updateUiForDevicesState(trackType, trackInfo);
      }
    });
  }

  /**
   * Updates the UI with the current active speaker's identity.
   * @param {Object} event - The active speaker change event object.
   */
  handleActiveSpeakerChange(event) {
    document.getElementById(
      'active-speaker'
    ).textContent = `Active Speaker: ${event.activeSpeaker.peerId}`;
  }

  /**
   * Handles app message events.
   * @param {Object} event - The app message event object.
   */
  handleAppMessage(event) {
    let currentAppState = 'None';

    if(event.data === 'ApplicationState: 0') {
      currentAppState = 'Listening';
    }
    else if(event.data === 'ApplicationState: 1') {
      currentAppState = 'Thinking';
    }
    else if(event.data === 'ApplicationState: 2') {
      currentAppState = 'Talking';
    }
    else{
      currentAppState = 'None';
    }

    document.getElementById(
      'app-message'
    ).textContent = `App State: ${currentAppState}`;
  }

  /**
   * Tries to join a call with provided room URL and optional join token.
   * @param {string} roomUrl - The URL of the room to join.
   */
  async joinRoom(roomUrl) {
    if (!roomUrl) {
      console.error('Room URL is required to join a room.');
      return;
    }

    this.currentRoomUrl = roomUrl;

    const joinOptions = { url: roomUrl };

    try {
      // Disable the join button to prevent multiple attempts to join
      document.getElementById('start-btn').disabled = true;
      // Join the room
      await this.call.join(joinOptions);
      // Hide the error message if it was previously displayed
      document.getElementById('error').textContent = '';
    } catch (e) {
      console.error('Join failed:', e);
    }
  }

  /**
   * Creates and sets up a new video container for a specific participant. This
   * function dynamically generates a video element along with a container and
   * an overlay displaying the participant's ID. The newly created elements are
   * appended to a designated parent in the DOM, preparing them for video
   * streaming or playback related to the specified participant.
   *
   * @param {string} participantId - The unique identifier for the participant.
   */
  createVideoContainer(participantId) {
    // Create a video container for the participant
    const videoContainer = document.createElement('div');
    videoContainer.id = `video-container-${participantId}`;
    videoContainer.className = 'video-container';
    document.getElementById('videos').appendChild(videoContainer);

    // Add an overlay to display the participant's session ID
    const sessionIdOverlay = document.createElement('div');
    sessionIdOverlay.className = 'session-id-overlay';
    sessionIdOverlay.textContent = participantId;
    videoContainer.appendChild(sessionIdOverlay);

    // Create a video element for the participant
    const videoEl = document.createElement('video');
    videoEl.className = 'video-element';
    videoContainer.appendChild(videoEl);
  }

  /**
   * Creates an audio element for a particular participant. This function is
   * responsible for dynamically generating a standalone audio element that can
   * be used to play audio streams associated with the specified participant.
   * The audio element is appended directly to the document body or a relevant
   * container, thereby preparing it for playback of the participant's audio.
   *
   * @param {string} participantId - A unique identifier corresponding to the participant.
   */
  createAudioElement(participantId) {
    // Create an audio element for the participant
    const audioEl = document.createElement('audio');
    audioEl.id = `audio-${participantId}`;
    document.body.appendChild(audioEl);
  }

  /**
   * Updates the media track (audio or video) source for a specific participant
   * and plays the updated track. It checks if the source track needs to be
   * updated and performs the update if necessary, ensuring playback of the
   * media track.
   *
   * @param {string} trackType - Specifies the type of track to update ('audio'
   * or 'video'), allowing the function to dynamically adapt to the track being
   * processed.
   * @param {Object} track - Contains the media track data, including the
   * `persistentTrack` property which holds the actual MediaStreamTrack to be
   * played or updated.
   * @param {string} participantId - Identifies the participant whose media
   * track is being updated.
   */
  startOrUpdateTrack(trackType, track, participantId) {
    // Construct the selector string or ID based on the trackType.
    const selector =
      trackType === 'video'
        ? `#video-container-${participantId} video.video-element`
        : `audio-${participantId}`;

    // Retrieve the specific media element from the DOM.
    const trackEl =
      trackType === 'video'
        ? document.querySelector(selector)
        : document.getElementById(selector);

    // Error handling if the target media element does not exist.
    if (!trackEl) {
      console.error(
        `${trackType} element does not exist for participant: ${participantId}`
      );
      return;
    }

    // Check for the need to update the media source. This is determined by
    // checking whether the existing srcObject's tracks include the new
    // persistentTrack. If there are no existing tracks or the new track is not
    // among them, an update is necessary.
    const existingTracks = trackEl.srcObject?.getTracks();
    const needsUpdate = !existingTracks?.includes(track.persistentTrack);

    // Perform the media source update if needed by setting the srcObject of
    // the target element to a new MediaStream containing the provided
    // persistentTrack.
    if (needsUpdate) {
      trackEl.srcObject = new MediaStream([track.persistentTrack]);

      // Once the media metadata is loaded, attempts to play the track. Error
      // handling for play failures is included to catch and log issues such as
      // autoplay policies blocking playback.
      trackEl.onloadedmetadata = () => {
        trackEl
          .play()
          .catch((e) =>
            console.error(
              `Error playing ${trackType} for participant ${participantId}:`,
              e
            )
          );
      };
    }
  }

  /**
   * Shows or hides the video element for a participant, including managing
   * the visibility of the video based on the track state.
   * @param {Object} track - The video track object.
   * @param {string} participantId - The ID of the participant.
   */
  updateVideoUi(track, participantId) {
    let videoEl = document
      .getElementById(`video-container-${participantId}`)
      .querySelector('video.video-element');

    switch (track.state) {
      case 'off':
      case 'interrupted':
      case 'blocked':
        videoEl.style.display = 'none'; // Hide video but keep container
        break;
      case 'playable':
      default:
        // Here we handle all other states the same as we handle 'playable'.
        // In your code, you may choose to handle them differently.
        videoEl.style.display = '';
        break;
    }
  }

  /**
   * Cleans up specified media track types (e.g., 'video', 'audio') for a given
   * participant by stopping the tracks and removing their corresponding
   * elements from the DOM. This is essential for properly managing resources
   * when participants leave or change their track states.
   * @param {Array} trackTypes - An array of track types to destroy, e.g.,
   * ['video', 'audio'].
   * @param {string} participantId - The ID of the participant.
   */
  destroyTracks(trackTypes, participantId) {
    trackTypes.forEach((trackType) => {
      const elementId = `${trackType}-${participantId}`;
      const element = document.getElementById(elementId);
      if (element) {
        element.srcObject = null; // Release media resources
        element.parentNode.removeChild(element); // Remove element from the DOM
      }
    });
  }


  /**
   * Updates the UI to reflect the current states of the local participant's
   * camera and microphone.
   * @param {string} trackType - The type of track, either 'video' for cameras
   * or 'audio' for microphones.
   * @param {Object} trackInfo - The track object.
   */
  updateUiForDevicesState(trackType, trackInfo) {
    // For video, set the camera state
    if (trackType === 'video') {
      document.getElementById('camera-state').textContent = `Camera: ${
        this.call.localVideo() ? 'On' : 'Off'
      }`;
    } else if (trackType === 'audio') {
      // For audio, set the mic state
      document.getElementById('mic-state').textContent = `Mic: ${
        this.call.localAudio() ? 'On' : 'Off'
      }`;
    }
  }

  /**
   * Updates the UI with the current number of participants.
   * This method combines getting the participant count and updating the UI.
   */
  updateAndDisplayParticipantCount() {
    const participantCount =
      this.call.participantCounts().present +
      this.call.participantCounts().hidden;
    document.getElementById(
      'participant-count'
    ).textContent = `Participants: ${participantCount}`;
  }

  /**
   * Leaves the call and performs necessary cleanup operations like removing
   * video elements.
   */
  async leave() {
    try {
      await this.call.leave();
      document.querySelectorAll('#videos video, audio').forEach((el) => {
        el.srcObject = null; // Release media resources
        el.remove(); // Remove the element from the DOM
        // Remove the video container if it exists
        const videoContainer = document.getElementById(
          `video-container-${el.id.split('-')[1]}`
        );
        if (videoContainer) {
          videoContainer.remove();
        }
      });
    } catch (e) {
      console.error('Leaving failed', e);
    }
  }


  /**
   * Creating a session with Simli API to start a conversation.
   */
  async createSession() {
    // Define the Simli API URL
    const api_url = "http://35.214.172.224:8080/startSession";
  
    // Get API key from document
    const apiKey = document.getElementById("api-key").value;

    // Get Face ID from document
    const faceId = document.getElementById("face-id").value;

    // Get Intro from document
    const intro = document.getElementById("intro").value;

    // Get prompt from document
    const prompt = document.getElementById("prompt").value;

    // Get Time Limit from document
    const timeLimit = document.getElementById("time-limit").value;

    // Get User Name from document
    const userName = document.getElementById("user-name").value;

    // Get Voice ID from document
    const voiceId = document.getElementById("voice-id").value;

  
    // Define the request body
    const request_body = {
      apiKey: apiKey, //Get your Simli API key from ( https://www.simli.com/sign-up-in )
      faceId: faceId,
      intro: intro,
      prompt: prompt,
      timeLimit: {
        limit: timeLimit,
      },
      userName: userName,
      voiceId: voiceId,
    };
  
    // Make a POST request to the Simli API to start the session
    try {
      const response = await fetch(api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request_body),
      });
  
      // Handle error if request fails
      if (!response.ok) {
        if (response.status === 401) {
          handleError(response);
          console.warn("API Key unauthorized or invalid, get your API key from https://www.simli.com/sign-up-in");
        }
        handleError(response);
        throw new Error("Failed to start session");
      }
  
      // Return the response
      return response.json();
    } catch (error) {
      // Handle error if request fails
      console.error("Error starting session:", error);
      this.handleError(error);
      throw error;
    }
  }
}

/**
 * Main entry point: Setup and event listener bindings after the DOM is fully
 * loaded.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const callManager = new CallManager();

  // Bind the join call action to the join button.
  document
    .getElementById('start-btn')
    .addEventListener('click', async function () {

      // Start the session
      const response = await callManager.createSession();
      
      // Get Daily call url
      const roomUrl = "https://simli-test.daily.co/" + response.meetingUrl.slice(-15);

      await callManager.joinRoom(roomUrl);
    });

  // Bind the leave call action to the leave button.
  document.getElementById('leave-btn').addEventListener('click', function () {
    callManager.leave();
  });
});

