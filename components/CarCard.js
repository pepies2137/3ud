function CarCard({ car, selected, onSelect, showVotes = false }) {
  try {
    return (
      <div 
        className={`car-card ${selected ? 'selected' : ''}`}
        onClick={() => onSelect && onSelect(car)}
        data-name="car-card"
        data-file="components/CarCard.js"
      >
        <div className="mb-4">
          {car.image_url ? (
            <img 
              src={car.image_url} 
              alt={`${car.brand} ${car.model}`}
              className="w-full aspect-video object-cover rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : (
            <div className="w-full aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="icon-car text-4xl text-gray-500"></div>
            </div>
          )}
          <div className="w-full aspect-video bg-gray-700 rounded-lg items-center justify-center hidden">
            <div className="icon-car text-4xl text-gray-500"></div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-bold text-white text-lg">
            {car.brand} {car.model}
          </h3>
          
          <div className="flex items-center text-gray-300">
            <div className="icon-hash text-sm mr-1"></div>
            <span className="text-sm">{car.registration_number}</span>
          </div>
          
          {showVotes && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center text-gray-300">
                <div className="icon-users text-sm mr-1"></div>
                <span className="text-sm">{car.votes_count || 0} głosów</span>
              </div>
              
              <div className="flex items-center text-yellow-400">
                <div className="icon-star text-sm mr-1"></div>
                <span className="text-sm font-medium">{car.total_points || 0} pkt</span>
              </div>
            </div>
          )}
          
          {selected && (
            <div className="flex items-center justify-center pt-2">
              <div className="icon-check-circle text-red-500 mr-2"></div>
              <span className="text-red-400 font-medium">Wybrane</span>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('CarCard component error:', error);
    return null;
  }
}