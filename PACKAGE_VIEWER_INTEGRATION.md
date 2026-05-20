/**
 * INTEGRATION EXAMPLE - How to use PackageViewer in CourseLearning
 * 
 * Add this code to your CourseLearning.jsx component
 */

// 1. Import PackageViewer at the top
import PackageViewer from '../components/PackageViewer';

// 2. Create a function to render lesson content based on file type
function renderLessonContent(lesson) {
  // Handle package files
  if (lesson.file_type === 'package') {
    return (
      <div className="lesson-package-section">
        <PackageViewer
          lessonId={lesson.id}
          fileName={lesson.file_name}
          packageUrl={lesson.file_url}
          inline={true}  // Shows as embedded iframe
        />
      </div>
    );
  }

  // Handle video files
  if (lesson.file_type === 'video') {
    return (
      <div className="lesson-video-section">
        <video
          controls
          style={{ width: '100%', maxHeight: '500px' }}
          src={lesson.file_url}
        >
          Your browser does not support HTML5 video.
        </video>
      </div>
    );
  }

  // Handle PDF files
  if (lesson.file_type === 'pdf') {
    return (
      <div className="lesson-pdf-section">
        <iframe
          title="PDF Document"
          src={lesson.file_url}
          style={{
            width: '100%',
            height: '600px',
            border: 'none'
          }}
        />
      </div>
    );
  }

  // Handle other document types
  if (lesson.file_url && lesson.file_type !== 'document') {
    return (
      <div className="lesson-file-section">
        <a href={lesson.file_url} download className="download-button">
          📥 Download {lesson.file_name}
        </a>
      </div>
    );
  }

  // Show text content if no file
  if (lesson.content) {
    return (
      <div className="lesson-content">
        {lesson.content}
      </div>
    );
  }

  return null;
}

// 3. In your JSX render, replace the file display section:

/*
<div className="lesson-viewer">
  {activeLesson && (
    <>
      <h2>{activeLesson.title}</h2>
      {renderLessonContent(activeLesson)}
    </>
  )}
</div>
*/

// ============================================
// ALTERNATIVE: Simple Usage Without Wrapper
// ============================================

// If you want to directly use PackageViewer:
export function SimpleLessonViewer({ lesson }) {
  return (
    <div>
      <h2>{lesson.title}</h2>
      
      {lesson.file_type === 'package' && (
        <PackageViewer
          lessonId={lesson.id}
          fileName={lesson.file_name}
          packageUrl={lesson.file_url}
          inline={true}
        />
      )}

      {lesson.content && (
        <div className="description">
          {lesson.content}
        </div>
      )}
    </div>
  );
}

// ============================================
// USAGE IN DIFFERENT LAYOUTS
// ============================================

// Layout 1: Card View (Default)
<PackageViewer 
  lessonId={lesson.id}
  fileName={lesson.file_name}
/>

// Layout 2: Inline View (Embedded iframe)
<PackageViewer 
  lessonId={lesson.id}
  fileName={lesson.file_name}
  packageUrl={lesson.file_url}
  inline={true}
/>

// Layout 3: Multiple lessons in grid
{lessons.map(lesson => (
  <div key={lesson.id} className="lesson-card">
    {lesson.file_type === 'package' && (
      <PackageViewer 
        lessonId={lesson.id}
        fileName={lesson.file_name}
      />
    )}
  </div>
))}

// ============================================
// STYLING TIPS
// ============================================

/*
Add to your CSS:

.lesson-package-section {
  margin: 20px 0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.lesson-video-section {
  margin: 20px 0;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.lesson-pdf-section {
  margin: 20px 0;
  border-radius: 8px;
  overflow: hidden;
}

.lesson-file-section {
  margin: 20px 0;
}

.download-button {
  display: inline-block;
  padding: 12px 24px;
  background: var(--primary);
  color: white;
  border-radius: 4px;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.download-button:hover {
  opacity: 0.9;
}
*/

// ============================================
// FRONTEND UPLOAD EXAMPLE
// ============================================

async function handleLessonUpload(file, courseId, chapterId) {
  if (!file) return;

  const formData = new FormData();
  formData.append('course_id', courseId);
  formData.append('chapter_id', chapterId);
  formData.append('title', file.name.replace('.zip', ''));
  formData.append('content', 'Interactive web package');
  formData.append('file', file);

  try {
    const response = await api.post('/api/lessons', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    console.log('Lesson created:', response.data);
    
    if (response.data.file_type === 'package') {
      console.log('Package URL:', response.data.package_url);
      // Package is now accessible at response.data.package_url
    }

    return response.data;
  } catch (error) {
    console.error('Upload failed:', error.response?.data);
    throw error;
  }
}

// Usage in upload form
async function onFileSelected(event) {
  const file = event.target.files[0];
  if (file && file.name.endsWith('.zip')) {
    await handleLessonUpload(file, courseId, chapterId);
  }
}
