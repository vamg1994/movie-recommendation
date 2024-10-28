"""
Movie Recommendation System
A Flask application that provides movie recommendations based on user ratings and preferences.
"""

# Standard library imports
import os
import re

# Third-party imports
from flask import Flask, render_template, request, jsonify
import pandas as pd
import requests

# Local imports
import key

# Initialize Flask application
app = Flask(__name__, static_folder='static')

# File path configuration
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MOVIES_PATH = os.path.join(CURRENT_DIR, "data", "movies_orig.csv")
RATINGS_PATH = os.path.join(CURRENT_DIR, "data", "ratings_orig.csv")

# Load and preprocess data
df_movies = pd.read_csv(MOVIES_PATH)
df_ratings = pd.read_csv(RATINGS_PATH)

# Calculate average ratings and filter movies
def preprocess_data():
    """Preprocess movie data by filtering based on average ratings."""
    average_ratings = df_ratings.groupby('movieId')['rating'].mean().reset_index()
    movies_filtered = df_movies.merge(
        average_ratings[average_ratings['rating'] > 2.8], 
        on='movieId'
    )
    return movies_filtered, df_ratings.merge(movies_filtered[['movieId']], on='movieId')

# Initialize filtered datasets
movies, ratings = preprocess_data()

def clean_string(string):
    """Remove special characters from string."""
    return re.sub("[^a-zA-Z0-9 ]", "", string)

# Clean movie data
movies['genres'] = movies['genres'].fillna('')
movies['title'] = movies['title'].apply(clean_string)

def find_similar_movies(movie_id):
    """
    Find similar movies based on user ratings.
    
    Args:
        movie_id: ID of the movie to find recommendations for
    
    Returns:
        DataFrame containing recommended movies with scores
    """
    # Find users who rated the target movie highly
    similar_users = ratings[
        (ratings["movieId"] == movie_id) & 
        (ratings["rating"] > 4)
    ]["userId"].unique()
    
    # Get movies rated highly by similar users
    similar_user_recs = ratings[
        (ratings["userId"].isin(similar_users)) & 
        (ratings["rating"] > 4)
    ]["movieId"]
    
    # Calculate recommendation scores
    similar_user_recs = similar_user_recs.value_counts() / len(similar_users)
    similar_user_recs = similar_user_recs[similar_user_recs > .10]
    
    # Get overall user ratings
    all_users = ratings[
        (ratings["movieId"].isin(similar_user_recs.index)) & 
        (ratings["rating"] > 4)
    ]
    all_user_recs = all_users["movieId"].value_counts() / len(all_users["userId"].unique())
    
    # Calculate final scores
    rec_percentages = pd.concat([similar_user_recs, all_user_recs], axis=1)
    rec_percentages.columns = ["similar", "all"]
    rec_percentages["score"] = round(rec_percentages["similar"] / rec_percentages["all"], 4)
    
    # Return top 10 recommendations
    return rec_percentages.sort_values("score", ascending=False).head(10).merge(
        movies, 
        left_index=True, 
        right_on="movieId"
    )[["score", "title", "genres"]]

def get_recommendations(title):
    """Get movie recommendations based on title."""
    try:
        movie_id = movies[movies['title'] == title]['movieId'].iloc[0]
        similar_movies = find_similar_movies(movie_id)
        return similar_movies[['title', 'score']].to_dict('records')
    except IndexError:
        return None

# Flask Routes
@app.route('/', methods=['GET', 'POST'])
def home():
    """Handle home page requests."""
    if request.method == 'POST':
        movie_title = request.form['movie_title']
        recommendations = get_recommendations(movie_title)
        if recommendations is None:
            return render_template('index.html', error="Movie not found, please try again")
        return render_template('index.html', recommendations=recommendations)
    return render_template('index.html')

@app.route('/search', methods=['GET'])
def search():
    """Handle autocomplete search requests."""
    query = request.args.get('query', '')
    results = movies[
        movies['title'].str.contains(query, case=False, na=False)
    ]['title'].tolist()
    return jsonify(results[:10])

if __name__ == '__main__':
    app.run(debug=True)
