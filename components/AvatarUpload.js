function AvatarUpload({ user, onClose, onAvatarUpdate }) {
  try {
    const [avatarFile, setAvatarFile] = React.useState(null);
    const [uploading, setUploading] = React.useState(false);
    const [preview, setPreview] = React.useState(null);
    const [showCropper, setShowCropper] = React.useState(false);
    const [cropData, setCropData] = React.useState({
      x: 0,
      y: 0,
      scale: 1,
      isDragging: false,
      dragStart: { x: 0, y: 0 }
    });
    const imageRef = React.useRef(null);
    const containerRef = React.useRef(null);

    const handleFileSelect = (e) => {
      const file = e.target.files[0];
      if (file) {
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target.result);
          setShowCropper(true);
          setCropData(prev => ({ ...prev, x: 0, y: 0, scale: 1 }));
        };
        reader.readAsDataURL(file);
      }
    };

    const handleMouseDown = (e) => {
      setCropData(prev => ({
        ...prev,
        isDragging: true,
        dragStart: { x: e.clientX - prev.x, y: e.clientY - prev.y }
      }));
    };

    const handleMouseMove = (e) => {
      if (!cropData.isDragging) return;
      
      const newX = e.clientX - cropData.dragStart.x;
      const newY = e.clientY - cropData.dragStart.y;
      
      setCropData(prev => ({ ...prev, x: newX, y: newY }));
    };

    const handleMouseUp = () => {
      setCropData(prev => ({ ...prev, isDragging: false }));
    };

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setCropData(prev => ({
        ...prev,
        scale: Math.max(0.5, Math.min(3, prev.scale + delta))
      }));
    };

    React.useEffect(() => {
      if (cropData.isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [cropData.isDragging, cropData.dragStart]);

    const cropImage = () => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          const size = 150;
          canvas.width = size;
          canvas.height = size;
          
          // Container and crop area settings
          const containerSize = 200;
          const cropRadius = containerSize / 2;
          
          // Get actual displayed image dimensions
          const imgElement = imageRef.current;
          if (!imgElement) return resolve(null);
          
          const displayedWidth = imgElement.offsetWidth;
          const displayedHeight = imgElement.offsetHeight;
          
          // Calculate scale ratios
          const scaleX = img.width / displayedWidth;
          const scaleY = img.height / displayedHeight;
          
          // Calculate crop area in original image coordinates
          const cropX = Math.max(0, (cropRadius - cropData.x) * scaleX);
          const cropY = Math.max(0, (cropRadius - cropData.y) * scaleY);
          const cropSize = Math.min(
            containerSize * scaleX,
            img.width - cropX,
            img.height - cropY
          );
          
          // Draw the cropped and scaled image
          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropSize,
            cropSize,
            0,
            0,
            size,
            size
          );
          
          canvas.toBlob(resolve, 'image/jpeg', 0.8);
        };
        
        img.src = preview;
      });
    };

    const handleUpload = async () => {
      if (!preview) return;
      
      setUploading(true);
      try {
        const croppedFile = await cropImage();
        const reader = new FileReader();
        reader.onload = async (e) => {
          const avatarUrl = e.target.result;
          
          try {
            await supabase.update('users', { avatar_url: avatarUrl }, { id: user.id });
            onAvatarUpdate(avatarUrl);
            onClose();
            alert('Avatar został zaktualizowany!');
          } catch (error) {
            console.error('Update avatar error:', error);
            alert('Błąd podczas aktualizacji avatara');
          }
        };
        reader.readAsDataURL(croppedFile);
      } catch (error) {
        console.error('Avatar upload error:', error);
        alert('Błąd podczas przetwarzania avatara');
      } finally {
        setUploading(false);
      }
    };

    const handleRemoveAvatar = async () => {
      try {
        await supabase.update('users', { avatar_url: null }, { id: user.id });
        onAvatarUpdate(null);
        onClose();
        alert('Avatar został usunięty!');
      } catch (error) {
        console.error('Remove avatar error:', error);
        alert('Błąd podczas usuwania avatara');
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" 
           style={{ 
             paddingTop: 'max(1rem, env(safe-area-inset-top))',
             paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
           }}
           data-name="avatar-upload" data-file="components/AvatarUpload.js">
        <div className="card w-full max-w-md my-auto"
             style={{ 
               maxHeight: 'calc(100vh - 2rem)',
               overflowY: 'auto'
             }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Zmień avatar</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <div className="icon-x text-xl"></div>
            </button>
          </div>
          
          <div className="space-y-4">
            {!showCropper ? (
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-gray-300 text-sm">Aktualny avatar</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-300 text-sm mb-4">Przesuń i powiększ obraz</p>
                  <div 
                    ref={containerRef}
                    className="relative w-50 h-50 mx-auto bg-gray-800 rounded-full overflow-hidden border-2 border-red-500 cursor-move"
                    style={{ width: '200px', height: '200px' }}
                    onWheel={handleWheel}
                  >
                    <img
                      ref={imageRef}
                      src={preview}
                      alt="Crop preview"
                      className="absolute select-none"
                      style={{
                        transform: `translate(${cropData.x}px, ${cropData.y}px) scale(${cropData.scale})`,
                        transformOrigin: '0 0',
                        maxWidth: 'none',
                        maxHeight: 'none'
                      }}
                      onMouseDown={handleMouseDown}
                      onLoad={(e) => {
                        const img = e.target;
                        const containerSize = 200;
                        const imgAspect = img.naturalWidth / img.naturalHeight;
                        
                        // Always make the smaller dimension fill the container
                        if (imgAspect > 1) {
                          // Landscape - height should fill container
                          img.style.height = containerSize + 'px';
                          img.style.width = 'auto';
                        } else {
                          // Portrait or square - width should fill container
                          img.style.width = containerSize + 'px';
                          img.style.height = 'auto';
                        }
                        
                        // Center the image initially
                        const imgWidth = img.offsetWidth;
                        const imgHeight = img.offsetHeight;
                        setCropData(prev => ({
                          ...prev,
                          x: (containerSize - imgWidth) / 2,
                          y: (containerSize - imgHeight) / 2
                        }));
                      }}
                      draggable={false}
                    />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-gray-400">
                      Użyj kółka myszy aby powiększyć/pomniejszyć
                    </div>
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        type="button"
                        onClick={() => setCropData(prev => ({ ...prev, scale: Math.max(0.5, prev.scale - 0.1) }))}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                      >
                        -
                      </button>
                      <span className="text-sm text-gray-300">
                        {Math.round(cropData.scale * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setCropData(prev => ({ ...prev, scale: Math.min(3, prev.scale + 0.1) }))}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Wybierz nowy avatar
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white text-sm"
              />
              <p className="text-gray-400 text-xs mt-1">Zostanie automatycznie przycięty do 150x150px</p>
            </div>

            <div className="flex gap-3">
              {showCropper ? (
                <>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center">
                        <div className="icon-loader-2 animate-spin mr-2"></div>
                        Zapisywanie...
                      </span>
                    ) : (
                      <>
                        <div className="icon-upload inline mr-2"></div>
                        Zapisz avatar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowCropper(false);
                      setPreview(null);
                      setAvatarFile(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Anuluj kadrowanie
                  </button>
                </>
              ) : (
                user.avatar_url && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="btn-secondary flex-1"
                  >
                    <div className="icon-trash-2 inline mr-2"></div>
                    Usuń avatar
                  </button>
                )
              )}
            </div>

            {!showCropper && (
              <button
                onClick={onClose}
                className="w-full btn-secondary"
              >
                Zamknij
              </button>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('AvatarUpload component error:', error);
    return null;
  }
}