let playlist = [];
        let currentTrackIndex = 0;
        const transcriptionIdMap = {}; // Store transcription IDs with file names
        const audioPlayer = document.getElementById("audioPlayer");
        const playPauseButton = document.getElementById("playPauseButton");
        const trackInfo = document.getElementById("trackInfo");
        const playlistDisplay = document.getElementById("playlistDisplay");
        const fileInput = document.getElementById('fileInput');

        function loadTrack(index) {
            if (playlist.length > 0) {
                const track = playlist[index];
                const url = URL.createObjectURL(track.file);
                audioPlayer.src = url;
                trackInfo.textContent = "Playing: " + track.name;
                audioPlayer.play();
                playPauseButton.textContent = "Pause";
            }
        }

        document.getElementById('filterInput').addEventListener('input', filterPlaylist);

        function filterPlaylist() {
            const filterText = document.getElementById('filterInput').value.toLowerCase();
            const filteredPlaylist = playlist.filter(track => track.name.toLowerCase().includes(filterText));

            // Limit the display to 2 items max
            updatePlaylistDisplay(filteredPlaylist.slice(0, 2));
        }

        // Update the updatePlaylistDisplay function to accept a list of tracks to display
        function updatePlaylistDisplay(displayedTracks = playlist.slice(0, 2)) {
            // Check if playlistDisplay has existing items and update them
            const existingItems = Array.from(playlistDisplay.children);

            // Loop through displayed tracks
            displayedTracks.forEach((track, index) => {
                const trackIndexInPlaylist = playlist.indexOf(track); // Get the index of the track in the full playlist
                let trackItem = existingItems[index]; // Check if an item already exists for this index

                // If it doesn't exist, create a new one
                if (!trackItem) {
                    trackItem = document.createElement("li");
                    playlistDisplay.appendChild(trackItem);
                }

                trackItem.classList.toggle("active-track", trackIndexInPlaylist === currentTrackIndex);


                // Set 'active-track' class based on current track index
                trackItem.classList.toggle("active-track", index === currentTrackIndex);

                // Create or update the track name element
                let trackName = trackItem.querySelector("span");
                if (!trackName) {
                    trackName = document.createElement("span");
                    trackItem.appendChild(trackName);
                }
                trackName.textContent = track.name;

                // When the track name is clicked, load and play that track
                trackName.addEventListener("click", () => {
            currentTrackIndex = trackIndexInPlaylist; // Update to the actual index in the full playlist
            loadTrack(currentTrackIndex);
            updatePlaylistDisplay(); // Reload the playlist to highlight the active track
        });

                // Create or update the download button
                let downloadButton = trackItem.querySelector(".download-button");
                if (!downloadButton) {
                    downloadButton = document.createElement("button");
                    downloadButton.className = "download-button";
                    downloadButton.textContent = "Download";
                    trackItem.appendChild(downloadButton);

                    downloadButton.addEventListener("click", () => {
                        const downloadLink = document.createElement("a");
                        downloadLink.href = URL.createObjectURL(track.file);
                        downloadLink.download = track.name;
                        downloadLink.click();
                    });
                }

                // Ensure the download button has the correct file for the current track
                downloadButton.onclick = () => {
                    const downloadLink = document.createElement("a");
                    downloadLink.href = URL.createObjectURL(track.file);
                    downloadLink.download = track.name;
                    downloadLink.click();
                };
            });

            // Remove any extra existing items that are no longer needed
            for (let i = displayedTracks.length; i < existingItems.length; i++) {
                playlistDisplay.removeChild(existingItems[i]);
            }
        }

        playPauseButton.addEventListener("click", () => {
            if (audioPlayer.paused) {
                audioPlayer.play();
                playPauseButton.textContent = "Pause";
            } else {
                audioPlayer.pause();
                playPauseButton.textContent = "Play";
            }
        });

        document.getElementById("nextButton").addEventListener("click", () => {
            if (playlist.length > 0) {
                currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
                loadTrack(currentTrackIndex);
            }
        });

        document.getElementById("prevButton").addEventListener("click", () => {
            if (playlist.length > 0) {
                currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
                loadTrack(currentTrackIndex);
            }
        });

        document.getElementById("addFilesButton").addEventListener("click", async () => {
            const files = fileInput.files;
            for (const file of files) {
                if (!playlist.some(track => track.name === file.name)) {
                    playlist.push({ name: file.name, file: file });
                }
            }
            updatePlaylistDisplay();
            if (playlist.length > 0 && currentTrackIndex === 0) {
                loadTrack(0);
            }
        });

        // Transcribe the current audio file in the playlist
        document.getElementById("transcriptionButton").addEventListener("click", async () => {
            if (playlist.length > 0) {
                const currentFile = playlist[currentTrackIndex].file;
                const formData = new FormData();
                formData.append('file', currentFile);

                try {
                    const response = await fetch('http://localhost:3000/transcribe', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    transcriptionIdMap[currentFile.name] = data.transcriptionId;
                    pollTranscriptionStatus(data.transcriptionId, currentFile.name);
                } catch (error) {
                    console.error('Error transcribing audio:', error);
                }
            } else {
                alert("No audio file selected for transcription.");
            }
        });

        async function pollTranscriptionStatus(transcriptionId, fileName) {
            const pollInterval = 5000;  // Poll every 5 seconds
            const maxAttempts = 12;
            let attempts = 0;
        
            const intervalId = setInterval(async () => {
                if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    console.log(`Max attempts reached for ${fileName}.`);
                    return;
                }
        
                try {
                    const response = await fetch(`http://localhost:3000/transcription/${transcriptionId}`);
                    const data = await response.json();
        
                    if (data.status === 'completed') {
                        clearInterval(intervalId);
        
                        // Access the transcription text and summary
                        const transcriptionText = data.text.text || "Transcription not available.";
                        const summaryText = data.text.summary || "Summary not available.";
        
                        // Update the divs with text
                        document.getElementById("transcriptionText").textContent = transcriptionText;
                        document.getElementById("summaryText").textContent = summaryText;
        
                        // Make the download buttons visible
                        document.getElementById("downloadTranscriptionPdf").hidden = false;
                        document.getElementById("downloadSummaryPdf").hidden = false;
        
                    } else if (data.status === 'failed') {
                        clearInterval(intervalId);
                        console.error(`Transcription for ${fileName} failed.`);
                        alert(`Transcription for ${fileName} failed.`);
                    }
                } catch (error) {
                    console.error('Error fetching transcription status:', error);
                }
        
                attempts++;
            }, pollInterval);
        }
        


        const volumeControl = document.getElementById("volumeControl");
        const volumeLabel = document.getElementById("volumeLabel");

        volumeControl.addEventListener("input", () => {
            audioPlayer.volume = volumeControl.value;
            volumeLabel.textContent = `Volume: ${Math.round(volumeControl.value * 100)}%`;
        });

        const progressBar = document.getElementById("progressBar");

        audioPlayer.addEventListener("timeupdate", () => {
            const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.value = progressPercent;
        });

        progressBar.addEventListener("input", () => {
            const seekTime = (progressBar.value / 100) * audioPlayer.duration;
            audioPlayer.currentTime = seekTime;
        });

// Function to download transcription as PDF
// Function to download transcription as PDF with text wrapping
document.getElementById("downloadTranscriptionPdf").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const transcriptionText = document.getElementById("transcriptionText").textContent;

    // Define maximum width for each line
    const textLines = doc.splitTextToSize(transcriptionText, 180);  // Adjust width as necessary

    // Add title and text with line breaks
    doc.text("Transcription", 10, 10);
    doc.text(textLines, 10, 20);
    doc.save("transcription.pdf");
});

// Function to download summary as PDF with text wrapping
document.getElementById("downloadSummaryPdf").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const summaryText = document.getElementById("summaryText").textContent;

    // Define maximum width for each line
    const textLines = doc.splitTextToSize(summaryText, 180);  // Adjust width as necessary

    // Add title and text with line breaks
    doc.text("Summary", 10, 10);
    doc.text(textLines, 10, 20);
    doc.save("summary.pdf");
});
